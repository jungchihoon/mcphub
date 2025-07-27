/**
 * MCP(Model Context Protocol) 서비스
 * 
 * 이 파일은 MCPHub의 핵심 서비스로, MCP 서버들과의 연결 및 통신을 관리합니다.
 * 주요 기능:
 * - 다양한 MCP 서버들(SSE, StreamableHTTP, Stdio, OpenAPI)과의 연결 관리
 * - 도구(Tool) 목록 관리 및 동기화
 * - 도구 호출 및 결과 처리
 * - 서버 상태 모니터링 및 재연결 로직
 * - 벡터 검색을 위한 도구 임베딩 저장
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { ServerInfo, ServerConfig, ToolInfo } from '../types/index.js';
import { loadSettings, saveSettings, expandEnvVars, replaceEnvVars } from '../config/index.js';
import config from '../config/index.js';
import { getGroup } from './sseService.js';
import { getServersInGroup } from './groupService.js';
import { saveToolsAsVectorEmbeddings, searchToolsByVector } from './vectorSearchService.js';
import { OpenAPIClient } from '../clients/openapi.js';
import { MCPHubKeyService } from '../services/mcpHubKeyService.js';

/**
 * 세션별 MCP 서버 인스턴스 저장소
 * 각 클라이언트 세션에 대해 별도의 MCP 서버 인스턴스를 관리합니다.
 */
const servers: { [sessionId: string]: Server } = {};

/**
 * SSE 연결에 대한 Keep-Alive 핑 설정
 * 
 * SSE 연결의 경우 정기적으로 핑을 보내 연결 상태를 유지합니다.
 * HTTP 연결이 타임아웃되지 않도록 하여 안정적인 실시간 통신을 보장합니다.
 * 
 * @param {ServerInfo} serverInfo - 서버 정보 객체
 * @param {ServerConfig} serverConfig - 서버 설정 객체
 */
const setupKeepAlive = (serverInfo: ServerInfo, serverConfig: ServerConfig): void => {
  // SSE 연결에 대해서만 Keep-Alive 설정
  if (!(serverInfo.transport instanceof SSEClientTransport)) {
    return;
  }

  // 기존 인터벌이 있다면 먼저 정리
  if (serverInfo.keepAliveIntervalId) {
    clearInterval(serverInfo.keepAliveIntervalId);
  }

  // 설정된 간격 또는 기본값 60초 사용
  const interval = serverConfig.keepAliveInterval || 60000;

  serverInfo.keepAliveIntervalId = setInterval(async () => {
    try {
      if (serverInfo.client && serverInfo.status === 'connected') {
        await serverInfo.client.ping();
        console.log(`Keep-alive ping successful for server: ${serverInfo.name}`);
      }
    } catch (error) {
      console.warn(`Keep-alive ping failed for server ${serverInfo.name}:`, error);
      // TODO: 필요시 재연결 로직 추가 고려
    }
  }, interval);

  console.log(
    `Keep-alive ping set up for server ${serverInfo.name} with interval ${interval / 1000} seconds`,
  );
};

/**
 * 업스트림 MCP 서버들 초기화
 * 
 * 애플리케이션 시작 시 모든 설정된 MCP 서버들을 초기화하고 연결합니다.
 * 
 * @returns {Promise<void>} 초기화 완료 Promise
 */
export const initUpstreamServers = async (): Promise<void> => {
  await registerAllTools(true);
};

/**
 * 세션별 MCP 서버 인스턴스 가져오기 또는 생성
 * 
 * 각 클라이언트 세션에 대해 별도의 MCP 서버 인스턴스를 관리합니다.
 * 세션 ID가 없는 경우 새로운 서버를 생성하여 반환합니다.
 * 
 * @param {string} [sessionId] - 클라이언트 세션 ID
 * @param {string} [group] - 서버 그룹 이름
 * @returns {Server} MCP 서버 인스턴스
 */
export const getMcpServer = (sessionId?: string, group?: string): Server => {
  if (!sessionId) {
    return createMcpServer(config.mcpHubName, config.mcpHubVersion, group);
  }

  if (!servers[sessionId]) {
    const serverGroup = group || getGroup(sessionId);
    const server = createMcpServer(config.mcpHubName, config.mcpHubVersion, serverGroup);
    servers[sessionId] = server;
  } else {
    console.log(`MCP server already exists for sessionId: ${sessionId}`);
  }
  return servers[sessionId];
};

/**
 * 세션별 MCP 서버 인스턴스 삭제
 * 
 * 클라이언트 세션이 종료되거나 정리가 필요한 경우 서버 인스턴스를 삭제합니다.
 * 
 * @param {string} sessionId - 삭제할 세션 ID
 */
export const deleteMcpServer = (sessionId: string): void => {
  delete servers[sessionId];
};

/**
 * 도구 목록 변경 알림
 * 
 * 서버 설정이 변경되어 도구 목록이 업데이트된 경우,
 * 모든 연결된 클라이언트에게 변경 사항을 알립니다.
 * 
 * @returns {Promise<void>} 알림 완료 Promise
 */
export const notifyToolChanged = async () => {
  await registerAllTools(false);
  Object.values(servers).forEach((server) => {
    server
      .sendToolListChanged()
      .catch((error) => {
        console.warn('Failed to send tool list changed notification:', error.message);
      })
      .then(() => {
        console.log('Tool list changed notification sent successfully');
      });
  });
};

/**
 * 특정 도구의 벡터 임베딩 동기화
 * 
 * 도구 정보를 벡터 데이터베이스에 저장하여 시맨틱 검색을 가능하게 합니다.
 * 
 * @param {string} serverName - 서버 이름
 * @param {string} toolName - 도구 이름
 * @returns {Promise<void>} 동기화 완료 Promise
 */
export const syncToolEmbedding = async (serverName: string, toolName: string) => {
  const serverInfo = getServerByName(serverName);
  if (!serverInfo) {
    console.warn(`Server not found: ${serverName}`);
    return;
  }
  const tool = serverInfo.tools.find((t) => t.name === toolName);
  if (!tool) {
    console.warn(`Tool not found: ${toolName} on server: ${serverName}`);
    return;
  }
  // 벡터 검색을 위한 도구 임베딩 저장
  saveToolsAsVectorEmbeddings(serverName, [tool]);
};

/**
 * 모든 서버 정보 저장소
 * 연결된 모든 MCP 서버들의 상태, 도구 목록, 연결 정보를 저장합니다.
 */
let serverInfos: ServerInfo[] = [];

/**
 * 서버 설정에 따른 전송 계층(Transport) 생성
 * 
 * 서버 타입에 따라 적절한 전송 계층을 생성합니다:
 * - streamable-http: HTTP 기반 스트리밍 통신
 * - SSE: Server-Sent Events 기반 실시간 통신
 * - stdio: 프로세스 기반 표준 입출력 통신
 * 
 * @param {string} name - 서버 이름
 * @param {ServerConfig} conf - 서버 설정
 * @returns {any} 생성된 전송 계층 인스턴스
 * @throws {Error} 전송 계층 생성 실패 시
 */
const createTransportFromConfig = (name: string, conf: ServerConfig): any => {
  let transport;

  if (conf.type === 'streamable-http') {
    // HTTP 스트리밍 전송 계층 생성
    const options: any = {};
    if (conf.headers && Object.keys(conf.headers).length > 0) {
      options.requestInit = {
        headers: conf.headers,
      };
    }
    transport = new StreamableHTTPClientTransport(new URL(conf.url || ''), options);
  } else if (conf.url) {
    // SSE 전송 계층 생성
    const options: any = {};
    if (conf.headers && Object.keys(conf.headers).length > 0) {
      options.eventSourceInit = {
        headers: conf.headers,
      };
      options.requestInit = {
        headers: conf.headers,
      };
    }
    transport = new SSEClientTransport(new URL(conf.url), options);
  } else if (conf.command && conf.args) {
    // 표준 입출력 전송 계층 생성 (프로세스 기반)
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      ...replaceEnvVars(conf.env || {}),
    };
    env['PATH'] = expandEnvVars(process.env.PATH as string) || '';

    const settings = loadSettings();
    // Python 패키지 인덱스 URL 설정 (uvx, uv, python 명령어용)
    if (
      settings.systemConfig?.install?.pythonIndexUrl &&
      (conf.command === 'uvx' || conf.command === 'uv' || conf.command === 'python')
    ) {
      env['UV_DEFAULT_INDEX'] = settings.systemConfig.install.pythonIndexUrl;
    }

    // NPM 레지스트리 설정 (Node.js 패키지 관리자용)
    if (
      settings.systemConfig?.install?.npmRegistry &&
      (conf.command === 'npm' ||
        conf.command === 'npx' ||
        conf.command === 'pnpm' ||
        conf.command === 'yarn' ||
        conf.command === 'node')
    ) {
      env['npm_config_registry'] = settings.systemConfig.install.npmRegistry;
    }

    transport = new StdioClientTransport({
      command: conf.command,
      args: conf.args,
      env: env,
      stderr: 'pipe',
    });
    
    // 자식 프로세스의 stderr 출력을 로그로 기록
    transport.stderr?.on('data', (data) => {
      console.log(`[${name}] [child] ${data}`);
    });
  } else {
    throw new Error(`Unable to create transport for server: ${name}`);
  }

  return transport;
};

/**
 * 재연결 로직을 포함한 도구 호출
 * 
 * 도구 호출 시 연결 오류가 발생하면 자동으로 재연결을 시도합니다.
 * 특히 StreamableHTTP 연결에서 HTTP 40x 오류 발생 시 재연결을 수행합니다.
 * 
 * @param {ServerInfo} serverInfo - 서버 정보
 * @param {any} toolParams - 도구 호출 매개변수
 * @param {any} [options] - 호출 옵션
 * @param {number} [maxRetries=1] - 최대 재시도 횟수
 * @returns {Promise<any>} 도구 호출 결과
 * @throws {Error} 호출 실패 시
 */
const callToolWithReconnect = async (
  serverInfo: ServerInfo,
  toolParams: any,
  options?: any,
  maxRetries: number = 1,
): Promise<any> => {
  if (!serverInfo.client) {
    throw new Error(`Client not found for server: ${serverInfo.name}`);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const result = await serverInfo.client.callTool(toolParams, undefined, options || {});
      return result;
    } catch (error: any) {
      // HTTP 40x 오류 감지
      const isHttp40xError = error?.message?.startsWith?.('Error POSTing to endpoint (HTTP 40');
      // StreamableHTTP 전송 계층에서만 재시도
      const isStreamableHttp = serverInfo.transport instanceof StreamableHTTPClientTransport;

      if (isHttp40xError && attempt < maxRetries && serverInfo.transport && isStreamableHttp) {
        console.warn(
          `HTTP 40x error detected for StreamableHTTP server ${serverInfo.name}, attempting reconnection (attempt ${attempt + 1}/${maxRetries + 1})`,
        );

        try {
          // 기존 연결 정리
          if (serverInfo.keepAliveIntervalId) {
            clearInterval(serverInfo.keepAliveIntervalId);
            serverInfo.keepAliveIntervalId = undefined;
          }

          serverInfo.client.close();
          serverInfo.transport.close();

          // 서버 설정을 가져와서 전송 계층 재생성
          const settings = loadSettings();
          const conf = settings.mcpServers[serverInfo.name];
          if (!conf) {
            throw new Error(`Server configuration not found for: ${serverInfo.name}`);
          }

          // 새로운 전송 계층 생성
          const newTransport = createTransportFromConfig(serverInfo.name, conf);

          // 새로운 클라이언트 생성
          const client = new Client(
            {
              name: `mcp-client-${serverInfo.name}`,
              version: '1.0.0',
            },
            {
              capabilities: {
                prompts: {},
                resources: {},
                tools: {},
              },
            },
          );

          // 새로운 전송 계층으로 재연결
          await client.connect(newTransport, serverInfo.options || {});

          // 서버 정보 업데이트
          serverInfo.client = client;
          serverInfo.transport = newTransport;
          serverInfo.status = 'connected';

          // 재연결 후 도구 목록 다시 로드
          try {
            const tools = await client.listTools({}, serverInfo.options || {});
            serverInfo.tools = tools.tools.map((tool) => ({
              name: `${serverInfo.name}-${tool.name}`,
              description: tool.description || '',
              inputSchema: tool.inputSchema || {},
            }));

            // 벡터 검색을 위한 도구 임베딩 저장
            saveToolsAsVectorEmbeddings(serverInfo.name, serverInfo.tools);
          } catch (listToolsError) {
            console.warn(
              `Failed to reload tools after reconnection for server ${serverInfo.name}:`,
              listToolsError,
            );
            // 연결은 성공했으므로 계속 진행
          }

          console.log(`Successfully reconnected to server: ${serverInfo.name}`);

          // 다음 시도로 계속
          continue;
        } catch (reconnectError) {
          console.error(`Failed to reconnect to server ${serverInfo.name}:`, reconnectError);
          serverInfo.status = 'disconnected';
          serverInfo.error = `Failed to reconnect: ${reconnectError}`;

          // 마지막 시도였다면 원래 오류 던지기
          if (attempt === maxRetries) {
            throw error;
          }
        }
      } else {
        // HTTP 40x 오류가 아니거나 더 이상 재시도하지 않음
        throw error;
      }
    }
  }

  // 여기에 도달하면 안 되지만, 만약을 위한 오류 처리
  throw new Error('Unexpected error in callToolWithReconnect');
};

/**
 * 사용자 API Keys를 서버 설정에 적용
 * 
 * @param {ServerConfig} serverConfig - 서버 설정
 * @param {Record<string, string>} userApiKeys - 사용자 API Keys
 * @returns {ServerConfig} API Keys가 적용된 서버 설정
 */
function applyUserApiKeysToConfig(
  serverConfig: ServerConfig,
  userApiKeys: Record<string, string>
): ServerConfig {
  const updatedConfig = JSON.parse(JSON.stringify(serverConfig));
  
  // URL의 ${USER_*} 템플릿 치환
  if (updatedConfig.url && typeof updatedConfig.url === 'string') {
    let processedUrl = updatedConfig.url;
    Object.keys(userApiKeys).forEach(tokenKey => {
      const templatePattern = `\${USER_${tokenKey}}`;
      if (processedUrl.includes(templatePattern)) {
        const tokenValue = userApiKeys[tokenKey];
        processedUrl = processedUrl.replace(
          new RegExp(templatePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
          tokenValue
        );
      }
    });
    updatedConfig.url = processedUrl;
  }
  
  // 환경변수의 ${USER_*} 템플릿 치환
  if (updatedConfig.env) {
    Object.keys(updatedConfig.env).forEach(envKey => {
      const envValue = updatedConfig.env[envKey];
      if (typeof envValue === 'string' && envValue.includes('${USER_')) {
        let replacedValue = envValue;
        Object.keys(userApiKeys).forEach(tokenKey => {
          const templatePattern = `\${USER_${tokenKey}}`;
          if (replacedValue.includes(templatePattern)) {
            const tokenValue = userApiKeys[tokenKey];
            replacedValue = replacedValue.replace(
              new RegExp(templatePattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), 
              tokenValue
            );
          }
        });
        updatedConfig.env[envKey] = replacedValue;
      }
    });
  }
  
  return updatedConfig;
}

/**
 * 사용자 토큰으로 서버 연결 (필요시)
 * 
 * @param {string} serverName - 서버 이름
 * @param {Record<string, string>} userApiKeys - 사용자 API Keys
 * @returns {Promise<boolean>} 연결 성공 여부
 */
export const ensureServerConnected = async (
  serverName: string,
  userApiKeys: Record<string, string>
): Promise<boolean> => {
  try {
    // 이미 연결되어 있으면 true 반환
    const serverInfo = serverInfos.find(info => info.name === serverName);
    if (serverInfo?.status === 'connected') {
      return true;
    }

    // 서버 설정 가져오기
    const settings = loadSettings();
    const serverConfig = settings.mcpServers[serverName];
    
    if (!serverConfig) {
      console.error(`❌ 서버 설정을 찾을 수 없음: ${serverName}`);
      return false;
    }

    // 사용자 토큰이 필요한 서버인지 확인
    if (serverConfig.url && serverConfig.url.includes('${USER_')) {
      console.log(`🔑 사용자 토큰으로 ${serverName} 서버 연결 시도...`);
      
      // 사용자 API Keys를 적용한 설정 생성
      const configWithKeys = applyUserApiKeysToConfig(serverConfig, userApiKeys);
      
      // Transport 생성
      const transport = createTransportFromConfig(serverName, configWithKeys);
      
      const client = new Client(
        {
          name: `mcp-client-${serverName}`,
          version: '1.0.0',
        },
        {
          capabilities: {
            prompts: {},
            resources: {},
            tools: {},
          },
        },
      );

      // 연결 시도
      await client.connect(transport);
      console.log(`✅ ${serverName} 서버 연결 성공`);

      // 도구 목록 가져오기
      const tools = await client.listTools();
      const toolsList: ToolInfo[] = tools.tools?.map(tool => ({
        name: `${serverName}-${tool.name}`,
        description: tool.description || '',
        inputSchema: tool.inputSchema || {},
      })) || [];

      // 서버 정보 업데이트
      if (serverInfo) {
        serverInfo.client = client;
        serverInfo.status = 'connected';
        serverInfo.tools = toolsList;
        serverInfo.error = null;
      }

      console.log(`🎉 ${serverName} 서버 연결 완료 - ${toolsList.length}개 도구 로드됨`);
      
      // 도구 임베딩 저장
      saveToolsAsVectorEmbeddings(serverName, toolsList);
      
      return true;
    }

    // 일반 서버는 재시작 시도
    return await restartServerWithUserKeys(serverName, userApiKeys);

  } catch (error) {
    console.error(`❌ 서버 연결 실패: ${serverName}`, error);
    
    // 서버 정보 오류 상태로 업데이트
    const serverInfo = serverInfos.find(info => info.name === serverName);
    if (serverInfo) {
      serverInfo.status = 'disconnected';
      serverInfo.error = `연결 실패: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    return false;
  }
};

/**
 * 사용자 API Keys로 서버 재시작
 * 
 * @param {string} serverName - 재시작할 서버 이름
 * @param {Record<string, string>} userApiKeys - 사용자 API Keys
 * @returns {Promise<boolean>} 재시작 성공 여부
 */
export const restartServerWithUserKeys = async (
  serverName: string, 
  userApiKeys: Record<string, string>
): Promise<boolean> => {
  try {
    console.log(`🔄 사용자 API Keys로 서버 재시작: ${serverName}`);
    
    const settings = loadSettings();
    const serverConfig = settings.mcpServers[serverName];
    
    if (!serverConfig) {
      console.error(`❌ 서버 설정을 찾을 수 없음: ${serverName}`);
      return false;
    }
    
    // 기존 서버 정보 찾기
    const existingServerInfo = serverInfos.find(info => info.name === serverName);
    if (!existingServerInfo) {
      console.error(`❌ 실행 중인 서버를 찾을 수 없음: ${serverName}`);
      return false;
    }
    
    // 기존 클라이언트 연결 해제
    if (existingServerInfo.client) {
      try {
        await existingServerInfo.client.close();
        console.log(`✅ 기존 클라이언트 연결 해제: ${serverName}`);
      } catch (error) {
        console.warn(`⚠️ 클라이언트 연결 해제 실패: ${serverName}`, error);
      }
    }
    
    // 사용자 API Keys를 적용한 새 Transport 생성
    const configWithKeys = applyUserApiKeysToConfig(serverConfig, userApiKeys);
    const transport = createTransportFromConfig(serverName, configWithKeys);
    
    const client = new Client(
      {
        name: `mcp-client-${serverName}-with-keys`,
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      },
    );
    
    // 새 클라이언트 연결
    await client.connect(transport);
    console.log(`✅ 새 클라이언트 연결 성공: ${serverName}`);
    
    // 도구 목록 가져오기
    const tools = await client.listTools();
    const toolsList: ToolInfo[] = tools.tools?.map(tool => ({
      name: `${serverName}-${tool.name}`,
      description: tool.description || '',
      inputSchema: tool.inputSchema || {},
    })) || [];
    
    // 서버 정보 업데이트
    existingServerInfo.client = client;
    existingServerInfo.status = 'connected';
    existingServerInfo.tools = toolsList;
    existingServerInfo.error = null;
    
    console.log(`🎉 ${serverName} 서버 재시작 완료 - ${toolsList.length}개 도구 로드됨`);
    
    // 도구 임베딩 저장
    saveToolsAsVectorEmbeddings(serverName, toolsList);
    
    return true;
    
  } catch (error) {
    console.error(`❌ 서버 재시작 실패: ${serverName}`, error);
    
    // 서버 정보 오류 상태로 업데이트
    const serverInfo = serverInfos.find(info => info.name === serverName);
    if (serverInfo) {
      serverInfo.status = 'disconnected';
      serverInfo.error = `재시작 실패: ${error instanceof Error ? error.message : 'Unknown error'}`;
    }
    
    return false;
  }
};

// Initialize MCP server clients
export const initializeClientsFromSettings = async (isInit: boolean): Promise<ServerInfo[]> => {
  const settings = loadSettings();
  const existingServerInfos = serverInfos;
  serverInfos = [];

  for (const [name, conf] of Object.entries(settings.mcpServers)) {
    // Skip disabled servers
    if (conf.enabled === false) {
      console.log(`Skipping disabled server: ${name}`);
      serverInfos.push({
        name,
        status: 'disconnected',
        error: null,
        tools: [],
        createTime: Date.now(),
        enabled: false,
      });
      continue;
    }

    // Skip user-token-based servers (will connect on demand)
    if (conf.url && conf.url.includes('${USER_')) {
      console.log(`Skipping user-token-based server: ${name} (will connect on demand)`);
      serverInfos.push({
        name,
        status: 'disconnected',
        error: null,
        tools: [],
        createTime: Date.now(),
        enabled: true,
      });
      continue;
    }

    // Check if server is already connected
    const existingServer = existingServerInfos.find(
      (s) => s.name === name && s.status === 'connected',
    );
    if (existingServer) {
      serverInfos.push({
        ...existingServer,
        enabled: conf.enabled === undefined ? true : conf.enabled,
      });
      console.log(`Server '${name}' is already connected.`);
      continue;
    }

    let transport;
    let openApiClient;

    if (conf.type === 'openapi') {
      // Handle OpenAPI type servers
      if (!conf.openapi?.url && !conf.openapi?.schema) {
        console.warn(
          `Skipping OpenAPI server '${name}': missing OpenAPI specification URL or schema`,
        );
        serverInfos.push({
          name,
          status: 'disconnected',
          error: 'Missing OpenAPI specification URL or schema',
          tools: [],
          createTime: Date.now(),
        });
        continue;
      }

      // Create server info first and keep reference to it
      const serverInfo: ServerInfo = {
        name,
        status: 'connecting',
        error: null,
        tools: [],
        createTime: Date.now(),
        enabled: conf.enabled === undefined ? true : conf.enabled,
      };
      serverInfos.push(serverInfo);

      try {
        // Create OpenAPI client instance
        openApiClient = new OpenAPIClient(conf);

        console.log(`Initializing OpenAPI server: ${name}...`);

        // Perform async initialization
        await openApiClient.initialize();

        // Convert OpenAPI tools to MCP tool format
        const openApiTools = openApiClient.getTools();
        const mcpTools: ToolInfo[] = openApiTools.map((tool) => ({
          name: `${name}-${tool.name}`,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));

        // Update server info with successful initialization
        serverInfo.status = 'connected';
        serverInfo.tools = mcpTools;
        serverInfo.openApiClient = openApiClient;

        console.log(
          `Successfully initialized OpenAPI server: ${name} with ${mcpTools.length} tools`,
        );

        // Save tools as vector embeddings for search
        saveToolsAsVectorEmbeddings(name, mcpTools);
        continue;
      } catch (error) {
        console.error(`Failed to initialize OpenAPI server ${name}:`, error);

        // Update the already pushed server info with error status
        serverInfo.status = 'disconnected';
        serverInfo.error = `Failed to initialize OpenAPI server: ${error}`;
        continue;
      }
    } else {
      transport = createTransportFromConfig(name, conf);
    }

    const client = new Client(
      {
        name: `mcp-client-${name}`,
        version: '1.0.0',
      },
      {
        capabilities: {
          prompts: {},
          resources: {},
          tools: {},
        },
      },
    );

    const initRequestOptions = isInit
      ? {
          timeout: Number(config.initTimeout) || 60000,
        }
      : undefined;

    // Get request options from server configuration, with fallbacks
    const serverRequestOptions = conf.options || {};
    const requestOptions = {
      timeout: serverRequestOptions.timeout || 60000,
      resetTimeoutOnProgress: serverRequestOptions.resetTimeoutOnProgress || false,
      maxTotalTimeout: serverRequestOptions.maxTotalTimeout,
    };

    // Create server info first and keep reference to it
    const serverInfo: ServerInfo = {
      name,
      status: 'connecting',
      error: null,
      tools: [],
      client,
      transport,
      options: requestOptions,
      createTime: Date.now(),
    };
    serverInfos.push(serverInfo);

    client
      .connect(transport, initRequestOptions || requestOptions)
      .then(() => {
        console.log(`Successfully connected client for server: ${name}`);
        client
          .listTools({}, initRequestOptions || requestOptions)
          .then((tools) => {
            console.log(`Successfully listed ${tools.tools.length} tools for server: ${name}`);

            serverInfo.tools = tools.tools.map((tool) => ({
              name: `${name}-${tool.name}`,
              description: tool.description || '',
              inputSchema: tool.inputSchema || {},
            }));
            serverInfo.status = 'connected';
            serverInfo.error = null;

            // Set up keep-alive ping for SSE connections
            setupKeepAlive(serverInfo, conf);

            // Save tools as vector embeddings for search
            saveToolsAsVectorEmbeddings(name, serverInfo.tools);
          })
          .catch((error) => {
            console.error(
              `Failed to list tools for server ${name} by error: ${error} with stack: ${error.stack}`,
            );
            serverInfo.status = 'disconnected';
            serverInfo.error = `Failed to list tools: ${error.stack} `;
          });
      })
      .catch((error) => {
        console.error(
          `Failed to connect client for server ${name} by error: ${error} with stack: ${error.stack}`,
        );
        serverInfo.status = 'disconnected';
        serverInfo.error = `Failed to connect: ${error.stack} `;
      });
    console.log(`Initialized client for server: ${name}`);
  }

  return serverInfos;
};

// Register all MCP tools
export const registerAllTools = async (isInit: boolean): Promise<void> => {
  await initializeClientsFromSettings(isInit);
};

// Get all server information
export const getServersInfo = (): Omit<ServerInfo, 'client' | 'transport'>[] => {
  const settings = loadSettings();
  const infos = serverInfos.map(({ name, status, tools, createTime, error }) => {
    const serverConfig = settings.mcpServers[name];
    const enabled = serverConfig ? serverConfig.enabled !== false : true;

    // Add enabled status and custom description to each tool
    const toolsWithEnabled = tools.map((tool) => {
      const toolConfig = serverConfig?.tools?.[tool.name];
      return {
        ...tool,
        description: toolConfig?.description || tool.description, // Use custom description if available
        enabled: toolConfig?.enabled !== false, // Default to true if not explicitly disabled
      };
    });

    return {
      name,
      status,
      error,
      tools: toolsWithEnabled,
      createTime,
      enabled,
    };
  });
  infos.sort((a, b) => {
    if (a.enabled === b.enabled) return 0;
    return a.enabled ? -1 : 1;
  });
  return infos;
};

// Get server by name
const getServerByName = (name: string): ServerInfo | undefined => {
  return serverInfos.find((serverInfo) => serverInfo.name === name);
};

// Filter tools by server configuration
const filterToolsByConfig = (serverName: string, tools: ToolInfo[]): ToolInfo[] => {
  const settings = loadSettings();
  const serverConfig = settings.mcpServers[serverName];

  if (!serverConfig || !serverConfig.tools) {
    // If no tool configuration exists, all tools are enabled by default
    return tools;
  }

  return tools.filter((tool) => {
    const toolConfig = serverConfig.tools?.[tool.name];
    // If tool is not in config, it's enabled by default
    return toolConfig?.enabled !== false;
  });
};

// Get server by tool name
const getServerByTool = (toolName: string): ServerInfo | undefined => {
  return serverInfos.find((serverInfo) => serverInfo.tools.some((tool) => tool.name === toolName));
};

// Add new server
export const addServer = async (
  name: string,
  config: ServerConfig,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const settings = loadSettings();
    if (settings.mcpServers[name]) {
      return { success: false, message: 'Server name already exists' };
    }

    settings.mcpServers[name] = config;
    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    return { success: true, message: 'Server added successfully' };
  } catch (error) {
    console.error(`Failed to add server: ${name}`, error);
    return { success: false, message: 'Failed to add server' };
  }
};

// Remove server
export const removeServer = (name: string): { success: boolean; message?: string } => {
  try {
    const settings = loadSettings();
    if (!settings.mcpServers[name]) {
      return { success: false, message: 'Server not found' };
    }

    delete settings.mcpServers[name];

    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    serverInfos = serverInfos.filter((serverInfo) => serverInfo.name !== name);
    return { success: true, message: 'Server removed successfully' };
  } catch (error) {
    console.error(`Failed to remove server: ${name}`, error);
    return { success: false, message: `Failed to remove server: ${error}` };
  }
};

// Update existing server
export const updateMcpServer = async (
  name: string,
  config: ServerConfig,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const settings = loadSettings();
    if (!settings.mcpServers[name]) {
      return { success: false, message: 'Server not found' };
    }

    settings.mcpServers[name] = config;
    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    closeServer(name);

    serverInfos = serverInfos.filter((serverInfo) => serverInfo.name !== name);
    return { success: true, message: 'Server updated successfully' };
  } catch (error) {
    console.error(`Failed to update server: ${name}`, error);
    return { success: false, message: 'Failed to update server' };
  }
};

// Add or update server (supports overriding existing servers for DXT)
export const addOrUpdateServer = async (
  name: string,
  config: ServerConfig,
  allowOverride: boolean = false,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const settings = loadSettings();
    const exists = !!settings.mcpServers[name];

    if (exists && !allowOverride) {
      return { success: false, message: 'Server name already exists' };
    }

    // If overriding and this is a DXT server (stdio type with file paths),
    // we might want to clean up old files in the future
    if (exists && config.type === 'stdio') {
      // Close existing server connections
      closeServer(name);
      // Remove from server infos
      serverInfos = serverInfos.filter((serverInfo) => serverInfo.name !== name);
    }

    settings.mcpServers[name] = config;
    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    const action = exists ? 'updated' : 'added';
    return { success: true, message: `Server ${action} successfully` };
  } catch (error) {
    console.error(`Failed to add/update server: ${name}`, error);
    return { success: false, message: 'Failed to add/update server' };
  }
};

// Close server client and transport
function closeServer(name: string) {
  const serverInfo = serverInfos.find((serverInfo) => serverInfo.name === name);
  if (serverInfo && serverInfo.client && serverInfo.transport) {
    // Clear keep-alive interval if exists
    if (serverInfo.keepAliveIntervalId) {
      clearInterval(serverInfo.keepAliveIntervalId);
      serverInfo.keepAliveIntervalId = undefined;
      console.log(`Cleared keep-alive interval for server: ${serverInfo.name}`);
    }

    serverInfo.client.close();
    serverInfo.transport.close();
    console.log(`Closed client and transport for server: ${serverInfo.name}`);
    // TODO kill process
  }
}

// Toggle server enabled status
export const toggleServerStatus = async (
  name: string,
  enabled: boolean,
): Promise<{ success: boolean; message?: string }> => {
  try {
    const settings = loadSettings();
    if (!settings.mcpServers[name]) {
      return { success: false, message: 'Server not found' };
    }

    // Update the enabled status in settings
    settings.mcpServers[name].enabled = enabled;

    if (!saveSettings(settings)) {
      return { success: false, message: 'Failed to save settings' };
    }

    // If disabling, disconnect the server and remove from active servers
    if (!enabled) {
      closeServer(name);

      // Update the server info to show as disconnected and disabled
      const index = serverInfos.findIndex((s) => s.name === name);
      if (index !== -1) {
        serverInfos[index] = {
          ...serverInfos[index],
          status: 'disconnected',
          enabled: false,
        };
      }
    }

    return { success: true, message: `Server ${enabled ? 'enabled' : 'disabled'} successfully` };
  } catch (error) {
    console.error(`Failed to toggle server status: ${name}`, error);
    return { success: false, message: 'Failed to toggle server status' };
  }
};

export const handleListToolsRequest = async (_: any, extra: any) => {
  const sessionId = extra.sessionId || '';
  const group = getGroup(sessionId);
  console.log(`Handling ListToolsRequest for group: ${group}`);

  // Special handling for $smart group to return special tools
  if (group === '$smart') {
    return {
      tools: [
        {
          name: 'search_tools',
          description: (() => {
            // Get info about available servers
            const availableServers = serverInfos.filter(
              (server) => server.status === 'connected' && server.enabled !== false,
            );
            // Create simple server information with only server names
            const serversList = availableServers
              .map((server) => {
                return `${server.name}`;
              })
              .join(', ');
            return `STEP 1 of 2: Use this tool FIRST to discover and search for relevant tools across all available servers. This tool and call_tool work together as a two-step process: 1) search_tools to find what you need, 2) call_tool to execute it.

For optimal results, use specific queries matching your exact needs. Call this tool multiple times with different queries for different parts of complex tasks. Example queries: "image generation tools", "code review tools", "data analysis", "translation capabilities", etc. Results are sorted by relevance using vector similarity.

After finding relevant tools, you MUST use the call_tool to actually execute them. The search_tools only finds tools - it doesn't execute them.

Available servers: ${serversList}`;
          })(),
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description:
                  'The search query to find relevant tools. Be specific and descriptive about the task you want to accomplish.',
              },
              limit: {
                type: 'integer',
                description:
                  'Maximum number of results to return. Use higher values (20-30) for broad searches and lower values (5-10) for specific searches.',
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'call_tool',
          description:
            "STEP 2 of 2: Use this tool AFTER search_tools to actually execute/invoke any tool you found. This is the execution step - search_tools finds tools, call_tool runs them.\n\nWorkflow: search_tools → examine results → call_tool with the chosen tool name and required arguments.\n\nIMPORTANT: Always check the tool's inputSchema from search_tools results before invoking to ensure you provide the correct arguments. The search results will show you exactly what parameters each tool expects.",
          inputSchema: {
            type: 'object',
            properties: {
              toolName: {
                type: 'string',
                description: 'The exact name of the tool to invoke (from search_tools results)',
              },
              arguments: {
                type: 'object',
                description:
                  'The arguments to pass to the tool based on its inputSchema (optional if tool requires no arguments)',
              },
            },
            required: ['toolName'],
          },
        },
      ],
    };
  }

  const allServerInfos = serverInfos.filter((serverInfo) => {
    if (serverInfo.enabled === false) return false;
    if (!group) return true;
    const serversInGroup = getServersInGroup(group);
    if (!serversInGroup || serversInGroup.length === 0) return serverInfo.name === group;
    return serversInGroup.includes(serverInfo.name);
  });

  const allTools = [];
  
  // Add server-based grouping tools (one per connected server)
  for (const serverInfo of allServerInfos) {
    if (serverInfo.tools && serverInfo.tools.length > 0 && serverInfo.status === 'connected') {
      const enabledTools = filterToolsByConfig(serverInfo.name, serverInfo.tools);
      
      if (enabledTools.length > 0) {
        // Create a server-level tool that represents all tools in this server
        allTools.push({
          name: `server_${serverInfo.name}`,
          description: `Access to ${serverInfo.name} MCP server with ${enabledTools.length} tools: ${enabledTools.map(t => t.name.replace(`${serverInfo.name}-`, '')).join(', ')}`,
          inputSchema: {
            type: 'object',
            properties: {
              tool_name: {
                type: 'string',
                description: `Tool to execute. Available tools: ${enabledTools.map(t => t.name.replace(`${serverInfo.name}-`, '')).join(', ')}`,
                enum: enabledTools.map(t => t.name.replace(`${serverInfo.name}-`, ''))
              },
              arguments: {
                type: 'object',
                description: 'Arguments to pass to the selected tool'
              }
            },
            required: ['tool_name']
          }
        });
      }
    }
  }

  // Also add individual tools for backward compatibility and direct access
  for (const serverInfo of allServerInfos) {
    if (serverInfo.tools && serverInfo.tools.length > 0) {
      // Filter tools based on server configuration and apply custom descriptions
      const enabledTools = filterToolsByConfig(serverInfo.name, serverInfo.tools);

      // Apply custom descriptions from configuration
      const settings = loadSettings();
      const serverConfig = settings.mcpServers[serverInfo.name];
      const toolsWithCustomDescriptions = enabledTools.map((tool) => {
        const toolConfig = serverConfig?.tools?.[tool.name];
        return {
          ...tool,
          description: toolConfig?.description || tool.description, // Use custom description if available
        };
      });

      allTools.push(...toolsWithCustomDescriptions);
    }
  }

  return {
    tools: allTools,
  };
};

export const handleCallToolRequest = async (request: any, extra: any) => {
  console.log(`Handling CallToolRequest for tool: ${JSON.stringify(request.params)}`);
  
  // 사용자 API 키 주입 로직
  let userApiKeys: Record<string, string> = {};
  if (extra && extra.mcpHubKey) {
    try {
      const mcpHubKeyService = new MCPHubKeyService();
      const authResult = await mcpHubKeyService.authenticateKey(extra.mcpHubKey);
      if (authResult) {
        userApiKeys = authResult.serviceTokens || {};
        console.log(`🔑 사용자 API 키 주입: ${authResult.user.githubUsername} - ${Object.keys(userApiKeys).length}개 키`);
      }
    } catch (error) {
      console.warn(`⚠️ MCPHub Key 인증 실패:`, error);
    }
  }
  
  try {
    // Special handling for agent group tools
    if (request.params.name === 'search_tools') {
      const { query, limit = 10 } = request.params.arguments || {};

      if (!query || typeof query !== 'string') {
        throw new Error('Query parameter is required and must be a string');
      }

      const limitNum = Math.min(Math.max(parseInt(String(limit)) || 10, 1), 100);

      // Dynamically adjust threshold based on query characteristics
      let thresholdNum = 0.3; // Default threshold

      // For more general queries, use a lower threshold to get more diverse results
      if (query.length < 10 || query.split(' ').length <= 2) {
        thresholdNum = 0.2;
      }

      // For very specific queries, use a higher threshold for more precise results
      if (query.length > 30 || query.includes('specific') || query.includes('exact')) {
        thresholdNum = 0.4;
      }

      console.log(`Using similarity threshold: ${thresholdNum} for query: "${query}"`);
      const servers = undefined; // No server filtering

      const searchResults = await searchToolsByVector(query, limitNum, thresholdNum, servers);
      console.log(`Search results: ${JSON.stringify(searchResults)}`);
      // Find actual tool information from serverInfos by serverName and toolName
      const tools = searchResults
        .map((result) => {
          // Find the server in serverInfos
          const server = serverInfos.find(
            (serverInfo) =>
              serverInfo.name === result.serverName &&
              serverInfo.status === 'connected' &&
              serverInfo.enabled !== false,
          );
          if (server && server.tools && server.tools.length > 0) {
            // Find the tool in server.tools
            const actualTool = server.tools.find((tool) => tool.name === result.toolName);
            if (actualTool) {
              // Check if the tool is enabled in configuration
              const enabledTools = filterToolsByConfig(server.name, [actualTool]);
              if (enabledTools.length > 0) {
                // Apply custom description from configuration
                const settings = loadSettings();
                const serverConfig = settings.mcpServers[server.name];
                const toolConfig = serverConfig?.tools?.[actualTool.name];

                // Return the actual tool info from serverInfos with custom description
                return {
                  ...actualTool,
                  description: toolConfig?.description || actualTool.description,
                };
              }
            }
          }

          // Fallback to search result if server or tool not found or disabled
          return {
            name: result.toolName,
            description: result.description || '',
            inputSchema: result.inputSchema || {},
          };
        })
        .filter((tool) => {
          // Additional filter to remove tools that are disabled
          if (tool.name) {
            const serverName = searchResults.find((r) => r.toolName === tool.name)?.serverName;
            if (serverName) {
              const enabledTools = filterToolsByConfig(serverName, [tool as ToolInfo]);
              return enabledTools.length > 0;
            }
          }
          return true; // Keep fallback results
        });

      // Add usage guidance to the response
      const response = {
        tools,
        metadata: {
          query: query,
          threshold: thresholdNum,
          totalResults: tools.length,
          guideline:
            tools.length > 0
              ? "Found relevant tools. If these tools don't match exactly what you need, try another search with more specific keywords."
              : 'No tools found. Try broadening your search or using different keywords.',
          nextSteps:
            tools.length > 0
              ? 'To use a tool, call call_tool with the toolName and required arguments.'
              : 'Consider searching for related capabilities or more general terms.',
        },
      };

      // Return in the same format as handleListToolsRequest
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(response),
          },
        ],
      };
    }

    // Special handling for call_tool
    if (request.params.name === 'call_tool') {
      let { toolName } = request.params.arguments || {};
      if (!toolName) {
        throw new Error('toolName parameter is required');
      }

      const { arguments: toolArgs = {} } = request.params.arguments || {};
      let targetServerInfo: ServerInfo | undefined;
      if (extra && extra.server) {
        targetServerInfo = getServerByName(extra.server);
      } else {
        // Find the first server that has this tool
        targetServerInfo = serverInfos.find(
          (serverInfo) =>
            serverInfo.status === 'connected' &&
            serverInfo.enabled !== false &&
            serverInfo.tools.some((tool) => tool.name === toolName),
        );
      }

      if (!targetServerInfo) {
        throw new Error(`No available servers found with tool: ${toolName}`);
      }

      // Check if the tool exists on the server
      const toolExists = targetServerInfo.tools.some((tool) => tool.name === toolName);
      if (!toolExists) {
        throw new Error(`Tool '${toolName}' not found on server '${targetServerInfo.name}'`);
      }

      // Handle OpenAPI servers differently
      if (targetServerInfo.openApiClient) {
        // For OpenAPI servers, use the OpenAPI client
        const openApiClient = targetServerInfo.openApiClient;

        // Use toolArgs if it has properties, otherwise fallback to request.params.arguments
        const finalArgs =
          toolArgs && Object.keys(toolArgs).length > 0 ? toolArgs : request.params.arguments || {};

        console.log(
          `Invoking OpenAPI tool '${toolName}' on server '${targetServerInfo.name}' with arguments: ${JSON.stringify(finalArgs)}`,
        );

        // Remove server prefix from tool name if present
        const cleanToolName = toolName.startsWith(`${targetServerInfo.name}-`)
          ? toolName.replace(`${targetServerInfo.name}-`, '')
          : toolName;

        const result = await openApiClient.callTool(cleanToolName, finalArgs);

        console.log(`OpenAPI tool invocation result: ${JSON.stringify(result)}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }

      // Call the tool on the target server (MCP servers)
      const client = targetServerInfo.client;
      if (!client) {
        throw new Error(`Client not found for server: ${targetServerInfo.name}`);
      }

      // Use toolArgs if it has properties, otherwise fallback to request.params.arguments
      const finalArgs =
        toolArgs && Object.keys(toolArgs).length > 0 ? toolArgs : request.params.arguments || {};

      console.log(
        `Invoking tool '${toolName}' on server '${targetServerInfo.name}' with arguments: ${JSON.stringify(finalArgs)}`,
      );

      toolName = toolName.startsWith(`${targetServerInfo.name}-`)
        ? toolName.replace(`${targetServerInfo.name}-`, '')
        : toolName;
      const result = await callToolWithReconnect(
        targetServerInfo,
        {
          name: toolName,
          arguments: finalArgs,
        },
        targetServerInfo.options || {},
      );

      console.log(`Tool invocation result: ${JSON.stringify(result)}`);
      return result;
    }

    // Handle server-based tool calls (new format: server_<servername>)
    const toolName = request.params.name;
    
    if (toolName.startsWith('server_')) {
      const serverName = toolName.replace('server_', '');
      const serverInfo = getServerByName(serverName);
      
      if (!serverInfo) {
        throw new Error(`Server not found: ${serverName}`);
      }
      
      if (serverInfo.status !== 'connected') {
        throw new Error(`Server ${serverName} is not connected (status: ${serverInfo.status})`);
      }
      
      const { tool_name, arguments: toolArgs = {} } = request.params.arguments || {};
      
      if (!tool_name) {
        throw new Error('tool_name parameter is required for server-based tool calls');
      }
      
      // Find the actual tool in the server
      const fullToolName = `${serverName}-${tool_name}`;
      const toolExists = serverInfo.tools.some((tool) => tool.name === fullToolName);
      
      if (!toolExists) {
        const availableTools = serverInfo.tools.map(t => t.name.replace(`${serverName}-`, '')).join(', ');
        throw new Error(`Tool '${tool_name}' not found on server '${serverName}'. Available tools: ${availableTools}`);
      }
      
      // Handle OpenAPI servers
      if (serverInfo.openApiClient) {
        console.log(
          `Invoking OpenAPI tool '${tool_name}' on server '${serverName}' with arguments: ${JSON.stringify(toolArgs)}`,
        );

        const result = await serverInfo.openApiClient.callTool(tool_name, toolArgs);

        console.log(`OpenAPI tool invocation result: ${JSON.stringify(result)}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result),
            },
          ],
        };
      }
      
      // Handle MCP servers
      const client = serverInfo.client;
      if (!client) {
        throw new Error(`Client not found for server: ${serverName}`);
      }
      
      console.log(
        `Invoking MCP tool '${tool_name}' on server '${serverName}' with arguments: ${JSON.stringify(toolArgs)}`,
      );
      
      const result = await callToolWithReconnect(
        serverInfo,
        {
          name: tool_name,
          arguments: toolArgs,
        },
        serverInfo.options || {},
      );
      
      console.log(`Tool call result: ${JSON.stringify(result)}`);
      return result;
    }

    // Regular tool handling (backward compatibility)
    let serverInfo = getServerByTool(request.params.name);
    if (!serverInfo) {
      // 도구 이름에서 서버 이름 추출 시도
      const toolParts = request.params.name.split('-');
      if (toolParts.length >= 2) {
        const possibleServerName = `${toolParts[0]}-${toolParts[1]}`;
        
        // 서버가 등록되어 있는지 확인
        const registeredServer = serverInfos.find(info => info.name === possibleServerName);
        if (registeredServer) {
          // 서버 연결 시도
          const connected = await ensureServerConnected(possibleServerName, userApiKeys);
          if (connected) {
            // 다시 도구 찾기
            const updatedServerInfo = getServerByTool(request.params.name);
            if (updatedServerInfo) {
              // 서버 정보를 업데이트하고 계속 진행
              serverInfo = updatedServerInfo;
            }
          }
        }
      }
      
      throw new Error(`Server not found for tool: ${request.params.name}`);
    }

    // Handle OpenAPI servers differently
    if (serverInfo.openApiClient) {
      // For OpenAPI servers, use the OpenAPI client
      const openApiClient = serverInfo.openApiClient;

      // Remove server prefix from tool name if present
      const cleanToolName = request.params.name.startsWith(`${serverInfo.name}-`)
        ? request.params.name.replace(`${serverInfo.name}-`, '')
        : request.params.name;

      console.log(
        `Invoking OpenAPI tool '${cleanToolName}' on server '${serverInfo.name}' with arguments: ${JSON.stringify(request.params.arguments)}`,
      );

      const result = await openApiClient.callTool(cleanToolName, request.params.arguments || {});

      console.log(`OpenAPI tool invocation result: ${JSON.stringify(result)}`);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result),
          },
        ],
      };
    }

    // Handle MCP servers
    const client = serverInfo.client;
    if (!client) {
      throw new Error(`Client not found for server: ${serverInfo.name}`);
    }

    request.params.name = request.params.name.startsWith(`${serverInfo.name}-`)
      ? request.params.name.replace(`${serverInfo.name}-`, '')
      : request.params.name;
    const result = await callToolWithReconnect(
      serverInfo,
      request.params,
      serverInfo.options || {},
    );
    console.log(`Tool call result: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    console.error(`Error handling CallToolRequest: ${error}`);
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${error}`,
        },
      ],
      isError: true,
    };
  }
};

// Create McpServer instance
export const createMcpServer = (name: string, version: string, group?: string): Server => {
  // Determine server name based on routing type
  let serverName = name;

  if (group) {
    // Check if it's a group or a single server
    const serversInGroup = getServersInGroup(group);
    if (!serversInGroup || serversInGroup.length === 0) {
      // Single server routing
      serverName = `${name}_${group}`;
    } else {
      // Group routing
      serverName = `${name}_${group}_group`;
    }
  }
  // If no group, use default name (global routing)

  const server = new Server({ name: serverName, version }, { capabilities: { tools: {} } });
  server.setRequestHandler(ListToolsRequestSchema, handleListToolsRequest);
  server.setRequestHandler(CallToolRequestSchema, handleCallToolRequest);
  return server;
};

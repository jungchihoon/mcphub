/**
 * SSE (Server-Sent Events) 및 MCP 연결 관리 서비스
 * 
 * MCP 클라이언트와의 실시간 통신을 위한 SSE 및 StreamableHTTP 연결을 관리합니다.
 * 세션 기반 연결 관리, 그룹별 라우팅, Bearer 인증 등의 기능을 제공합니다.
 * 
 * 주요 기능:
 * - SSE 연결 설정 및 관리
 * - StreamableHTTP 연결 처리
 * - 세션 기반 전송 계층 관리
 * - 그룹별 라우팅 지원
 * - Bearer 토큰 인증
 * - 연결 상태 모니터링
 */

import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import config, { loadSettings } from '../config/index.js';
import { DEBUG_MODE, DebugLogger } from '../utils/debugLogger.js';
import { getMcpServer } from './mcpService.js';
import SessionManager from './sessionManager.js';

/**
 * 전송 계층 정보를 저장하는 인터페이스
 * 
 * 각 세션별로 전송 계층, 그룹, 사용자 토큰 등의 정보를 관리합니다.
 * 연결 상태, 활동 시간, 재연결 시도 등의 모니터링 정보도 포함합니다.
 */
interface TransportInfo {
  transport: StreamableHTTPServerTransport | SSEServerTransport;
  group?: string;
  userServiceTokens?: Record<string, string>; // 세션별 사용자 토큰 저장
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  lastActivityTime: number; // 마지막 활동 시간
  heartbeatInterval?: NodeJS.Timeout; // Keep-alive 타이머
  reconnectAttempts: number; // 재연결 시도 횟수
  createdAt: number; // 세션 생성 시간
}

// 전송 계층 저장소 (Streamable HTTP + SSE 모두 지원)
const transports: {
  streamable: Record<string, TransportInfo>,
  sse: Record<string, TransportInfo>
} = {
  streamable: {},
  sse: {}
};

// 상수 정의 - 개발 작업 특성을 고려한 관대한 설정
const HEARTBEAT_INTERVAL = 60000; // 1분 (업계 표준)
const INACTIVITY_TIMEOUT = 900000; // 15분 (개발 작업 고려)

/**
 * 세션 상태 모니터링 및 정리
 */
const monitorTransports = () => {
  const now = Date.now();

  Object.entries(transports.streamable).forEach(([sessionId, transportInfo]) => {
    const timeSinceLastActivity = now - transportInfo.lastActivityTime;

    // 비활성 세션 정리
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT && transportInfo.connectionStatus !== 'connected') {
      console.log(`🧹 비활성 세션 정리 (Streamable): ${sessionId}`);
      cleanupTransport(sessionId, 'streamable');
    }
  });

  Object.entries(transports.sse).forEach(([sessionId, transportInfo]) => {
    const timeSinceLastActivity = now - transportInfo.lastActivityTime;

    // 비활성 세션 정리
    if (timeSinceLastActivity > INACTIVITY_TIMEOUT && transportInfo.connectionStatus !== 'connected') {
      console.log(`🧹 비활성 세션 정리 (SSE): ${sessionId}`);
      cleanupTransport(sessionId, 'sse');
    }
  });
};

/**
 * Transport 정리 함수
 */
const cleanupTransport = (sessionId: string, type: 'streamable' | 'sse') => {
  const transportInfo = transports[type][sessionId];
  if (transportInfo) {
    // Heartbeat 타이머 정리
    if (transportInfo.heartbeatInterval) {
      clearInterval(transportInfo.heartbeatInterval);
    }

    // Transport 연결 종료
    try {
      if (transportInfo.transport.onclose) {
        transportInfo.transport.onclose();
      }
    } catch (error) {
      console.error(`Transport 정리 중 오류:`, error);
    }

    delete transports[type][sessionId];
    // MCP 서버 연결 해제는 mcpService에서 처리
    console.log(`🔌 세션 정리 완료: ${sessionId} (Type: ${type})`);
  }
};

/**
 * Heartbeat 전송 함수
 */
const sendHeartbeat = (sessionId: string, type: 'streamable' | 'sse') => {
  const transportInfo = transports[type][sessionId];
  if (transportInfo && transportInfo.connectionStatus === 'connected') {
    try {
      // StreamableHTTP transport에 ping 전송
      if (transportInfo.transport instanceof StreamableHTTPServerTransport) {
        // ping/pong 메커니즘은 클라이언트에서 구현되므로 여기서는 상태만 업데이트
        transportInfo.lastActivityTime = Date.now();
      }
    } catch (error) {
      console.error(`Heartbeat 전송 실패 ${sessionId}:`, error);
      transportInfo.connectionStatus = 'error';
    }
  }
};

// 모니터링 타이머 시작 (1분마다 실행)
setInterval(monitorTransports, 60000);

/**
 * 세션의 그룹 정보 조회
 * 
 * 지정된 세션 ID에 연결된 그룹 이름을 반환합니다.
 * 
 * @param {string} sessionId - 조회할 세션 ID
 * @returns {string} 그룹 이름 (그룹이 없으면 빈 문자열)
 */
export const getGroup = (sessionId: string, type: 'streamable' | 'sse'): string => {
  return transports[type][sessionId]?.group || '';
};

/**
 * Bearer 인증 검증
 * 
 * 시스템 설정의 Bearer 인증 키와 요청의 Bearer 토큰을 비교합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {any} routingConfig - 라우팅 설정 객체
 * @returns {boolean} 인증 성공 여부
 */
const validateBearerAuth = (req: Request, routingConfig?: any): boolean => {
  if (!routingConfig || !routingConfig.enableBearerAuth) {
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  return authHeader.substring(7) === routingConfig.bearerAuthKey;
};

/**
 * 초기화 요청 여부 확인
 * 
 * @param {any} body - 요청 본문
 * @returns {boolean} 초기화 요청 여부
 */
const isInitializeRequest = (body: any): boolean => {
  return body && body.method === 'initialize';
};

/**
 * SSE 연결 처리
 * 
 * 새로운 SSE 연결을 설정하고 MCP 서버와 연결합니다.
 * 그룹별 라우팅과 전역 라우팅 설정을 확인하여 연결을 허용/거부합니다.
 * 
 * @param {Request} req - Express 요청 객체 (group 매개변수 포함 가능)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>}
 */
export const handleSseConnection = async (req: Request, res: Response): Promise<void> => {
  // Bearer 인증 확인
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
  };
  const group = req.params.group;

  // 전역 라우트 접근 권한 확인
  if (!group && !routingConfig.enableGlobalRoute) {
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  // SSE 전송 계층 생성 및 등록
  const transport = new SSEServerTransport(`${config.basePath}/messages`, res);
  transports.sse[transport.sessionId] = { transport, group: group, connectionStatus: 'connecting', lastActivityTime: Date.now(), reconnectAttempts: 0, createdAt: Date.now() };

  // 연결 종료 시 정리 작업
  res.on('close', () => {
    cleanupTransport(transport.sessionId, 'sse');
    console.log(`SSE connection closed: ${transport.sessionId}`);
  });

  console.log(
    `New SSE connection established: ${transport.sessionId} with group: ${group || 'global'}`,
  );

  // MCP 서버와 연결
  await getMcpServer(transport.sessionId, group).connect(transport);
};

/**
 * 레거시 SSE 클라이언트를 위한 호환성 엔드포인트
 * Protocol version 2025-06-18 지원
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체  
 * @param {string} group - 서버 그룹 (옵션)
 * @param {Record<string, string>} userServiceTokens - 사용자 서비스 토큰
 */
export const handleLegacySseEndpoint = async (
  req: Request,
  res: Response,
  group?: string,
  userServiceTokens: Record<string, string> = {}
) => {
  console.log('🔗 레거시 SSE 연결 설정 중...');

  // SSE 전송 계층 생성
  const transport = new SSEServerTransport('/messages', res);
  const now = Date.now();

  transports.sse[transport.sessionId] = {
    transport,
    group: group,
    userServiceTokens: userServiceTokens,
    connectionStatus: 'connecting',
    lastActivityTime: now,
    reconnectAttempts: 0,
    createdAt: now
  };

  // Heartbeat 설정
  transports.sse[transport.sessionId].heartbeatInterval = setInterval(() => {
    sendHeartbeat(transport.sessionId, 'sse');
  }, HEARTBEAT_INTERVAL);

  // 연결 종료 시 정리 작업
  res.on('close', () => {
    cleanupTransport(transport.sessionId, 'sse');
    console.log(`🔌 레거시 SSE 연결 종료: ${transport.sessionId}`);
  });

  console.log(`🔗 레거시 SSE 세션 생성됨: ${transport.sessionId} (protocol 2025-06-18)`);

  // MCP 서버와 연결
  await getMcpServer(transport.sessionId, group, userServiceTokens).connect(transport);

  // 연결 성공 시 상태 업데이트
  transports.sse[transport.sessionId].connectionStatus = 'connected';
  console.log(`✅ 레거시 SSE 세션 연결 완료: ${transport.sessionId}`);
};

/**
 * 레거시 메시지 엔드포인트 (POST /messages)
 * SSE 클라이언트의 메시지 처리용
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 */
export const handleLegacyMessages = async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId as string;

  // 세션 ID 유효성 검사
  if (!sessionId) {
    console.error('Missing sessionId in query parameters');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  // 전송 계층 존재 확인
  const transportData = transports.sse[sessionId];
  if (!transportData) {
    console.warn(`No transport found for sessionId: ${sessionId}`);
    res.status(404).send('No transport found for sessionId');
    return;
  }

  const { transport, group } = transportData;
  console.log(`Received message for sessionId: ${sessionId} in group: ${group}`);

  // 세션 활동 시간 업데이트
  transports.sse[sessionId].lastActivityTime = Date.now();

  // SSE 전송 계층을 통해 메시지 처리
  await (transport as SSEServerTransport).handlePostMessage(req, res, req.body);
};

/**
 * SSE 메시지 처리
 * 
 * SSE 연결을 통해 수신된 메시지를 처리합니다.
 * 세션 ID를 기반으로 적절한 전송 계층을 찾아 메시지를 전달합니다.
 * 
 * @param {Request} req - Express 요청 객체 (sessionId 쿼리 매개변수 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>}
 */
export const handleSseMessage = async (req: Request, res: Response): Promise<void> => {
  // Bearer 인증 확인
  if (!validateBearerAuth(req)) {
    res.status(401).send('Bearer authentication required or invalid token');
    return;
  }

  const sessionId = req.query.sessionId as string;

  // 세션 ID 유효성 검사
  if (!sessionId) {
    console.error('Missing sessionId in query parameters');
    res.status(400).send('Missing sessionId parameter');
    return;
  }

  // 전송 계층 존재 확인
  const transportData = transports.sse[sessionId];
  if (!transportData) {
    console.warn(`No transport found for sessionId: ${sessionId}`);
    res.status(404).send('No transport found for sessionId');
    return;
  }

  const { transport, group } = transportData;
  console.log(`Received message for sessionId: ${sessionId} in group: ${group}`);

  // SSE 전송 계층을 통해 메시지 처리
  await (transport as SSEServerTransport).handlePostMessage(req, res);
};

/**
 * MCP 기타 요청 처리
 * 
 * MCP 초기화 이외의 기타 요청들을 처리합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>}
 */
export const handleMcpOtherRequest = async (req: Request, res: Response): Promise<void> => {
  const requestId = (req as any).requestId || 'unknown';

  // 세션 ID 헤더 가져오기 (대소문자 무관)
  let sessionId: string | undefined;
  const headerKeys = Object.keys(req.headers);
  for (const key of headerKeys) {
    if (key.toLowerCase() === 'mcp-session-id') {
      sessionId = req.headers[key] as string;
      break;
    }
  }
  const _group = req.params.group;
  const userKey = req.query.key as string; // 쿼리 파라미터 기간 사용자 키

  if (DEBUG_MODE && requestId) {
    DebugLogger.logMCPConnection(requestId, 'handleMcpOtherRequest', 'http', 'connecting');
    console.log(`@sseService.ts - MCP Other Request:`, {
      method: req.method,
      url: req.url,
      sessionId,
      userKey: userKey ? `${userKey.substring(0, 10)}...` : 'none',
      headers: {
        ...req.headers,
        authorization: req.headers.authorization ?
          req.headers.authorization.startsWith('Bearer ') ?
            `Bearer ${req.headers.authorization.substring(7, 17)}...` :
            req.headers.authorization : 'none'
      },
      query: req.query,
      bodyMethod: req.body?.method || 'none'
    });
  }

  console.log(`Handling MCP other request - Method: ${req.method}, SessionID: ${sessionId}`);
  console.log('🔍 GET /mcp 요청 상세:', {
    method: req.method,
    url: req.url,
    headers: req.headers,
    query: req.query,
    body: req.body
  });

  // MCPHub Key 인증 수행 (쿼리 파라미터 또는 헤더 기반)
  let _userServiceTokens: Record<string, string> = {};
  const authHeader = req.headers.authorization;

  // 쿼리 파라미터 기반 인증 (MCP 표준 준수)
  if (userKey) {
    console.log(`🔐 쿼리 파라미터 인증 시도: ${userKey.substring(0, 10)}...`);
    const authenticatedTokens = await authenticateWithMcpHubKey(userKey, true);
    if (authenticatedTokens) {
      _userServiceTokens = authenticatedTokens;
      console.log(`✅ 쿼리 파라미터 인증 성공`);
    } else {
      console.log(`❌ 쿼리 파라미터 인증 실패`);
      res.status(401).send('Invalid user key in query parameter');
      return;
    }
  }
  // 헤더 기반 인증 (기존 방식 - 하위 호환성)
  else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log(`🔐 헤더 기반 인증 시도: ${token.substring(0, 10)}...`);

    const authenticatedTokens = await authenticateWithMcpHubKey(token, true);
    if (authenticatedTokens) {
      _userServiceTokens = authenticatedTokens;
      console.log(`✅ 헤더 기반 인증 성공`);
    } else {
      // 일반 Bearer 인증 확인
      const settings = loadSettings();
      const routingConfig = settings.systemConfig?.routing || {};
      if (!validateBearerAuth(req, routingConfig)) {
        res.status(401).send('Bearer authentication required or invalid token');
        return;
      }
    }
  } else {
    res.status(401).send('Authentication required: either ?key=... or Authorization header');
    return;
  }

  // GET 요청은 transport의 handleRequest로 위임 (표준 MCP)
  if (req.method === 'GET') {
    console.log('🎯 GET /mcp 요청 - Transport handleRequest로 위임');

    // Cursor IDE의 초기 협상(capabilities/offerings) 요청 처리 (GET로 오는 경우)
    // Accept 헤더가 text/event-stream 만 있어도 허용하고, 쿼리의 method 힌트도 수용
    const acceptHeader = (req.headers.accept || '').toString();
    const queryMethod = (req.query?.method || '').toString();
    const isCapabilitiesQuery = ['capabilities', 'capabilities/list'].includes(queryMethod);
    const isOfferingsQuery = queryMethod === 'offerings/list';
    // GET 쿼리에 명시적으로 method가 있을 때만 직접 응답
    if (acceptHeader.includes('text/event-stream') && (isCapabilitiesQuery || isOfferingsQuery)) {
      console.log('🎯 GET 요청에서 초기 협상 감지 - method:', queryMethod || 'none', 'Accept:', acceptHeader);
      if (isOfferingsQuery) {
        res.json({
          jsonrpc: '2.0',
          result: {
            offerings: { tools: true, prompts: true, resources: false, logging: false }
          },
          id: 1
        });
      } else {
        res.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2025-06-18',
            capabilities: {
              tools: { listChanged: true },
              prompts: { listChanged: true },
              resources: { listChanged: false, subscribe: false },
              logging: {}
            },
            serverInfo: { name: 'MCPHub', version: '2.0.0' }
          },
          id: 1
        });
      }
      return;
    }

    if (!sessionId || !transports.streamable[sessionId]) {
      // 일부 클라이언트는 GET(SSE 채널)부터 열고 initialize를 나중에 호출한다.
      // 이 경우에도 세션을 생성하고 스트림을 열어주자.
      console.log('ℹ️ GET 먼저 수신: 세션 생성 및 스트림 오픈 시도');

      const tempTransport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId: string) => {
          const now = Date.now();
          const transportInfo: TransportInfo = {
            transport: tempTransport,
            group: _group,
            userServiceTokens: _userServiceTokens,
            connectionStatus: 'connecting',
            lastActivityTime: now,
            reconnectAttempts: 0,
            createdAt: now
          };
          transports.streamable[newSessionId] = transportInfo;
          SessionManager.getOrCreateCursorSession(newSessionId, _group, _userServiceTokens);
          console.log(`Session created (GET-first): ${newSessionId}`);
        },
      });

      try {
        const mcpServer = getMcpServer((tempTransport as any).sessionId, _group, _userServiceTokens);
        await mcpServer.connect(tempTransport);
      } catch (e) {
        console.warn('GET-first connect failed:', e);
      }

      await (tempTransport as StreamableHTTPServerTransport).handleRequest(req, res);
      return;
    }

    const transport = transports.streamable[sessionId].transport as StreamableHTTPServerTransport;
    console.log('🔧 Transport 정보:', {
      type: typeof transport,
      hasHandleRequest: typeof transport.handleRequest,
      transportType: transport.constructor.name
    });

    try {
      console.log('📡 Transport handleRequest 호출 중...');

      // Transport의 메시지 핸들러를 오버라이드해보기 (소문자 onmessage가 올바른 프로퍼티)
      const originalOnMessage = (transport as any).onmessage || (transport as any).onMessage;
      if (originalOnMessage) {
        (transport as any).onmessage = (message: any) => {
          console.log('🔍 SSE Stream 내 메시지 감지:', message);
          if (message && message.method === 'offerings/list') {
            console.log('🎯 SSE STREAM: offerings/list 메시지 발견!');
          }
          return originalOnMessage.call(transport, message);
        };
      }

      const result = await transport.handleRequest(req, res);
      console.log('✅ Transport handleRequest 완료:', { result });
    } catch (error) {
      console.error('❌ Transport handleRequest 실패:', error);

      // GET 요청에서 transport 에러가 발생하면 capabilities 응답으로 대체
      console.log('🎯 GET 요청 Transport 에러 - capabilities 응답으로 대체');
      res.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2025-06-18',
          capabilities: {
            tools: { listChanged: true },
            prompts: { listChanged: true },
            resources: { listChanged: false, subscribe: false },
            logging: {}
          },
          serverInfo: { name: 'MCPHub', version: '2.0.0' }
        },
        id: 1
      });
    }
    return;
  }

  if (!sessionId || !transports.streamable[sessionId]) {
    res.status(400).send('Invalid session ID');
    return;
  }

  const transport = transports.streamable[sessionId].transport as StreamableHTTPServerTransport;
  await transport.handleRequest(req, res, req.body);
};

/**
 * MCPHub Key를 사용한 사용자 인증
 * 
 * @param {string} token - Bearer 토큰
 * @param {boolean} suppressLogs - 로그 출력 억제 (세션 재사용 시)
 * @returns {Promise<Record<string, string> | null>} 사용자 서비스 토큰 또는 null
 */
const authenticateWithMcpHubKey = async (token: string, suppressLogs = false): Promise<Record<string, string> | null> => {
  if (!token.startsWith('mcphub_')) {
    return null;
  }

  try {
    const { MCPHubKeyService } = await import('../services/mcpHubKeyService.js');
    const mcpHubKeyService = new MCPHubKeyService();
    const authResult = await mcpHubKeyService.authenticateKey(token);

    if (authResult) {
      if (!suppressLogs) {
        console.log(`MCPHub Key authenticated: ${authResult.user.githubUsername}`);
      }
      // 빈 토큰 필터링
      const validTokens = Object.fromEntries(
        Object.entries(authResult.serviceTokens || {}).filter(([_, value]) => value && value.trim() !== '')
      );

      return validTokens;
    } else {
      if (!suppressLogs) {
        console.log('MCPHub Key authentication failed');
      }
      return null;
    }
  } catch (error) {
    console.error('MCPHub Key authentication error:', error);
    return null;
  }
};

/**
 * MCP POST 요청 처리
 * 
 * MCP 초기화 및 기타 POST 요청들을 처리합니다.
 * StreamableHTTP 전송 계층을 사용하여 실시간 통신을 지원합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>}
 */
export const handleMcpPostRequest = async (req: Request, res: Response): Promise<void> => {
  // 세션 ID 헤더 가져오기 (대소문자 무관)
  let sessionId: string | undefined;
  const headerKeys = Object.keys(req.headers);
  for (const key of headerKeys) {
    if (key.toLowerCase() === 'mcp-session-id') {
      sessionId = req.headers[key] as string;
      break;
    }
  }

  console.log(`🔍 세션 ID 확인: ${sessionId || 'undefined'} (요청 메서드: ${req.body?.method || 'unknown'})`);

  const group = req.params.group;
  const userKey = req.query.key as string; // 쿼리 파라미터 기반 사용자 키
  const body = req.body;

  // 기본 요청 정보 로깅
  if (body && (body as any).method) {
    console.log(`MCP ${(body as any).method} request`);
  }

  // 초기 협상: offerings/list, capabilities, capabilities/list 직접 처리 (배치 포함)
  const isNegotiationMethod = (m?: string) => !!m && (
    m === 'offerings/list' || m === 'capabilities' || m === 'capabilities/list' || m.includes('offerings') || m.includes('capabilities')
  );

  if (Array.isArray(body)) {
    try {
      const methods = body.map((m: any) => m?.method).filter(Boolean);
      console.log(`🧩 Batch 요청 수신: ${methods.length}개 메서드 ->`, methods);
    } catch (error) {
      console.warn('Batch 요청 처리 중 오류 발생:', error);
    }
    const allNegotiation = body.every((msg: any) => isNegotiationMethod(msg?.method));
    if (allNegotiation) {
      const responses = body.map((msg: any) => {
        if (msg.method === 'offerings/list') {
          return { jsonrpc: '2.0', result: { offerings: { tools: true, prompts: true, resources: false, logging: false } }, id: msg.id };
        }
        return {
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2025-06-18',
            capabilities: { tools: { listChanged: true }, prompts: { listChanged: true }, resources: { listChanged: false, subscribe: false }, logging: {} },
            serverInfo: { name: 'MCPHub', version: '2.0.0' }
          },
          id: msg.id
        };
      });
      res.json(responses);
      return;
    }
  } else if (
    body &&
    typeof (body as any).method === 'string' &&
    isNegotiationMethod((body as any).method)
  ) {
    if ((body as any).method === 'offerings/list') {
      console.log('🎯 offerings/list 요청 직접 처리');
      res.json({
        jsonrpc: '2.0',
        result: { offerings: { tools: true, prompts: true, resources: false, logging: false } },
        id: (body as any).id
      });
      return;
    }
    console.log('🎯 capabilities 계열 요청 직접 처리:', (body as any).method);
    res.json({
      jsonrpc: '2.0',
      result: {
        protocolVersion: '2025-06-18',
        capabilities: {
          tools: { listChanged: true },
          prompts: { listChanged: true },
          resources: { listChanged: false, subscribe: false },
          logging: {}
        },
        serverInfo: { name: 'MCPHub', version: '2.0.0' }
      },
      id: (body as any).id
    });
    return;
  }

  // MCPHub Key 인증 수행 (쿼리 파라미터 또는 헤더 기반)
  let userServiceTokens: Record<string, string> = {};

  // 먼저 인증을 처리하여 userServiceTokens를 얻음
  const authHeader = req.headers.authorization;

  // 쿼리 파라미터 기반 인증 (MCP 표준 준수)
  if (userKey) {
    console.log(`🔐 쿼리 파라미터 인증 시도: ${userKey.substring(0, 10)}...`);
    const authenticatedTokens = await authenticateWithMcpHubKey(userKey, true);
    if (authenticatedTokens) {
      userServiceTokens = authenticatedTokens;
      console.log(`✅ 쿼리 파라미터 인증 성공`);
    } else {
      console.log(`❌ 쿼리 파라미터 인증 실패`);
      res.status(401).send('Invalid user key in query parameter');
      return;
    }
  }
  // 헤더 기반 인증 (기존 방식 - 하위 호환성)
  else if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log(`🔐 헤더 기반 인증 시도: ${token.substring(0, 10)}...`);

    const authenticatedTokens = await authenticateWithMcpHubKey(token, true);
    if (authenticatedTokens) {
      userServiceTokens = authenticatedTokens;
      console.log(`✅ 헤더 기반 인증 성공`);
    } else {
      // 일반 Bearer 인증 확인
      const settings = loadSettings();
      const routingConfig = settings.systemConfig?.routing || {};
      if (!validateBearerAuth(req, routingConfig)) {
        res.status(401).send('Bearer authentication required or invalid token');
        return;
      }
    }
  } else {
    res.status(401).send('Authentication required: either ?key=... or Authorization header');
    return;
  }

  // Cursor IDE 호환: tools/list, tools/call, prompts/list는 항상 직접 처리 (세션 ID 무관)
  // transport.handleRequest가 결과를 반환하지 못하는 문제를 우회
  if (body && ['tools/list', 'tools/call', 'prompts/list'].includes(body.method)) {
    console.log(`🔧 DIRECT: ${body.method} 요청 직접 처리 (세션: ${sessionId || 'none'})`);

    try {
      if (body.method === 'tools/list') {
        // handleListToolsRequest를 직접 호출
        const { handleListToolsRequest } = await import('./mcpService.js');
        // 업스트림 연결 보장(세션 유지)
        if (sessionId) {
          await SessionManager.ensureAllUpstreamConnected(sessionId);
        }
        const toolsResult = await handleListToolsRequest(body, {
          sessionId: sessionId || 'direct-session-' + Date.now(),
          mcpHubKey: userKey
        }, group, userServiceTokens);

        const mcpResponse = {
          jsonrpc: '2.0',
          result: toolsResult || { tools: [] },
          id: body.id
        };

        console.log('📤 tools/list 직접 응답 전송');
        res.json(mcpResponse);
        return;
      }

      if (body.method === 'prompts/list') {
        // 일부 클라이언트는 prompts가 없으면 UI에 "No tools or prompts"를 표시함 → 빈 배열이라도 반환
        const mcpResponse = {
          jsonrpc: '2.0',
          result: { prompts: [] },
          id: body.id,
        };
        console.log('📤 prompts/list 직접 응답 전송 (빈 배열)');
        res.json(mcpResponse);
        return;
      }

      if (body.method === 'tools/call') {
        // handleCallToolRequest를 직접 호출
        const { handleCallToolRequest } = await import('./mcpService.js');
        const callResult = await handleCallToolRequest(body, {
          sessionId: sessionId || 'direct-session-' + Date.now(),
          mcpHubKey: userKey
        }, group, userServiceTokens);

        const mcpResponse = {
          jsonrpc: '2.0',
          result: callResult || {},
          id: body.id
        };

        console.log('📤 tools/call 직접 응답 전송');
        res.json(mcpResponse);
        return;
      }
    } catch (error) {
      console.error(`❌ ${body.method} 직접 처리 실패:`, error);
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: `Internal error during ${body.method} processing`,
        },
        id: body.id,
      });
      return;
    }
  }

  // 인증이 이미 완료되었으므로 세션 생성 진행
  const isNewSession = !sessionId || !transports.streamable[sessionId];

  const settings = loadSettings();
  const routingConfig = settings.systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
  };

  // 전역 라우트 접근 권한 확인
  if (!group && !routingConfig.enableGlobalRoute) {
    res.status(403).send('Global routes are disabled. Please specify a group ID.');
    return;
  }

  if (isNewSession && Object.keys(userServiceTokens).length > 0) {
    console.log('🔑 최종 사용자 서비스 토큰 키들:', Object.keys(userServiceTokens));
  }

  let transport: StreamableHTTPServerTransport;

  // 기존 세션 재사용 또는 새 세션 생성
  if (sessionId && transports.streamable[sessionId]) {
    transport = transports.streamable[sessionId].transport as StreamableHTTPServerTransport;

    // 세션 활동 시간 업데이트
    transports.streamable[sessionId].lastActivityTime = Date.now();
    transports.streamable[sessionId].connectionStatus = 'connected';

    // 기존 세션의 사용자 토큰 사용 (새 인증이 있다면 업데이트)
    if (Object.keys(userServiceTokens).length > 0) {
      transports.streamable[sessionId].userServiceTokens = userServiceTokens;
    } else if (transports.streamable[sessionId].userServiceTokens) {
      userServiceTokens = transports.streamable[sessionId].userServiceTokens || {};
    }

  } else if (isInitializeRequest(req.body)) {
    // Initialize 요청은 새 세션을 생성하므로 세션 ID가 없어도 처리
    // 새로운 StreamableHTTP 전송 계층 생성
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId: string) => {
        const now = Date.now();
        const transportInfo: TransportInfo = {
          transport,
          group,
          userServiceTokens: userServiceTokens,
          connectionStatus: 'connecting',
          lastActivityTime: now,
          reconnectAttempts: 0,
          createdAt: now
        };

        // Heartbeat 설정
        transportInfo.heartbeatInterval = setInterval(() => {
          sendHeartbeat(sessionId, 'streamable');
        }, HEARTBEAT_INTERVAL);

        transports.streamable[sessionId] = transportInfo;
        // 세션 매니저에 등록
        SessionManager.getOrCreateCursorSession(sessionId, group, userServiceTokens);
        console.log(`Session created: ${sessionId}`);
      },
    });

    // 연결 종료 시 정리 작업 설정
    transport.onclose = () => {
      if (transport.sessionId) {
        cleanupTransport(transport.sessionId, 'streamable');
      }
    };

    // MCP 서버와 연결 (사용자 토큰 및 MCPHub Key 전달)
    const mcpServer = getMcpServer(transport.sessionId, group, userServiceTokens);

    // MCPHub Key를 서버 인스턴스에 저장 (쿼리 파라미터 또는 헤더)
    let mcpHubKeyToStore: string | undefined;

    // 쿼리 파라미터에서 MCPHub Key 추출
    if (userKey && userKey.startsWith('mcphub_')) {
      mcpHubKeyToStore = userKey;
    }
    // 헤더에서 MCPHub Key 추출 (하위 호환성)
    else if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('mcphub_')) {
        mcpHubKeyToStore = token;
      }
    }

    // MCPHub Key를 서버 인스턴스에 저장
    if (mcpHubKeyToStore) {
      (mcpServer as any).mcpHubKey = mcpHubKeyToStore;
      console.log(`MCPHub Key stored in server instance: ${mcpHubKeyToStore.substring(0, 10)}...`);
    }

    await mcpServer.connect(transport);

    // 연결 성공 시 상태 업데이트
    if (transport.sessionId && transports.streamable[transport.sessionId]) {
      transports.streamable[transport.sessionId].connectionStatus = 'connected';
    }
    // Cursor IDE가 세션 ID를 제공하지 않는 경우는 정상적인 MCP 프로토콜이 아님
    // 이 경우 위의 직접 처리 로직으로 이미 처리되었으므로 여기서는 에러 처리
  } else {
    // 유효하지 않은 요청
    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
    return;
  }

  console.log(`Handling request using transport with type ${transport.constructor.name}`);

  // 세션 활동 시간 업데이트
  if (transport.sessionId && transports.streamable[transport.sessionId]) {
    transports.streamable[transport.sessionId].lastActivityTime = Date.now();
  }

  // offerings/list 또는 capabilities 계열 직접 처리 (보강)
  if (req.body && (req.body.method === 'offerings/list' || req.body.method === 'capabilities' || req.body.method === 'capabilities/list')) {
    if (req.body.method === 'offerings/list') {
      res.json({ jsonrpc: '2.0', result: { offerings: { tools: true, prompts: true, resources: false, logging: false } }, id: req.body.id });
    } else {
      res.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: { listChanged: true }, prompts: { listChanged: true }, resources: { listChanged: false, subscribe: false }, logging: {} },
          serverInfo: { name: 'MCPHub', version: '2.0.0' }
        },
        id: req.body.id
      });
    }
    return;
  }

  // MCP 요청 처리 준비
  if (req.body && ['tools/list', 'tools/call', 'prompts/list'].includes(req.body.method)) {
    console.log(`Handling MCP ${req.body.method} request`);
  }

  // Keep-Alive 응답 헤더 설정
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Keep-Alive', 'timeout=120, max=1000'); // 2분으로 연장

  // Transport 레벨에서 초기 협상 가로채기
  if (req.body && (req.body.method === 'offerings/list' || req.body.method === 'capabilities' || req.body.method === 'capabilities/list')) {
    console.log('🎯 Transport Level: 초기 협상 요청 가로채기 -', req.body.method);
    if (req.body.method === 'offerings/list') {
      res.json({ jsonrpc: '2.0', result: { offerings: { tools: true, prompts: true, resources: false, logging: false } }, id: req.body.id });
    } else {
      res.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: { listChanged: true }, prompts: { listChanged: true }, resources: { listChanged: false, subscribe: false }, logging: {} },
          serverInfo: { name: 'MCPHub', version: '2.0.0' }
        },
        id: req.body.id
      });
    }
    return;
  }

  // transport.handleRequest 전에 최종 인터셉트
  if (req.body && (req.body.method === 'offerings/list' || req.body.method === 'capabilities' || req.body.method === 'capabilities/list')) {
    console.log('🎯 FINAL INTERCEPT: 초기 협상 최종 인터셉트 -', req.body.method);
    if (req.body.method === 'offerings/list') {
      res.json({ jsonrpc: '2.0', result: { offerings: { tools: true, prompts: true, resources: false, logging: false } }, id: req.body.id });
    } else {
      res.json({
        jsonrpc: '2.0',
        result: {
          protocolVersion: '2025-06-18',
          capabilities: { tools: { listChanged: true }, prompts: { listChanged: true }, resources: { listChanged: false, subscribe: false }, logging: {} },
          serverInfo: { name: 'MCPHub', version: '2.0.0' }
        },
        id: req.body.id
      });
    }
    return;
  }

  // 전송 계층을 통해 요청 처리 (모든 메시지 로깅 강화)
  try {
    // Transport의 모든 메시지 핸들링을 가로채서 로깅
    const originalOnMessage = (transport as any).onmessage || (transport as any).onMessage;
    if (originalOnMessage && typeof originalOnMessage === 'function') {
      (transport as any).onmessage = (message: any) => {
        console.log('🔍 STREAMABLE TRANSPORT MESSAGE:', JSON.stringify(message, null, 2));
        if (message && message.method && (message.method.includes('offerings') || message.method.includes('capabilities'))) {
          console.log('🎯 TRANSPORT: 초기 협상 메시지 직접 감지!', message.method);
          // 직접 응답 시도
          if (message.method === 'offerings/list') {
            return { jsonrpc: '2.0', result: { offerings: { tools: true, prompts: true, resources: false, logging: false } }, id: message.id };
          }
          return {
            jsonrpc: '2.0',
            result: {
              protocolVersion: '2025-06-18',
              capabilities: { tools: { listChanged: true }, prompts: { listChanged: true }, resources: { listChanged: false, subscribe: false }, logging: {} },
              serverInfo: { name: 'MCPHub', version: '2.0.0' }
            },
            id: message.id
          };
        }
        return originalOnMessage.call(transport, message);
      };
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error: any) {
    console.log('❌ Transport handleRequest 에러:', error.message);

    // 초기 협상 메서드 에러인 경우 직접 처리
    if (req.body && error?.message && error.message.includes('Method not found')) {
      if (req.body.method === 'offerings/list') {
        console.log('🎯 CATCH ERROR: offerings/list Method not found → 직접 응답');
        res.json({ jsonrpc: '2.0', result: { offerings: { tools: true, prompts: true, resources: false, logging: false } }, id: req.body.id });
        return;
      }
      if (req.body.method === 'capabilities' || req.body.method === 'capabilities/list') {
        console.log('🎯 CATCH ERROR: capabilities 계열 Method not found → 직접 응답');
        res.json({
          jsonrpc: '2.0',
          result: {
            protocolVersion: '2025-06-18',
            capabilities: { tools: { listChanged: true }, prompts: { listChanged: true }, resources: { listChanged: false, subscribe: false }, logging: {} },
            serverInfo: { name: 'MCPHub', version: '2.0.0' }
          },
          id: req.body.id
        });
        return;
      }
    }

    // 다른 에러는 재발생
    throw error;
  }
};

/**
 * 현재 활성 연결 수 조회
 * 
 * 현재 활성화된 전송 계층의 수를 반환합니다.
 * 모니터링 및 디버깅 목적으로 사용됩니다.
 * 
 * @returns {number} 활성 연결 수
 */
export const getConnectionCount = (): number => {
  return Object.keys(transports.streamable).length + Object.keys(transports.sse).length;
};

/**
 * 세션 상태 정보 조회
 * 
 * @returns {Array} 모든 활성 세션의 상태 정보
 */
export const getConnectionStatus = () => {
  const allTransports = { ...transports.streamable, ...transports.sse };
  return Object.entries(allTransports).map(([sessionId, transportInfo]) => ({
    sessionId,
    status: transportInfo.connectionStatus,
    group: transportInfo.group,
    lastActivity: new Date(transportInfo.lastActivityTime).toISOString(),
    uptime: Date.now() - transportInfo.createdAt,
    reconnectAttempts: transportInfo.reconnectAttempts,
    hasUserTokens: transportInfo.userServiceTokens ? Object.keys(transportInfo.userServiceTokens).length > 0 : false
  }));
};

/**
 * 특정 세션의 상세 정보 조회
 * 
 * @param {string} sessionId - 세션 ID
 * @returns {object|null} 세션 정보 또는 null
 */
export const getSessionInfo = (sessionId: string) => {
  const transportInfo = transports.streamable[sessionId] || transports.sse[sessionId];
  if (!transportInfo) return null;

  return {
    sessionId,
    status: transportInfo.connectionStatus,
    group: transportInfo.group,
    lastActivity: new Date(transportInfo.lastActivityTime).toISOString(),
    createdAt: new Date(transportInfo.createdAt).toISOString(),
    uptime: Date.now() - transportInfo.createdAt,
    reconnectAttempts: transportInfo.reconnectAttempts,
    userTokens: transportInfo.userServiceTokens ? Object.keys(transportInfo.userServiceTokens) : []
  };
};

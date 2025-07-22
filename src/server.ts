/**
 * MCPHub 애플리케이션 서버 클래스
 * 
 * Express 서버를 기반으로 하는 MCPHub의 메인 서버 클래스입니다.
 * - Express 앱 설정 및 미들웨어 초기화
 * - MCP 서버들과의 연결 관리
 * - 프론트엔드 정적 파일 서빙
 * - SSE 및 HTTP 엔드포인트 설정
 */

import express from 'express';
import session from 'express-session';
import config from './config/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { initUpstreamServers } from './services/mcpService.js';
import { initMiddlewares } from './middlewares/index.js';
import { initRoutes } from './routes/index.js';
import {
  handleSseConnection,
  handleSseMessage,
  handleMcpPostRequest,
  handleMcpOtherRequest,
} from './services/sseService.js';
import { initializeDefaultUser } from './models/User.js';
import { configurePassport, validateGitHubOAuthConfig } from './config/passport.js';
import passport from 'passport';

// ESM 환경에서 __dirname 구하기
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AppServer {
  private app: express.Application;
  private port: number | string;
  private frontendPath: string | null = null;
  private basePath: string;

  /**
   * AppServer 생성자
   * 
   * Express 애플리케이션을 초기화하고 기본 설정을 구성합니다.
   */
  constructor() {
    this.app = express();
    this.port = config.port;
    this.basePath = config.basePath;
  }

  /**
   * 서버 초기화 메소드
   * 
   * 다음 작업들을 순차적으로 수행합니다:
   * 1. 기본 관리자 사용자 초기화
   * 2. 미들웨어 및 라우터 설정
   * 3. MCP 서버들 연결 초기화
   * 4. SSE 및 MCP 엔드포인트 설정
   * 5. 프론트엔드 정적 파일 서빙 설정
   * 
   * @throws {Error} 초기화 과정에서 오류 발생 시
   */
  async initialize(): Promise<void> {
    try {
      // 사용자가 없는 경우 기본 관리자 사용자 생성
      await initializeDefaultUser();

      // GitHub OAuth 설정 검증
      const oauthConfig = validateGitHubOAuthConfig();
      if (oauthConfig.isValid) {
        console.log('✅ GitHub OAuth 설정이 유효합니다.');
      } else {
        console.warn('⚠️ GitHub OAuth 설정이 불완전합니다. OAuth 기능이 비활성화됩니다.');
      }

      // Express 세션 설정 (Passport.js용)
      this.app.use(session({
        secret: process.env.SESSION_SECRET || 'mcphub-default-secret-change-in-production',
        resave: false,
        saveUninitialized: false,
        name: 'connect.sid', // Express 기본 세션 쿠키 이름
        cookie: {
          secure: false, // HTTP 허용
          httpOnly: false, // 브라우저에서 접근 가능
          sameSite: 'lax', // 기본값으로 되돌림
          maxAge: 24 * 60 * 60 * 1000 // 24시간
        }
      }));

      // Passport.js 초기화
      this.app.use(passport.initialize());
      this.app.use(passport.session());
      
      // Passport.js OAuth 전략 설정
      if (oauthConfig.isValid) {
        configurePassport();
      }

      // Express 미들웨어 초기화 (CORS, 바디 파서 등)
      initMiddlewares(this.app);
      
      // API 라우터 초기화
      initRoutes(this.app);
      console.log('Server initialized successfully');

      // MCP 서버들 초기화 및 연결
      initUpstreamServers()
        .then(() => {
          console.log('MCP server initialized successfully');
          
          // SSE 연결 엔드포인트 설정 (실시간 통신용)
          this.app.get(`${this.basePath}/sse/:group?`, (req, res) => handleSseConnection(req, res));
          
          // SSE 메시지 처리 엔드포인트
          this.app.post(`${this.basePath}/messages`, handleSseMessage);
          
          // MCP 요청 처리 엔드포인트들
          this.app.post(`${this.basePath}/mcp/:group?`, handleMcpPostRequest);
          this.app.get(`${this.basePath}/mcp/:group?`, handleMcpOtherRequest);
          this.app.delete(`${this.basePath}/mcp/:group?`, handleMcpOtherRequest);
        })
        .catch((error) => {
          console.error('Error initializing MCP server:', error);
          throw error;
        })
        .finally(() => {
          // 프론트엔드 정적 파일 서빙 설정
          this.findAndServeFrontend();
        });
    } catch (error) {
      console.error('Error initializing server:', error);
      throw error;
    }
  }

  /**
   * 프론트엔드 정적 파일 서빙 설정
   * 
   * 빌드된 프론트엔드 파일들을 찾아서 Express 정적 파일 서빙을 설정합니다.
   * - 프론트엔드 dist 디렉토리 탐색
   * - SPA 라우팅을 위한 fallback 설정
   * - 베이스 패스 리다이렉션 설정
   * 
   * @private
   */
  private findAndServeFrontend(): void {
    // 프론트엔드 빌드 파일 경로 찾기
    this.frontendPath = this.findFrontendDistPath();

    if (this.frontendPath) {
      console.log(`Serving frontend from: ${this.frontendPath}`);
      
      // 베이스 패스로 정적 파일 서빙
      this.app.use(this.basePath, express.static(this.frontendPath));

      // SPA를 위한 와일드카드 라우트 설정 (모든 경로를 index.html로 리다이렉트)
      if (fs.existsSync(path.join(this.frontendPath, 'index.html'))) {
        this.app.get(`${this.basePath}/*`, (_req, res) => {
          res.sendFile(path.join(this.frontendPath!, 'index.html'));
        });

        // 베이스 패스가 설정된 경우 루트 경로에서 베이스 패스로 리다이렉트
        if (this.basePath) {
          this.app.get('/', (_req, res) => {
            res.redirect(this.basePath);
          });
        }
      }
    } else {
      console.warn('Frontend dist directory not found. Server will run without frontend.');
      const rootPath = this.basePath || '/';
      
      // 프론트엔드가 없는 경우 404 응답
      this.app.get(rootPath, (_req, res) => {
        res
          .status(404)
          .send('Frontend not found. MCPHub API is running, but the UI is not available.');
      });
    }
  }

  /**
   * HTTP 서버 시작
   * 
   * 설정된 포트에서 Express 서버를 시작하고 접속 정보를 출력합니다.
   */
  start(): void {
    this.app.listen(this.port, () => {
      console.log(`Server is running on port ${this.port}`);
      if (this.frontendPath) {
        console.log(`Open http://localhost:${this.port} in your browser to access MCPHub UI`);
      } else {
        console.log(
          `MCPHub API is running on http://localhost:${this.port}, but the UI is not available`,
        );
      }
    });
  }

  /**
   * Express 앱 인스턴스 반환
   * 
   * 테스트나 다른 모듈에서 Express 앱에 접근할 수 있도록 합니다.
   * 
   * @returns {express.Application} Express 애플리케이션 인스턴스
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * 프론트엔드 dist 경로 탐색
   * 
   * 다양한 환경에서 프론트엔드 빌드 파일의 위치를 찾습니다.
   * - 개발 환경: 프로젝트 루트/frontend/dist
   * - 프로덕션 환경: 패키지 설치 위치 기준
   * - npx 실행 환경: npx 캐시 디렉토리 기준
   * 
   * @private
   * @returns {string | null} 프론트엔드 dist 경로 또는 null (찾지 못한 경우)
   */
  private findFrontendDistPath(): string | null {
    // 디버그 플래그 확인
    const debug = process.env.DEBUG === 'true';

    if (debug) {
      console.log('DEBUG: Current directory:', process.cwd());
      console.log('DEBUG: Script directory:', __dirname);
    }

    // 패키지 루트 디렉토리 찾기
    const packageRoot = this.findPackageRoot();

    if (debug) {
      console.log('DEBUG: Using package root:', packageRoot);
    }

    if (!packageRoot) {
      console.warn('Could not determine package root directory');
      return null;
    }

    // 표준 위치에서 프론트엔드 dist 확인
    const frontendDistPath = path.join(packageRoot, 'frontend', 'dist');

    if (debug) {
      console.log(`DEBUG: Checking frontend at: ${frontendDistPath}`);
    }

    if (
      fs.existsSync(frontendDistPath) &&
      fs.existsSync(path.join(frontendDistPath, 'index.html'))
    ) {
      return frontendDistPath;
    }

    console.warn('Frontend distribution not found at', frontendDistPath);
    return null;
  }

  /**
   * 패키지 루트 디렉토리 탐색
   * 
   * package.json 파일이 있는 MCPHub 프로젝트의 루트 디렉토리를 찾습니다.
   * 다양한 실행 환경을 고려하여 여러 위치를 검사합니다.
   * 
   * @private
   * @returns {string | null} 패키지 루트 경로 또는 null (찾지 못한 경우)
   */
  private findPackageRoot(): string | null {
    const debug = process.env.DEBUG === 'true';

    // package.json이 있을 수 있는 위치들
    const possibleRoots = [
      // 표준 npm 패키지 위치
      path.resolve(__dirname, '..', '..'),
      // 현재 작업 디렉토리
      process.cwd(),
      // dist 디렉토리에서 실행하는 경우
      path.resolve(__dirname, '..'),
      // npx로 설치된 경우
      path.resolve(__dirname, '..', '..', '..'),
    ];

    // npx 실행 환경 특별 처리
    if (process.argv[1] && process.argv[1].includes('_npx')) {
      const npxDir = path.dirname(process.argv[1]);
      possibleRoots.unshift(path.resolve(npxDir, '..'));
    }

    if (debug) {
      console.log('DEBUG: Checking for package.json in:', possibleRoots);
    }

    // 각 위치에서 package.json 확인
    for (const root of possibleRoots) {
      const packageJsonPath = path.join(root, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          
          // MCPHub 패키지인지 확인
          if (pkg.name === 'mcphub' || pkg.name === '@samanhappy/mcphub') {
            if (debug) {
              console.log(`DEBUG: Found package.json at ${packageJsonPath}`);
            }
            return root;
          }
        } catch (e) {
          if (debug) {
            console.error(`DEBUG: Failed to parse package.json at ${packageJsonPath}:`, e);
          }
          // 다음 위치로 계속 진행
        }
      }
    }

    return null;
  }
}

export default AppServer;

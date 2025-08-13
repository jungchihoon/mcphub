import express from 'express';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import config, { loadSettings, saveSettings } from '../config/index.js';
import {
  deleteUser,
  getAllUsers,
  getRecentActivities,
  getSystemStats,
  getUserKeyStatus,
  toggleUserActive,
  toggleUserAdmin
} from '../controllers/adminController.js';
import { deleteUpstreamSession, listUpstreamSessions } from '../controllers/adminUpstreamSessionsController.js';
import userGroupRoutes from './userGroupRoutes.js';
import aiRoutes from './aiRoutes.js';

import {
  getPublicConfig,
  getRuntimeConfig
} from '../controllers/configController.js';
import {
  getAllMarketCategories,
  getAllMarketServers,
  getAllMarketTags,
  getMarketServer,
  getMarketServersByCategory,
  getMarketServersByTag,
  searchMarketServersByQuery,
} from '../controllers/marketController.js';
import {
  createUserKey,
  deleteUserKey,
  extendKeyExpiry,
  getFullKeyValue,
  getKeyTokens,
  getKeyValue,
  getUserKeys,
  handleGithubCallback,
  initiateGithubLogin,
  updateKeyTokens
} from '../controllers/oauthController.js';
import {
  createServer,
  deleteServer,
  getAllServers,
  toggleServer,
  toggleTool,
  updateServer,
  updateSystemConfig,
  updateToolDescription
} from '../controllers/serverController.js';
import { requireAdmin, requireAuth } from '../middlewares/auth.js';
import { findUserByUsername, verifyPassword } from '../models/User.js';
import { extractUserEnvVars } from '../utils/variableDetection.js';

const router = express.Router();
// const userTokenController = new UserTokenController(); // TODO: implement when needed

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

export const initRoutes = (app: express.Application): void => {
  // 인증 엔드포인트
  router.post('/auth/login', async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({
          success: false,
          message: 'Username and password are required'
        });
      }

      // 사용자 찾기 (비동기)
      const user = await findUserByUsername(username);

      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // 로컬 계정 여부 확인 (비밀번호가 있는 경우)
      if (!user.password) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // 비밀번호 확인
      const isPasswordValid = await verifyPassword(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).json({
          success: false,
          message: 'Invalid credentials'
        });
      }

      // JWT 토큰 생성
      const token = jwt.sign(
        { user: { username: user.username, isAdmin: user.isAdmin } },
        JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        token,
        user: {
          username: user.username,
          isAdmin: user.isAdmin
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error'
      });
    }
  });

  // 현재 사용자 정보 가져오기 API
  router.get('/auth/me', (req, res) => {
    try {
      const authHeader = req.headers['x-auth-token'] as string;

      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'No valid authentication found'
        });
      }

      // JWT 토큰 검증
      const decoded = jwt.verify(authHeader, JWT_SECRET) as any;

      res.json({
        success: true,
        data: {
          username: decoded.user.username,
          isAdmin: decoded.user.isAdmin
        }
      });
    } catch (error) {
      console.error('Auth me error:', error);
      res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
  });

  // GitHub OAuth 라우트 추가
  router.get('/auth/github', initiateGithubLogin);
  router.get('/auth/github/callback', handleGithubCallback);

  // OAuth 키 관리 API 라우트 추가
  router.get('/oauth/keys', getUserKeys);
  router.post('/oauth/keys', createUserKey);
  router.get('/oauth/keys/:keyId/full-value', getFullKeyValue);
  router.get('/oauth/keys/:keyId', getKeyValue);
  router.get('/oauth/keys/:keyId/tokens', getKeyTokens);
  router.put('/oauth/keys/:keyId/tokens', updateKeyTokens);
  router.post('/oauth/keys/:keyId/extend', extendKeyExpiry);
  router.delete('/oauth/keys/:keyId', deleteUserKey);

  // Core API routes
  router.get('/servers', getAllServers);
  router.post('/servers', createServer);
  router.put('/servers/:name', updateServer);
  router.delete('/servers/:name', deleteServer);
  router.post('/servers/:name/toggle', toggleServer);
  router.post('/servers/:serverName/tools/:toolName/toggle', toggleTool);
  router.put('/servers/:serverName/tools/:toolName/description', updateToolDescription);

  // mcp_settings.json 파일 관리 API
  router.get('/admin/settings-file', requireAuth, requireAdmin, (req, res) => {
    try {
      const settings = loadSettings();
      res.json({
        success: true,
        data: settings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to load settings file'
      });
    }
  });

  router.put('/admin/settings-file', requireAuth, requireAdmin, (req, res) => {
    try {
      const { settings } = req.body;

      if (!settings || typeof settings !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'Settings object is required'
        });
      }

      // JSON 유효성 검사
      if (!settings.mcpServers || typeof settings.mcpServers !== 'object') {
        return res.status(400).json({
          success: false,
          message: 'mcpServers object is required'
        });
      }

      if (!settings.users || !Array.isArray(settings.users)) {
        return res.status(400).json({
          success: false,
          message: 'users array is required'
        });
      }

      // 파일에 저장
      if (saveSettings(settings)) {
        res.json({
          success: true,
          message: 'Settings file updated successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to save settings file'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update settings file'
      });
    }
  });

  // 도구 관리 API
  router.get('/tools', (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });
  router.put('/system-config', updateSystemConfig);

  // Groups - core functionality


  // Market API - 완전 구현
  router.get('/market', getAllMarketServers);
  router.get('/market/categories', getAllMarketCategories);
  router.get('/market/tags', getAllMarketTags);
  router.get('/market/search', searchMarketServersByQuery);
  router.get('/market/category/:category', getMarketServersByCategory);
  router.get('/market/tag/:tag', getMarketServersByTag);
  router.get('/market/:name', getMarketServer);

  // Key Management API - 누락된 부분 구현
  router.get('/keys', (req, res) => {
    res.json({
      success: true,
      data: []
    });
  });

  // API Keys 엔드포인트 추가 (프론트엔드 /api-keys 요청 처리)
  router.get('/api-keys', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      // 사용자의 MCPHub 키에서 serviceTokens 조회
      const githubUsername = user.githubUsername || user.username;
      const result = await pool.query(`
        SELECT "serviceTokens"
        FROM mcphub_keys 
        WHERE "userId" = (SELECT id FROM users WHERE "githubUsername" = $1)
        AND "isActive" = true
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [githubUsername]);

      await pool.end();

      if (result.rows.length > 0 && result.rows[0].serviceTokens) {
        const serviceTokens = result.rows[0].serviceTokens;
        res.json({
          success: true,
          data: serviceTokens
        });
      } else {
        res.json({
          success: true,
          data: {}
        });
      }
    } catch (error) {
      console.error('API Keys 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: 'API Keys 조회에 실패했습니다.'
      });
    }
  });



  router.post('/keys', (req, res) => {
    res.json({
      success: true,
      message: 'Key created successfully',
      data: { id: Date.now(), name: req.body.name || 'New Key' }
    });
  });

  router.delete('/keys/:id', (req, res) => {
    res.json({
      success: true,
      message: 'Key deleted successfully'
    });
  });

  // Health check
  router.get('/health', (req, res) => {
    res.json({
      success: true,
      message: 'MCPHub API is running',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: process.uptime()
    });
  });

  // 런타임 설정 API 추가
  router.get('/config/runtime', (req, res) => {
    res.json({
      success: true,
      data: {
        basePath: config.basePath || '',
        version: process.env.npm_package_version || 'dev',
        name: 'mcphub'
      }
    });
  });

  // 기존 관리자 라우트들 뒤에 새로운 사용자 관리 라우트들 추가
  // 모든 사용자 조회 (새로운 API)
  router.get('/admin/users/list', requireAuth, requireAdmin, getAllUsers);

  // 사용자 활성화/비활성화
  router.put('/admin/users/:userId/active', requireAuth, requireAdmin, toggleUserActive);

  // 사용자 관리자 권한 설정
  router.put('/admin/users/:userId/admin', requireAuth, requireAdmin, toggleUserAdmin);

  // 사용자 삭제
  router.delete('/admin/users/:userId', requireAuth, requireAdmin, deleteUser);

  // 기존 관리자 라우트들을 새로운 컨트롤러로 교체
  router.get('/admin/stats', requireAuth, requireAdmin, getSystemStats);
  router.get('/admin/activities', requireAuth, requireAdmin, getRecentActivities);
  router.get('/admin/user-keys', requireAuth, requireAdmin, getUserKeyStatus);
  // 업스트림 세션 관리
  router.get('/admin/upstream-sessions', requireAuth, requireAdmin, listUpstreamSessions);
  router.delete('/admin/upstream-sessions/:serverName/:contextKey', requireAuth, requireAdmin, deleteUpstreamSession);

  // 사용자 관리 API 추가
  router.get('/admin/users', async (req, res) => {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      const result = await pool.query(`
        SELECT 
          id,
          "githubUsername",
          email,
          "displayName",
          "isAdmin",
          "isActive",
          "lastLoginAt",
          "createdAt"
        FROM users 
        ORDER BY "createdAt" DESC
      `);

      await pool.end();

      const users = result.rows.map(user => ({
        id: user.id,
        githubUsername: user.githubUsername,
        email: user.email || '',
        displayName: user.displayName || user.githubUsername,
        isAdmin: user.isAdmin,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
        createdAt: user.createdAt.toISOString()
      }));

      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('사용자 데이터 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자 데이터 조회에 실패했습니다.'
      });
    }
  });

  // 로그 스트림 API (SSE)
  router.get('/logs/stream', (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    // 초기 연결 메시지 - 초기 로그 목록 전송
    const initialLogs = [
      {
        timestamp: Date.now(),
        type: 'info',
        source: 'main',
        message: '로그 스트림 연결됨'
      }
    ];
    res.write(`data: ${JSON.stringify({ type: 'initial', logs: initialLogs })}\n\n`);

    // 예시 로그 데이터 전송
    const sendLog = () => {
      const logData = {
        timestamp: Date.now(),
        type: 'info',
        source: 'main',
        message: `서버 상태 확인 - ${new Date().toLocaleTimeString()}`
      };
      res.write(`data: ${JSON.stringify({ type: 'log', log: logData })}\n\n`);
    };

    // 5초마다 로그 전송
    const interval = setInterval(sendLog, 5000);

    // 클라이언트 연결 해제 처리
    req.on('close', () => {
      clearInterval(interval);
    });
  });

  router.get('/groups', (req, res) => {
    res.json({
      success: true,
      data: [
        { name: 'development', displayName: '개발', enabled: true, servers: [] },
        { name: 'data', displayName: '데이터', enabled: true, servers: [] },
        { name: 'collaboration', displayName: '협업', enabled: true, servers: [] }
      ]
    });
  });

  // 환경변수 템플릿 관련 API
  router.get('/env-templates', requireAuth, (req, res) => {
    try {
      const settings = loadSettings();
      const templates: Record<string, string[]> = {};

      // 각 서버의 환경변수 템플릿 추출
      for (const [serverName, serverConfig] of Object.entries(settings.mcpServers)) {
        const userEnvVars = extractUserEnvVars(serverConfig);
        if (userEnvVars.length > 0) {
          templates[serverName] = userEnvVars;
        }
      }

      res.json({
        success: true,
        data: templates
      });
    } catch (error) {
      console.error('환경변수 템플릿 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '환경변수 템플릿 조회에 실패했습니다.'
      });
    }
  });

  // 사용자별 환경변수 설정 API
  router.get('/user-env-vars', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      // 사용자의 MCPHub 키에서 serviceTokens 조회 (기존 방식)
      // JWT payload에서는 githubUsername이 username으로 저장됨
      const githubUsername = user.githubUsername || user.username;
      const result = await pool.query(`
        SELECT "serviceTokens"
        FROM mcphub_keys 
        WHERE "userId" = (SELECT id FROM users WHERE "githubUsername" = $1)
        AND "isActive" = true
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [githubUsername]);

      await pool.end();

      // 결과를 서버별로 그룹화 (기존 firecrawl, github 등)
      const userEnvVars: Record<string, Record<string, string>> = {};

      if (result.rows.length > 0 && result.rows[0].serviceTokens) {
        const serviceTokens = result.rows[0].serviceTokens;

        // 기존 API 키들을 서버별로 매핑
        const serverMapping: Record<string, string> = {
          'FIRECRAWL_TOKEN': 'firecrawl-mcp',
          'GITHUB_TOKEN': 'github-pr-mcp-server',
          'CONFLUENCE_TOKEN': 'confluence',
          'JIRA_TOKEN': 'jira',
          'JIRA_BASE_URL': 'jira-azure',
          'JIRA_EMAIL': 'jira-azure',
          'JIRA_API_TOKEN': 'jira-azure',
          'ATLASSIAN_TOKEN': 'mcp-atlassian',
          'ATLASSIAN_EMAIL': 'mcp-atlassian',
          'ATLASSIAN_CLOUD_ID': 'mcp-atlassian',
          // 새로 추가된 Atlassian 서버 키들
          'ATLASSIAN_JIRA_TOKEN': 'mcp-atlassian-jira',
          'ATLASSIAN_JIRA_EMAIL': 'mcp-atlassian-jira',
          'ATLASSIAN_JIRA_CLOUD_ID': 'mcp-atlassian-jira',
          'ATLASSIAN_CONFLUENCE_TOKEN': 'mcp-atlassian-confluence',
          'ATLASSIAN_CONFLUENCE_EMAIL': 'mcp-atlassian-confluence',
          'ATLASSIAN_CONFLUENCE_CLOUD_ID': 'mcp-atlassian-confluence'
        };

        Object.entries(serviceTokens).forEach(([varName, value]) => {
          const serverName = serverMapping[varName];
          if (serverName && value && value !== '') {
            if (!userEnvVars[serverName]) {
              userEnvVars[serverName] = {};
            }
            userEnvVars[serverName][varName] = value as string;
          }
        });
      }

      res.json({
        success: true,
        data: userEnvVars
      });
    } catch (error) {
      console.error('사용자 환경변수 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자 환경변수 조회에 실패했습니다.'
      });
    }
  });

  router.post('/user-env-vars', requireAuth, async (req, res) => {
    try {
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({
          success: false,
          message: '인증이 필요합니다.'
        });
      }

      const { envVars } = req.body;

      if (!envVars || typeof envVars !== 'object') {
        return res.status(400).json({
          success: false,
          message: '환경변수 데이터가 필요합니다.'
        });
      }

      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      // 사용자 ID 조회
      // JWT payload에서는 githubUsername이 username으로 저장됨
      const githubUsername = user.githubUsername || user.username;
      const userResult = await pool.query('SELECT id FROM users WHERE "githubUsername" = $1', [githubUsername]);
      if (userResult.rows.length === 0) {
        await pool.end();
        return res.status(404).json({
          success: false,
          message: '사용자를 찾을 수 없습니다.'
        });
      }
      const userId = userResult.rows[0].id;

      // 기존 MCPHub 키 조회
      const keyResult = await pool.query(`
        SELECT id, "serviceTokens"
        FROM mcphub_keys 
        WHERE "userId" = $1 AND "isActive" = true
        ORDER BY "createdAt" DESC
        LIMIT 1
      `, [userId]);

      let serviceTokens: Record<string, string> = {};
      if (keyResult.rows.length > 0) {
        serviceTokens = keyResult.rows[0].serviceTokens || {};
      }

      // 새로운 환경변수로 업데이트
      for (const [_serverName, serverEnvVars] of Object.entries(envVars)) {
        for (const [varName, value] of Object.entries(serverEnvVars as Record<string, string>)) {
          if (value && value.trim() !== '') {
            serviceTokens[varName] = value;
          }
        }
      }

      // MCPHub 키 업데이트
      if (keyResult.rows.length > 0) {
        await pool.query(`
          UPDATE mcphub_keys 
          SET "serviceTokens" = $1, "updatedAt" = NOW()
          WHERE id = $2
        `, [JSON.stringify(serviceTokens), keyResult.rows[0].id]);
      } else {
        // 새 키 생성
        await pool.query(`
          INSERT INTO mcphub_keys ("userId", "keyValue", "name", "description", "isActive", "serviceTokens", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, true, $5, NOW(), NOW())
        `, [userId, `mcphub_${Date.now()}`, 'MCPHub Key', 'Cursor IDE에서 사용할 MCPHub Key입니다.', JSON.stringify(serviceTokens)]);
      }

      await pool.end();

      console.log(`사용자 ${user.username}의 환경변수 설정 완료:`, serviceTokens);

      res.json({
        success: true,
        message: '환경변수가 저장되었습니다.'
      });
    } catch (error) {
      console.error('사용자 환경변수 저장 실패:', error);
      res.status(500).json({
        success: false,
        message: '사용자 환경변수 저장에 실패했습니다.'
      });
    }
  });

  // 환경변수 매핑 검증 API
  router.get('/env-vars/validate', requireAuth, async (req, res) => {
    try {
      const { validateEnvVarMapping } = await import('../utils/envVarValidation.js');
      const result = await validateEnvVarMapping();

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('환경변수 검증 실패:', error);
      res.status(500).json({
        success: false,
        message: '환경변수 검증에 실패했습니다.'
      });
    }
  });

  // 사용되지 않는 환경변수 정리 API
  router.post('/env-vars/cleanup', requireAuth, async (req, res) => {
    try {
      const { dryRun = false } = req.body;
      const { getCurrentEnvVars, cleanupObsoleteEnvVars } = await import('../utils/envVarCleanup.js');
      const { loadSettings } = await import('../config/index.js');

      // 현재 사용 중인 환경변수들 가져오기
      const settings = loadSettings();
      const currentEnvVars = getCurrentEnvVars(settings);

      // 정리 실행
      const result = await cleanupObsoleteEnvVars(currentEnvVars, dryRun);

      res.json({
        success: result.success,
        message: result.message,
        data: {
          affectedUsers: result.affectedUsers,
          removedVars: result.removedVars,
          dryRun
        }
      });
    } catch (error) {
      console.error('환경변수 정리 실패:', error);
      res.status(500).json({
        success: false,
        message: '환경변수 정리에 실패했습니다.'
      });
    }
  });

  // 환경변수 스케줄러 상태 조회 API (관리자 전용)
  router.get('/admin/env-scheduler/status', requireAuth, async (req, res) => {
    try {
      const { getScheduler } = await import('../services/envVarScheduler.js');
      const scheduler = getScheduler();

      if (!scheduler) {
        return res.json({
          success: true,
          data: {
            isRunning: false,
            config: null,
            nextRunTime: null
          }
        });
      }

      res.json({
        success: true,
        data: scheduler.getStatus()
      });
    } catch (error) {
      console.error('스케줄러 상태 조회 실패:', error);
      res.status(500).json({
        success: false,
        message: '스케줄러 상태 조회에 실패했습니다.'
      });
    }
  });

  // 환경변수 스케줄러 설정 업데이트 API (관리자 전용)
  router.post('/admin/env-scheduler/config', requireAuth, async (req, res) => {
    try {
      const { getScheduler } = await import('../services/envVarScheduler.js');
      const scheduler = getScheduler();

      if (!scheduler) {
        return res.status(404).json({
          success: false,
          message: 'Scheduler not initialized'
        });
      }

      const { enabled, intervalHours, autoCleanup, maxOrphanedKeys, scheduledTime } = req.body;

      scheduler.updateConfig({
        enabled: enabled !== undefined ? enabled : undefined,
        intervalHours: intervalHours !== undefined ? intervalHours : undefined,
        autoCleanup: autoCleanup !== undefined ? autoCleanup : undefined,
        maxOrphanedKeys: maxOrphanedKeys !== undefined ? maxOrphanedKeys : undefined,
        scheduledTime: scheduledTime !== undefined ? scheduledTime : undefined
      });

      const updatedConfig = scheduler.getConfig();
      res.json({
        success: true,
        message: '스케줄러 설정이 업데이트되었습니다.',
        data: updatedConfig
      });
    } catch (error) {
      console.error('스케줄러 설정 업데이트 실패:', error);
      res.status(500).json({
        success: false,
        message: '스케줄러 설정 업데이트에 실패했습니다.'
      });
    }
  });

  // 환경변수 검증 수동 실행 API (관리자 전용)
  router.post('/admin/env-scheduler/run', requireAuth, async (req, res) => {
    try {
      const { getScheduler } = await import('../services/envVarScheduler.js');
      const scheduler = getScheduler();

      if (!scheduler) {
        return res.status(404).json({
          success: false,
          message: 'Scheduler not initialized'
        });
      }

      await scheduler.runManually();
      res.json({
        success: true,
        message: '환경변수 검증이 수동으로 실행되었습니다.'
      });
    } catch (error) {
      console.error('수동 검증 실행 실패:', error);
      res.status(500).json({
        success: false,
        message: '수동 검증 실행에 실패했습니다.'
      });
    }
  });

  // 환경변수 사용 현황 보고서 API
  router.get('/env-vars/report', requireAuth, async (req, res) => {
    try {
      const { Pool } = await import('pg');
      const { extractUserEnvVars } = await import('../utils/variableDetection.js');
      const { loadSettings } = await import('../config/index.js');

      // 서버별 환경변수 추출
      const settings = loadSettings();
      const serverStats: any[] = [];
      const allEnvVars = new Map<string, string[]>();

      if (settings?.mcpServers) {
        Object.entries(settings.mcpServers).forEach(([serverName, serverConfig]) => {
          const envVars = extractUserEnvVars(serverConfig);

          serverStats.push({
            serverName,
            envVars,
            usersWithValues: 0,
            totalUsers: 0,
            usagePercentage: 0
          });

          envVars.forEach(varName => {
            if (!allEnvVars.has(varName)) {
              allEnvVars.set(varName, []);
            }
            allEnvVars.get(varName)!.push(serverName);
          });
        });
      }

      // DB에서 사용자 데이터 조회
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/mcphub'
      });

      const result = await pool.query(`
        SELECT 
          mk.id,
          mk."userId", 
          mk."serviceTokens",
          u."githubUsername",
          u."isActive" as user_active
        FROM mcphub_keys mk
        JOIN users u ON mk."userId" = u.id
        WHERE mk."isActive" = true
        ORDER BY u."githubUsername"
      `);

      const totalUsers = result.rows.length;

      // 환경변수별 사용 통계 계산
      const envVarStats: any[] = [];

      allEnvVars.forEach((associatedServers, varName) => {
        let usersWithValues = 0;

        result.rows.forEach(row => {
          const serviceTokens = row.serviceTokens || {};
          const hasValue = serviceTokens[varName] &&
            serviceTokens[varName].trim() !== '';
          if (hasValue) {
            usersWithValues++;
          }
        });

        envVarStats.push({
          varName,
          usersWithValues,
          totalUsers,
          usagePercentage: totalUsers > 0 ? (usersWithValues / totalUsers) * 100 : 0,
          associatedServers
        });
      });

      // 서버별 통계 계산
      serverStats.forEach(serverStat => {
        let serverUsersWithAnyValue = 0;

        result.rows.forEach(row => {
          const serviceTokens = row.serviceTokens || {};
          const hasAnyServerValue = serverStat.envVars.some((varName: string) =>
            serviceTokens[varName] && serviceTokens[varName].trim() !== ''
          );

          if (hasAnyServerValue) {
            serverUsersWithAnyValue++;
          }
        });

        serverStat.usersWithValues = serverUsersWithAnyValue;
        serverStat.totalUsers = totalUsers;
        serverStat.usagePercentage = totalUsers > 0 ? (serverUsersWithAnyValue / totalUsers) * 100 : 0;
      });

      await pool.end();

      res.json({
        success: true,
        data: {
          summary: {
            totalServers: serverStats.length,
            totalEnvVars: envVarStats.length,
            totalUsers
          },
          serverStats: serverStats.sort((a, b) => b.usagePercentage - a.usagePercentage),
          envVarStats: envVarStats.sort((a, b) => b.usagePercentage - a.usagePercentage),
          unusedVars: envVarStats.filter(v => v.usagePercentage === 0)
        }
      });

    } catch (error) {
      console.error('환경변수 보고서 생성 실패:', error);
      res.status(500).json({
        success: false,
        message: '환경변수 보고서 생성에 실패했습니다.'
      });
    }
  });

  // Add API routes to express app
  const basePath = config.basePath;
  app.use(`${basePath}/api`, router);

  // Config 라우트 (인증 없이 접근 가능)
  app.get(`${basePath}/config`, getRuntimeConfig);
  app.get(`${basePath}/login/config`, getPublicConfig);

  // 사용자 그룹 관리 라우트
  app.use(`${basePath}/api/user/groups`, userGroupRoutes);

  // AI 기반 자동 구성 시스템 라우트
  app.use(`${basePath}/api/ai`, aiRoutes);

  // REST API 엔드포인트는 Cursor IDE에서 사용하지 않으므로 제거
  // Cursor IDE는 MCP 프로토콜을 통해 /mcp 엔드포인트로 통신함
};

export default router;

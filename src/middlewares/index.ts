import express, { Request, Response, NextFunction } from 'express';
import { auth } from './auth.js';
import { initializeDefaultUser } from '../models/User.js';
import config from '../config/index.js';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
};

export const initMiddlewares = (app: express.Application): void => {
  // CORS 설정 (세션 쿠키 포함)
  app.use((req, res, next) => {
    // 개발 환경에서는 모든 오리진 허용
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Expose-Headers', 'Set-Cookie');
    
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    
    next();
  });

  // Serve static files from the dynamically determined frontend path
  // Note: Static files will be handled by the server directly, not here

  app.use((req, res, next) => {
    const basePath = config.basePath;
    // Only apply JSON parsing for API and auth routes, not for SSE or message endpoints
    // TODO exclude sse responses by mcp endpoint
    if (
      req.path !== `${basePath}/sse` &&
      !req.path.startsWith(`${basePath}/sse/`) &&
      req.path !== `${basePath}/messages`
    ) {
      express.json()(req, res, next);
    } else {
      next();
    }
  });

  // Initialize default admin user if no users exist
  initializeDefaultUser().catch((err) => {
    console.error('Error initializing default user:', err);
  });

  // Protect API routes with authentication middleware, but exclude auth endpoints
  app.use(`${config.basePath}/api`, (req, res, next) => {
    // Skip authentication for login, register, and GitHub OAuth endpoints
    if (
      req.path === '/auth/login' || 
      req.path === '/auth/register' ||
      req.path === '/auth/github' ||
      req.path === '/auth/github/callback'
    ) {
      next();
    } else {
      // JWT 토큰 기반 인증만 사용
      auth(req, res, next);
    }
  });

  app.use(errorHandler);
};

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { loadSettings } from '../config/index.js';

// Default secret key - in production, use an environment variable
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

const validateBearerAuth = (req: Request, routingConfig: any): boolean => {
  if (!routingConfig.enableBearerAuth) {
    return false;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  return authHeader.substring(7) === routingConfig.bearerAuthKey;
};

// Middleware to authenticate JWT token
export const auth = (req: Request, res: Response, next: NextFunction): void => {
  // Check if authentication is disabled globally
  const routingConfig = loadSettings().systemConfig?.routing || {
    enableGlobalRoute: true,
    enableGroupNameRoute: true,
    enableBearerAuth: false,
    bearerAuthKey: '',
    skipAuth: false,
  };

  if (routingConfig.skipAuth) {
    next();
    return;
  }

  // Check if bearer auth is enabled and validate it
  if (validateBearerAuth(req, routingConfig)) {
    next();
    return;
  }

  // Get token from header or query parameter
  const headerToken = req.header('x-auth-token');
  const queryToken = req.query.token as string;
  const token = headerToken || queryToken;

  // Check if no token
  if (!token) {
    res.status(401).json({ success: false, message: 'No token, authorization denied' });
    return;
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Add user from payload to request
    (req as any).user = (decoded as any).user;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'Token is not valid' });
  }
};

/**
 * 세션 기반 인증 미들웨어 (OAuth용)
 */
export const sessionAuth = (req: Request, res: Response, next: NextFunction): void => {
  console.log('🔍 세션 인증 미들웨어 - 인증 확인');
  console.log('🔍 req.user:', req.user);
  console.log('🔍 req.isAuthenticated():', req.isAuthenticated ? req.isAuthenticated() : 'isAuthenticated 함수 없음');
  console.log('🔍 req.session:', req.session);
  
  // Passport.js 세션 인증 확인
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    console.log('✅ 세션 기반 인증 성공');
    next();
  } else {
    console.log('❌ 세션 기반 인증 실패');
    res.status(401).json({ 
      success: false, 
      message: '세션 인증이 필요합니다.' 
    });
  }
};

import { Request, Response } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import { UserService } from '../services/userService.js';
import { MCPHubKeyService } from '../services/mcpHubKeyService.js';
import { User } from '../db/entities/User.js';

/**
 * JWT 시크릿 키
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * JWT 토큰 만료 시간 (24시간)
 */
const TOKEN_EXPIRY = '24h';

// Service 인스턴스
const userService = new UserService();
const mcpHubKeyService = new MCPHubKeyService();

/**
 * GitHub OAuth 로그인 시작
 */
export const initiateGithubLogin = (req: Request, res: Response) => {
  console.log('🚀 GitHub OAuth 로그인 시작');
  passport.authenticate('github', { 
    scope: ['user:email'] // 이메일 정보 요청
  })(req, res);
};

/**
 * GitHub OAuth 콜백 처리
 */
export const handleGithubCallback = (req: Request, res: Response) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  
  passport.authenticate('github', { 
    failureRedirect: `${frontendUrl}/login?error=oauth_failed`,
    successRedirect: frontendUrl 
  }, async (err: any, user: User) => {
    if (err) {
      console.error('❌ GitHub OAuth 콜백 오류:', err);
      return res.redirect(`${frontendUrl}/login?error=oauth_error`);
    }

    if (!user) {
      console.log('⚠️ GitHub OAuth: 사용자 정보 없음');
      return res.redirect(`${frontendUrl}/login?error=no_user`);
    }

    try {
      // JWT 토큰 페이로드 생성
      const payload = {
        user: {
          username: user.githubUsername,
          isAdmin: user.isAdmin || false
        }
      };

      // JWT 토큰 생성
      jwt.sign(
        payload,
        JWT_SECRET,
        { expiresIn: TOKEN_EXPIRY },
        (jwtErr, token) => {
          if (jwtErr) {
            console.error('❌ JWT 토큰 생성 오류:', jwtErr);
            return res.redirect(`${frontendUrl}/login?error=token_error`);
          }

          console.log(`✅ GitHub OAuth 로그인 성공: ${user.githubUsername}`);
          console.log(`🔑 JWT 토큰 생성 완료`);
          
          // JWT 토큰을 URL 파라미터로 전달하여 프론트엔드로 리다이렉트
          const redirectUrl = `${frontendUrl}/login?oauth_token=${token}&welcome=true`;
          console.log(`🔄 프론트엔드로 리다이렉트 (JWT 토큰 포함)`);
          return res.redirect(redirectUrl);
        }
      );
    } catch (error) {
      console.error('❌ OAuth 콜백 처리 중 오류:', error);
      return res.redirect(`${frontendUrl}/login?error=oauth_processing_error`);
    }
  })(req, res);
};

/**
 * 로그아웃
 */
export const logout = (req: Request, res: Response) => {
  const user = req.user as User;
  if (user) {
    console.log(`👋 사용자 로그아웃: ${user.githubUsername}`);
  }

  req.logout((err) => {
    if (err) {
      console.error('❌ 로그아웃 오류:', err);
      return res.status(500).json({ 
        success: false, 
        message: '로그아웃 중 오류가 발생했습니다.' 
      });
    }

    req.session.destroy((sessionErr) => {
      if (sessionErr) {
        console.error('❌ 세션 삭제 오류:', sessionErr);
      }
      
      res.clearCookie('connect.sid');
      res.redirect('/login?logout=success');
    });
  });
};

/**
 * 현재 사용자 정보 조회
 */
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    console.log('🔍 OAuth 사용자 정보 요청 - 세션 확인');
    console.log('🔍 req.user:', req.user);
    console.log('🔍 req.session:', req.session);
    console.log('🔍 req.sessionID:', req.sessionID);
    console.log('🔍 요청 헤더 쿠키:', req.headers.cookie);
    console.log('🔍 세션 인증 상태:', req.isAuthenticated ? req.isAuthenticated() : 'isAuthenticated 함수 없음');
    
    const user = req.user as User;
    if (!user) {
      console.log('❌ OAuth 인증되지 않은 사용자 - req.user가 없음');
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 사용자 키 통계 조회
    const keyStats = await userService.getUserKeyUsageStats(user.id);

    const userData = {
      id: user.id,
      githubId: user.githubId,
      githubUsername: user.githubUsername,
      displayName: user.displayName,
      email: user.email,
      avatarUrl: user.avatarUrl,
      githubProfileUrl: user.githubProfileUrl,
      isAdmin: user.isAdmin,
      isActive: user.isActive,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      keyStats
    };

    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('❌ 사용자 정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 정보 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 사용자 MCPHub Key 목록 조회 (JWT 기반)
 */
export const getUserKeys = async (req: Request, res: Response) => {
  try {
    // JWT에서 사용자명 추출
    const jwtUser = (req as any).user;
    if (!jwtUser || !jwtUser.username) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 사용자명으로 실제 사용자 정보 조회
    const user = await userService.getUserByGithubUsername(jwtUser.username);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const keys = await mcpHubKeyService.getUserKeys(user.id);
    
    // 키 값 마스킹 (보안)
    const maskedKeys = keys.map(key => ({
      ...key,
      keyValue: `${key.keyValue.substring(0, 12)}***${key.keyValue.substring(key.keyValue.length - 4)}`,
      user: undefined, // 사용자 정보 제거
      serviceTokens: key.serviceTokens ? Object.keys(key.serviceTokens) : [] // 토큰 키만 반환
    }));

    res.json({
      success: true,
      data: maskedKeys
    });
  } catch (error) {
    console.error('❌ 사용자 키 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '키 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 새 MCPHub Key 생성 (JWT 기반)
 */
export const createUserKey = async (req: Request, res: Response) => {
  try {
    // JWT에서 사용자명 추출
    const jwtUser = (req as any).user;
    if (!jwtUser || !jwtUser.username) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 사용자명으로 실제 사용자 정보 조회
    const user = await userService.getUserByGithubUsername(jwtUser.username);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const { name, description, expirationDays } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: '키 이름은 필수입니다.'
      });
    }

    // 만료일 검증 (1일 ~ 90일)
    let validExpirationDays = 90; // 기본값
    if (expirationDays !== undefined) {
      if (typeof expirationDays !== 'number' || expirationDays < 1 || expirationDays > 90) {
        return res.status(400).json({
          success: false,
          message: '만료일은 1일에서 90일 사이여야 합니다.'
        });
      }
      validExpirationDays = expirationDays;
    }

    const newKey = await mcpHubKeyService.createKey(user.id, {
      name: name.trim(),
      description: description?.trim(),
      expirationDays: validExpirationDays
    });

    res.status(201).json({
      success: true,
      message: '새 MCPHub Key가 생성되었습니다.',
      data: {
        id: newKey.id,
        keyValue: newKey.keyValue, // 생성 시에만 전체 키 반환
        name: newKey.name,
        description: newKey.description,
        expiresAt: newKey.expiresAt,
        daysUntilExpiry: newKey.daysUntilExpiry
      }
    });
  } catch (error) {
    console.error('❌ MCPHub Key 생성 오류:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '키 생성 중 오류가 발생했습니다.'
    });
  }
};

/**
 * MCPHub Key 서비스 토큰 업데이트 (JWT 기반)
 */
export const updateKeyTokens = async (req: Request, res: Response) => {
  try {
    // JWT에서 사용자명 추출
    const jwtUser = (req as any).user;
    if (!jwtUser || !jwtUser.username) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 사용자명으로 실제 사용자 정보 조회
    const user = await userService.getUserByGithubUsername(jwtUser.username);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const { keyId } = req.params;
    const { serviceTokens } = req.body;

    if (!serviceTokens || typeof serviceTokens !== 'object') {
      return res.status(400).json({
        success: false,
        message: '서비스 토큰 정보가 필요합니다.'
      });
    }

    const updatedKey = await mcpHubKeyService.updateServiceTokens(
      keyId, 
      serviceTokens, 
      user.id
    );

    res.json({
      success: true,
      message: '서비스 토큰이 업데이트되었습니다.',
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        serviceTokenKeys: Object.keys(updatedKey.serviceTokens || {})
      }
    });
  } catch (error) {
    console.error('❌ 서비스 토큰 업데이트 오류:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '토큰 업데이트 중 오류가 발생했습니다.'
    });
  }
};

/**
 * MCPHub Key 만료 연장
 */
export const extendKeyExpiry = async (req: Request, res: Response) => {
  try {
    // JWT에서 사용자명 추출
    const jwtUser = (req as any).user;
    if (!jwtUser || !jwtUser.username) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 사용자명으로 실제 사용자 정보 조회
    const user = await userService.getUserByGithubUsername(jwtUser.username);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const { keyId } = req.params;

    const updatedKey = await mcpHubKeyService.extendKeyExpiry(keyId, user.id);

    res.json({
      success: true,
      message: '키 만료일이 90일 연장되었습니다.',
      data: {
        id: updatedKey.id,
        name: updatedKey.name,
        expiresAt: updatedKey.expiresAt,
        daysUntilExpiry: updatedKey.daysUntilExpiry
      }
    });
  } catch (error) {
    console.error('❌ 키 만료 연장 오류:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '키 만료 연장 중 오류가 발생했습니다.'
    });
  }
};

/**
 * MCPHub Key 비활성화
 */
export const deactivateKey = async (req: Request, res: Response) => {
  try {
    // JWT에서 사용자명 추출
    const jwtUser = (req as any).user;
    if (!jwtUser || !jwtUser.username) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 사용자명으로 실제 사용자 정보 조회
    const user = await userService.getUserByGithubUsername(jwtUser.username);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '사용자를 찾을 수 없습니다.' 
      });
    }

    const { keyId } = req.params;

    await mcpHubKeyService.setKeyActive(keyId, false, user.id);

    res.json({
      success: true,
      message: '키가 비활성화되었습니다.'
    });
  } catch (error) {
    console.error('❌ 키 비활성화 오류:', error);
    
    if (error instanceof Error) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: '키 비활성화 중 오류가 발생했습니다.'
    });
  }
}; 
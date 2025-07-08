/**
 * 인증 컨트롤러
 * 
 * 사용자 인증과 관련된 모든 API 엔드포인트를 처리합니다.
 * JWT 토큰 기반 인증을 사용하며, 로그인, 회원가입, 비밀번호 변경 등의 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 사용자 로그인 및 JWT 토큰 발급
 * - 새 사용자 등록
 * - 현재 사용자 정보 조회
 * - 비밀번호 변경
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { validationResult } from 'express-validator';
import { findUserByUsername, verifyPassword, createUser, updateUserPassword } from '../models/User.js';
import axios from 'axios';

/**
 * JWT 시크릿 키
 * 프로덕션 환경에서는 반드시 환경변수로 설정해야 합니다.
 */
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

/**
 * JWT 토큰 만료 시간 (24시간)
 */
const TOKEN_EXPIRY = '24h';

/**
 * 사용자 로그인 처리
 * 
 * 사용자명과 비밀번호를 검증하고 성공 시 JWT 토큰을 발급합니다.
 * 
 * @param {Request} req - Express 요청 객체 (username, password 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 로그인 결과 (토큰 및 사용자 정보 또는 오류)
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  // 요청 유효성 검사
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { username, password } = req.body;

  try {
    // 사용자명으로 사용자 찾기
    const user = findUserByUsername(username);
    
    if (!user) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // 비밀번호 검증
    const isPasswordValid = await verifyPassword(password, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Invalid credentials' });
      return;
    }

    // JWT 토큰 페이로드 생성
    const payload = {
      user: {
        username: user.username,
        isAdmin: user.isAdmin || false
      }
    };

    // JWT 토큰 생성 및 발급
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          success: true, 
          token,
          user: {
            username: user.username,
            isAdmin: user.isAdmin
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * 새 사용자 등록 처리
 * 
 * 새로운 사용자를 생성하고 성공 시 JWT 토큰을 발급합니다.
 * 
 * @param {Request} req - Express 요청 객체 (username, password, isAdmin 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 등록 결과 (토큰 및 사용자 정보 또는 오류)
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  // 요청 유효성 검사
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { username, password, isAdmin } = req.body;

  try {
    // 새 사용자 생성
    const newUser = await createUser({ username, password, isAdmin });
    
    if (!newUser) {
      res.status(400).json({ success: false, message: 'User already exists' });
      return;
    }

    // JWT 토큰 페이로드 생성
    const payload = {
      user: {
        username: newUser.username,
        isAdmin: newUser.isAdmin || false
      }
    };

    // JWT 토큰 생성 및 발급
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY },
      (err, token) => {
        if (err) throw err;
        res.json({ 
          success: true, 
          token,
          user: {
            username: newUser.username,
            isAdmin: newUser.isAdmin
          }
        });
      }
    );
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * 현재 로그인한 사용자 정보 조회
 * 
 * 인증 미들웨어를 통해 검증된 사용자의 정보를 반환합니다.
 * 
 * @param {Request} req - Express 요청 객체 (인증된 사용자 정보 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {void} 사용자 정보 또는 오류
 */
export const getCurrentUser = (req: Request, res: Response): void => {
  try {
    // 인증 미들웨어에 의해 요청에 첨부된 사용자 정보
    const user = (req as any).user;
    
    res.json({ 
      success: true, 
      user: {
        username: user.username,
        isAdmin: user.isAdmin
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * 사용자 비밀번호 변경 처리
 * 
 * 현재 비밀번호를 확인한 후 새로운 비밀번호로 변경합니다.
 * 
 * @param {Request} req - Express 요청 객체 (currentPassword, newPassword 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 비밀번호 변경 결과 또는 오류
 */
export const changePassword = async (req: Request, res: Response): Promise<void> => {
  // 요청 유효성 검사
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, errors: errors.array() });
    return;
  }

  const { currentPassword, newPassword } = req.body;
  const username = (req as any).user.username;

  try {
    // 사용자명으로 사용자 찾기
    const user = findUserByUsername(username);
    
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    // 현재 비밀번호 검증
    const isPasswordValid = await verifyPassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: 'Current password is incorrect' });
      return;
    }

    // 새 비밀번호로 업데이트
    const updated = await updateUserPassword(username, newPassword);
    
    if (!updated) {
      res.status(500).json({ success: false, message: 'Failed to update password' });
      return;
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * GitHub OAuth 로그인 초기화
 * 
 * GitHub OAuth 인증 URL로 리다이렉트합니다.
 * 
 * @param {Request} req - Express 요청 객체
 * @param {Response} res - Express 응답 객체
 * @returns {void} GitHub OAuth URL로 리다이렉트
 */
export const initiateGitHubAuth = (req: Request, res: Response): void => {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL;

  if (!GITHUB_CLIENT_ID) {
    res.status(500).json({ success: false, message: 'GitHub OAuth not configured' });
    return;
  }

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${GITHUB_CALLBACK_URL}&scope=user:email`;
  res.redirect(githubAuthUrl);
};

/**
 * GitHub OAuth 콜백 처리
 * 
 * GitHub에서 받은 인증 코드를 사용하여 액세스 토큰을 받고,
 * 사용자 정보를 가져와서 JWT 토큰을 발급합니다.
 * 
 * @param {Request} req - Express 요청 객체 (code 쿼리 파라미터 포함)
 * @param {Response} res - Express 응답 객체
 * @returns {Promise<void>} 인증 결과 (JWT 토큰 또는 오류)
 */
export const handleGitHubCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.query;
    const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
    const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
    const GITHUB_CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || 'http://localhost:3000/api/auth/github/callback';

    if (!code || !GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
      res.status(400).json({ success: false, message: 'Missing required parameters' });
      return;
    }

    // GitHub에서 액세스 토큰 요청
    const tokenResponse = await axios.post('https://github.com/login/oauth/access_token', {
      client_id: GITHUB_CLIENT_ID,
      client_secret: GITHUB_CLIENT_SECRET,
      code
    }, {
      headers: { 
        Accept: 'application/json',
        'Content-Type': 'application/json'
      }
    });

    const { access_token, error } = tokenResponse.data;

    if (error) {
      console.error('GitHub token error:', error);
      res.status(400).json({ success: false, message: 'Failed to get access token' });
      return;
    }

    if (!access_token) {
      res.status(400).json({ success: false, message: 'No access token received' });
      return;
    }

    // GitHub 사용자 정보 요청
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { 
        Authorization: `token ${access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const githubUser = userResponse.data;

    // GitHub 사용자 이메일 요청
    const emailResponse = await axios.get('https://api.github.com/user/emails', {
      headers: { 
        Authorization: `token ${access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    const emails = emailResponse.data;
    const primaryEmail = emails.find((email: any) => email.primary)?.email || githubUser.email;

    // 사용자명 생성 (GitHub username 사용)
    const username = `github_${githubUser.login}`;

    // 기존 사용자 확인 또는 새 사용자 생성
    let user = findUserByUsername(username);
    
    if (!user) {
      // 새 사용자 생성
      const newUser = await createUser({
        username,
        password: `github_${Date.now()}`, // 임시 비밀번호
        isAdmin: false,
        email: primaryEmail,
        githubId: githubUser.id.toString()
      });
      
      if (!newUser) {
        res.status(500).json({ success: false, message: 'Failed to create user' });
        return;
      }
      
      user = newUser;
    }

    if (!user) {
      res.status(500).json({ success: false, message: 'Failed to create or find user' });
      return;
    }

    // JWT 토큰 페이로드 생성
    const payload = {
      user: {
        username: user.username,
        isAdmin: user.isAdmin || false
      }
    };

    // JWT 토큰 생성 및 발급
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRY },
      (err, token) => {
        if (err) {
          console.error('JWT signing error:', err);
          res.status(500).json({ success: false, message: 'Failed to generate token' });
          return;
        }

        // 프론트엔드로 리다이렉트 (토큰 포함)
        // 보안: 토큰을 URL 파라미터로 전달 (HTTPS 환경에서는 안전)
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        res.redirect(`${frontendUrl}/?token=${token}&username=${user.username}`);
      }
    );
  } catch (error) {
    console.error('GitHub OAuth callback error:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/login?error=Authentication failed`);
  }
};
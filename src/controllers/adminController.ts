import { Request, Response } from 'express';
import { UserService } from '../services/userService.js';
import { findUserByUsername } from '../models/User.js';

// Service 인스턴스
const userService = new UserService();

/**
 * 슈퍼 어드민 권한 확인 (파일 기반 admin 계정만)
 */
const isSuperAdmin = (jwtUser: any): boolean => {
  if (!jwtUser || !jwtUser.username) return false;
  
  // 파일 기반 사용자 확인
  const fileUser = findUserByUsername(jwtUser.username);
  return fileUser ? (fileUser.isAdmin || false) : false;
};

/**
 * 관리자 전용: 모든 사용자 목록 조회
 */
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    // JWT에서 사용자명 추출
    const jwtUser = (req as any).user;
    if (!jwtUser || !jwtUser.username) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 현재 사용자 권한 확인
    const currentUser = await userService.getUserByGithubUsername(jwtUser.username);
    if (!currentUser || !currentUser.isAdmin) {
      return res.status(403).json({ 
        success: false, 
        message: '관리자 권한이 필요합니다.' 
      });
    }

    // 모든 사용자 조회 (키 개수 포함)
    const users = await userService.getAllUsersWithKeyCount();

    res.json({
      success: true,
      users: users.map(user => ({
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
        keyCount: (user as any).keyCount || 0
      }))
    });
  } catch (error) {
    console.error('❌ 사용자 목록 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 목록 조회 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 슈퍼 어드민 전용: 사용자 관리자 권한 변경
 */
export const updateUserAdminRole = async (req: Request, res: Response) => {
  try {
    // JWT에서 사용자명 추출
    const jwtUser = (req as any).user;
    if (!jwtUser || !jwtUser.username) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 슈퍼 어드민 권한 확인 (파일 기반 admin 계정만)
    if (!isSuperAdmin(jwtUser)) {
      return res.status(403).json({ 
        success: false, 
        message: '슈퍼 어드민 권한이 필요합니다. 파일 기반 admin 계정만 사용자 권한을 변경할 수 있습니다.' 
      });
    }

    const { userId } = req.params;
    const { isAdmin } = req.body;

    if (typeof isAdmin !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isAdmin은 boolean 값이어야 합니다.'
      });
    }

    // 대상 사용자 조회
    const targetUser = await userService.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 슈퍼 어드민은 모든 사용자 권한 변경 가능 (파일 기반이므로 자신의 계정과 무관)

    // 권한 업데이트
    const updatedUser = await userService.setAdminRole(userId, isAdmin);
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '사용자 권한 업데이트 실패'
      });
    }

    console.log(`👑 관리자 권한 변경: ${targetUser.githubUsername} -> ${isAdmin ? '관리자' : '일반 사용자'} (by 슈퍼어드민: ${jwtUser.username})`);

    res.json({
      success: true,
      message: `사용자 권한이 ${isAdmin ? '관리자로 승급' : '일반 사용자로 변경'}되었습니다.`,
      user: {
        id: updatedUser.id,
        githubUsername: updatedUser.githubUsername,
        isAdmin: updatedUser.isAdmin
      }
    });
  } catch (error) {
    console.error('❌ 사용자 권한 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 권한 변경 중 오류가 발생했습니다.'
    });
  }
};

/**
 * 슈퍼 어드민 전용: 사용자 활성화 상태 변경
 */
export const updateUserStatus = async (req: Request, res: Response) => {
  try {
    // JWT에서 사용자명 추출
    const jwtUser = (req as any).user;
    if (!jwtUser || !jwtUser.username) {
      return res.status(401).json({ 
        success: false, 
        message: '인증되지 않은 사용자입니다.' 
      });
    }

    // 슈퍼 어드민 권한 확인 (파일 기반 admin 계정만)
    if (!isSuperAdmin(jwtUser)) {
      return res.status(403).json({ 
        success: false, 
        message: '슈퍼 어드민 권한이 필요합니다. 파일 기반 admin 계정만 사용자 상태를 변경할 수 있습니다.' 
      });
    }

    const { userId } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive는 boolean 값이어야 합니다.'
      });
    }

    // 대상 사용자 조회
    const targetUser = await userService.getUserById(userId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: '사용자를 찾을 수 없습니다.'
      });
    }

    // 슈퍼 어드민은 모든 계정 상태 변경 가능 (파일 기반이므로 자신의 계정과 무관)

    // 상태 업데이트
    const updatedUser = await userService.updateUser(userId, { isActive });
    if (!updatedUser) {
      return res.status(404).json({
        success: false,
        message: '사용자 상태 업데이트 실패'
      });
    }

    console.log(`📝 계정 상태 변경: ${targetUser.githubUsername} -> ${isActive ? '활성' : '비활성'} (by 슈퍼어드민: ${jwtUser.username})`);

    res.json({
      success: true,
      message: `계정이 ${isActive ? '활성화' : '비활성화'}되었습니다.`,
      user: {
        id: updatedUser.id,
        githubUsername: updatedUser.githubUsername,
        isActive: updatedUser.isActive
      }
    });
  } catch (error) {
    console.error('❌ 사용자 상태 변경 오류:', error);
    res.status(500).json({
      success: false,
      message: '사용자 상태 변경 중 오류가 발생했습니다.'
    });
  }
}; 
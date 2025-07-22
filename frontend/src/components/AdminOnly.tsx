import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * 관리자 권한 전용 컴포넌트
 * 
 * 관리자 권한이 있는 사용자에게만 자식 컴포넌트를 렌더링합니다.
 * 일반 사용자에게는 fallback 컴포넌트 또는 null을 표시합니다.
 * 
 * @param children - 관리자에게만 보여질 컴포넌트
 * @param fallback - 일반 사용자에게 보여질 대체 컴포넌트 (선택사항)
 */
const AdminOnly: React.FC<AdminOnlyProps> = ({ children, fallback = null }) => {
  const { auth } = useAuth();

  // 관리자 권한이 있는 경우에만 children 렌더링
  if (auth.user?.isAdmin) {
    return <>{children}</>;
  }

  // 일반 사용자에게는 fallback 또는 null 렌더링
  return <>{fallback}</>;
};

export default AdminOnly; 
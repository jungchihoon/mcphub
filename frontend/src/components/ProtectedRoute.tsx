/**
 * 보호된 라우트 컴포넌트
 * 
 * 인증이 필요한 페이지에 대한 접근을 제어하는 컴포넌트입니다.
 * 사용자가 인증되지 않은 경우 로그인 페이지로 리디렉션합니다.
 * 
 * 주요 기능:
 * - 인증 상태 확인
 * - 로딩 상태 표시
 * - 미인증 시 로그인 페이지로 리디렉션
 * - 인증된 사용자에게 하위 라우트 렌더링
 */

import React from 'react';

// React Router의 네비게이션 컴포넌트들을 가져옵니다
import { Navigate, Outlet } from 'react-router-dom';

// 다국어 지원을 위한 react-i18next 훅을 가져옵니다
import { useTranslation } from 'react-i18next';

// 인증 상태를 확인하기 위한 컨텍스트 훅을 가져옵니다
import { useAuth } from '../contexts/AuthContext';

/**
 * ProtectedRoute 컴포넌트의 Props 인터페이스
 */
interface ProtectedRouteProps {
  /** 리디렉션할 경로 (기본값: '/login') */
  redirectPath?: string;
}

/**
 * 보호된 라우트 컴포넌트
 * 
 * 인증된 사용자만 접근할 수 있는 라우트를 보호합니다.
 * 인증되지 않은 사용자는 지정된 경로로 리디렉션됩니다.
 * 
 * @param {ProtectedRouteProps} props - 컴포넌트 props
 * @param {string} [props.redirectPath='/login'] - 미인증 시 리디렉션할 경로
 * @returns {JSX.Element} 보호된 라우트 컴포넌트
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  redirectPath = '/login'  // 기본값으로 로그인 페이지 설정
}) => {
  // 다국어 지원 훅 사용
  const { t } = useTranslation();
  
  // 인증 상태 가져오기
  const { auth } = useAuth();

  // 인증 상태 로딩 중일 때 로딩 화면 표시
  if (auth.loading) {
    return <div className="flex items-center justify-center h-screen">{t('app.loading')}</div>;
  }

  // 인증되지 않은 경우 로그인 페이지로 리디렉션
  if (!auth.isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }

  // 인증된 경우 하위 라우트 렌더링
  return <Outlet />;
};

export default ProtectedRoute;
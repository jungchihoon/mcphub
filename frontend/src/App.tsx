// React 라이브러리를 가져옵니다
import React from 'react';

// React Router DOM: 웹 애플리케이션의 페이지 간 이동을 관리하는 라이브러리
// BrowserRouter: 브라우저의 URL을 사용한 라우팅
// Route: 개별 페이지 경로 정의
// Routes: 여러 Route를 그룹화
// Navigate: 다른 페이지로 리다이렉트
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';

// Context Provider들: 애플리케이션 전체에서 사용할 상태와 기능을 제공
// AuthProvider: 사용자 인증 상태 관리 (로그인/로그아웃)
// ToastProvider: 알림 메시지 표시 기능
// ThemeProvider: 다크/라이트 테마 관리
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';

// 레이아웃 컴포넌트: 모든 페이지에 공통으로 적용될 UI 구조
import MainLayout from './layouts/MainLayout';

// 보호된 라우트 컴포넌트: 로그인이 필요한 페이지를 보호
import ProtectedRoute from './components/ProtectedRoute';

// 페이지 컴포넌트들: 각각의 페이지를 담당하는 컴포넌트
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import ServersPage from './pages/ServersPage';
import GroupsPage from './pages/GroupsPage';
import SettingsPage from './pages/SettingsPage';
import MarketPage from './pages/MarketPage';
import LogsPage from './pages/LogsPage';

// 유틸리티 함수: 기본 경로를 가져오는 함수
import { getBasePath } from './utils/runtime';

import { useEffect } from 'react';
import { useAuth } from './contexts/AuthContext';

/**
 * OAuth 콜백 처리 컴포넌트
 * 
 * GitHub OAuth에서 리다이렉트된 후 토큰을 처리하고 메인 페이지로 리다이렉트합니다.
 */
const OAuthCallbackHandler: React.FC = () => {
  const { handleGitHubCallback } = useAuth();

  useEffect(() => {
    // URL에서 토큰 확인 (OAuth 콜백 처리)
    console.log('🌐 OAuthCallbackHandler useEffect - checking for token in URL');
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    console.log('🔍 Token found in URL:', token ? 'Yes' : 'No');
    
    if (token) {
      console.log('🚀 Calling handleGitHubCallback...');
      handleGitHubCallback(token).then((success) => {
        console.log('📊 handleGitHubCallback result:', success);
        if (success) {
          // 성공 시 메인 페이지로 리다이렉트
          console.log('✅ Redirecting to main page...');
          window.location.href = '/';
        }
      });
    }
  }, [handleGitHubCallback]);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
};

/**
 * App 컴포넌트: 애플리케이션의 메인 컴포넌트
 * 
 * 이 컴포넌트는 다음과 같은 역할을 합니다:
 * 1. 전역 상태 관리자들을 설정 (테마, 인증, 알림)
 * 2. 라우팅 시스템을 구성 (어떤 URL이 어떤 페이지를 보여줄지)
 * 3. 전체 애플리케이션의 구조를 정의
 */
function App() {
  // 기본 경로를 가져옵니다 (예: /app, /mcphub 등)
  const basename = getBasePath();
  
  return (
    // Provider들은 중첩되어 있어서, 안쪽 컴포넌트들이 바깥쪽 Provider의 기능을 사용할 수 있습니다
    <ThemeProvider>
      {/* AuthProvider: 로그인 상태, 사용자 정보 관리 */}
      <AuthProvider>
        {/* OAuth 콜백 처리 컴포넌트 */}
        <OAuthCallbackHandler />
        
        {/* ToastProvider: 성공/오류 메시지 표시 기능 */}
        <ToastProvider>
          {/* Router: URL 기반 페이지 이동 관리 */}
          <Router basename={basename}>
            {/* Routes: 여러 Route들을 그룹화 */}
            <Routes>
              {/* 공개 라우트: 로그인 없이도 접근 가능한 페이지 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 보호된 라우트: 로그인이 필요한 페이지들 */}
              <Route element={<ProtectedRoute />}>
                {/* MainLayout: 모든 보호된 페이지에 공통으로 적용될 레이아웃 */}
                <Route element={<MainLayout />}>
                  {/* 홈페이지: 대시보드 */}
                  <Route path="/" element={<DashboardPage />} />
                  
                  {/* 서버 관리 페이지 */}
                  <Route path="/servers" element={<ServersPage />} />
                  
                  {/* 그룹 관리 페이지 */}
                  <Route path="/groups" element={<GroupsPage />} />
                  
                  {/* 마켓플레이스 페이지 */}
                  <Route path="/market" element={<MarketPage />} />
                  
                  {/* 특정 서버 상세 페이지 (:serverName은 동적 파라미터) */}
                  <Route path="/market/:serverName" element={<MarketPage />} />
                  
                  {/* 로그 확인 페이지 */}
                  <Route path="/logs" element={<LogsPage />} />
                  
                  {/* 설정 페이지 */}
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* 매칭되지 않는 라우트는 홈페이지로 리다이렉트 */}
              {/* path="*"는 위의 모든 경로와 매칭되지 않는 URL을 의미합니다 */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

// App 컴포넌트를 다른 파일에서 사용할 수 있도록 내보냅니다
export default App;
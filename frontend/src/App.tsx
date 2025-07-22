import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ThemeProvider } from './contexts/ThemeContext';
import MainLayout from './layouts/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/Dashboard';
import ServersPage from './pages/ServersPage';
import GroupsPage from './pages/GroupsPage';
import SettingsPage from './pages/SettingsPage';
import MarketPage from './pages/MarketPage';
import LogsPage from './pages/LogsPage';
import KeyManagementPage from './pages/KeyManagementPage';
import UserManagementPage from './pages/UserManagementPage';
import { getBasePath } from './utils/runtime';

function App() {
  const basename = getBasePath();
  
  // OAuth 로그인 성공 후 리다이렉트 처리
  useEffect(() => {
    console.log('🔍 App.tsx useEffect 실행, 현재 URL:', window.location.href);
    const urlParams = new URLSearchParams(window.location.search);
    const welcomeParam = urlParams.get('welcome');
    console.log('🔍 welcome 파라미터:', welcomeParam);
    
    if (welcomeParam === 'true') {
      console.log('🎉 OAuth 로그인 성공! 페이지 새로고침...');
      // URL에서 welcome 파라미터 제거하고 새로고침
      window.history.replaceState({}, document.title, window.location.pathname);
      // 약간의 지연 후 새로고침 (AuthContext가 로드될 시간 확보)
      setTimeout(() => {
        console.log('🔄 페이지 새로고침 실행');
        window.location.reload();
      }, 100);
    }
  }, []);
  
  return (
    <ThemeProvider>
      <AuthProvider>
        <ToastProvider>
          <Router basename={basename}>
            <Routes>
              {/* 公共路由 */}
              <Route path="/login" element={<LoginPage />} />

              {/* 受保护的路由，使用 MainLayout 作为布局容器 */}
              <Route element={<ProtectedRoute />}>
                <Route element={<MainLayout />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/servers" element={<ServersPage />} />
                  <Route path="/groups" element={<GroupsPage />} />
                  <Route path="/market" element={<MarketPage />} />
                  <Route path="/market/:serverName" element={<MarketPage />} />
                  <Route path="/keys" element={<KeyManagementPage />} />
                  <Route path="/users" element={<UserManagementPage />} />
                  <Route path="/logs" element={<LogsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                </Route>
              </Route>

              {/* 未匹配的路由重定向到首页 */}
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </Router>
        </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import { GitHubIcon } from '../components/icons/GitHubIcon';
import * as authService from '../services/authService';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // OAuth 로그인 성공 후 리다이렉트 처리
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const oauthToken = urlParams.get('oauth_token');
    const welcomeParam = urlParams.get('welcome');
    
    console.log('🔍 LoginPage: OAuth 토큰:', oauthToken ? '있음' : '없음');
    console.log('🔍 LoginPage: welcome 파라미터:', welcomeParam);
    
    if (oauthToken && welcomeParam === 'true') {
      console.log('🎉 LoginPage: OAuth 토큰 수신, localStorage에 저장');
      
      // JWT 토큰을 localStorage에 저장
      authService.setToken(oauthToken);
      
      // URL 파라미터 제거하고 메인 페이지로 이동
      console.log('🔄 LoginPage: 메인 페이지로 리다이렉트');
      window.location.href = '/'; // 전체 페이지 새로고침으로 AuthContext 재로드
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!username || !password) {
        setError(t('auth.emptyFields'));
        setLoading(false);
        return;
      }

      const success = await login(username, password);

      if (success) {
        navigate('/');
      } else {
        setError(t('auth.loginFailed'));
      }
    } catch (err) {
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  const handleGitHubLogin = () => {
    // GitHub OAuth 로그인 시작 (백엔드 서버 URL로 이동)
    window.location.href = 'http://localhost:3000/api/auth/github';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 login-container">
      <div className="absolute top-4 right-4">
        <ThemeSwitch />
      </div>
      <div className="max-w-md w-full space-y-8 login-card p-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('auth.loginTitle')}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                {t('auth.username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-200 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm transition-all duration-200 form-input"
                placeholder={t('auth.username')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('auth.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-700 placeholder-gray-500 dark:placeholder-gray-400 text-gray-900 dark:text-white dark:bg-gray-800 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm login-input transition-all duration-200 form-input"
                placeholder={t('auth.password')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm text-center error-box p-2 rounded">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 login-button transition-all duration-200 btn-primary"
            >
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </div>

          {/* 구분선 */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                또는
              </span>
            </div>
          </div>

          {/* GitHub OAuth 로그인 버튼 */}
          <div>
            <button
              type="button"
              onClick={handleGitHubLogin}
              className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              <GitHubIcon className="w-5 h-5 mr-2" />
              GitHub로 로그인
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
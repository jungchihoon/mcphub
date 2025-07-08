// React 라이브러리와 상태 관리 훅을 가져옵니다
import React, { useState } from 'react';

// React Router의 페이지 이동 기능을 가져옵니다
import { useNavigate } from 'react-router-dom';

// 다국어 지원을 위한 react-i18next 훅을 가져옵니다
import { useTranslation } from 'react-i18next';

// 인증 관련 컨텍스트와 UI 컴포넌트를 가져옵니다
import { useAuth } from '../contexts/AuthContext';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import { initiateGitHubAuth } from '@/services/authService';

/**
 * 로그인 페이지 컴포넌트
 * 
 * 이 컴포넌트는 사용자 로그인을 위한 페이지를 제공합니다.
 * 사용자명과 비밀번호를 입력받아 인증을 처리하고,
 * 성공 시 메인 페이지로 리다이렉트합니다.
 * 
 * 주요 기능:
 * - 로그인 폼 표시
 * - 입력 유효성 검사
 * - 로그인 처리 및 오류 표시
 * - 다크/라이트 테마 전환
 */
const LoginPage: React.FC = () => {
  // 다국어 지원 훅 사용
  const { t } = useTranslation();
  
  // 폼 입력 상태 관리
  const [username, setUsername] = useState('');  // 사용자명 입력값
  const [password, setPassword] = useState('');  // 비밀번호 입력값
  
  // UI 상태 관리
  const [error, setError] = useState<string | null>(null);  // 오류 메시지
  const [loading, setLoading] = useState(false);            // 로딩 상태
  
  // 인증 관련 훅과 페이지 이동 함수
  const { login } = useAuth();
  const navigate = useNavigate();

  /**
   * 폼 제출 처리 함수
   * 
   * 사용자가 로그인 폼을 제출할 때 호출됩니다.
   * 입력 유효성 검사 후 로그인을 시도하고,
   * 성공/실패에 따라 적절한 처리를 수행합니다.
   * 
   * @param e - 폼 제출 이벤트
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();  // 기본 폼 제출 동작 방지
    setError(null);      // 이전 오류 메시지 초기화
    setLoading(true);    // 로딩 상태 시작

    try {
      // 입력 필드 유효성 검사
      if (!username || !password) {
        setError(t('auth.emptyFields'));
        setLoading(false);
        return;
      }

      // 로그인 시도
      const success = await login(username, password);

      if (success) {
        // 로그인 성공 시 메인 페이지로 이동
        navigate('/');
      } else {
        // 로그인 실패 시 오류 메시지 표시
        setError(t('auth.loginFailed'));
      }
    } catch (err) {
      // 예외 발생 시 오류 메시지 표시
      setError(t('auth.loginError'));
    } finally {
      setLoading(false);  // 로딩 상태 종료
    }
  };

  /**
   * GitHub 로그인 버튼 클릭 처리 함수
   */
  const handleGitHubLogin = () => {
    initiateGitHubAuth();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 login-container">
      {/* 테마 전환 스위치 - 우상단에 배치 */}
      <div className="absolute top-4 right-4">
        <ThemeSwitch />
      </div>
      
      {/* 로그인 카드 컨테이너 */}
      <div className="max-w-md w-full space-y-8 login-card p-8">
        {/* 페이지 제목 */}
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {t('auth.loginTitle')}
          </h2>
        </div>
        
        {/* 로그인 폼 */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {/* 입력 필드들 */}
          <div className="rounded-md -space-y-px">
            {/* 사용자명 입력 필드 */}
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
            
            {/* 비밀번호 입력 필드 */}
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

          {/* 오류 메시지 표시 */}
          {error && (
            <div className="text-red-500 dark:text-red-400 text-sm text-center error-box p-2 rounded">{error}</div>
          )}

          {/* 로그인 버튼 */}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 login-button transition-all duration-200 btn-primary"
            >
              {/* 로딩 중일 때와 일반 상태일 때 다른 텍스트 표시 */}
              {loading ? t('auth.loggingIn') : t('auth.login')}
            </button>
          </div>
        </form>

        {/* GitHub 로그인 버튼 */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 dark:bg-gray-900 text-gray-500 dark:text-gray-400">
                {t('auth.or')}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleGitHubLogin}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
              </svg>
              {t('auth.loginWithGitHub')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
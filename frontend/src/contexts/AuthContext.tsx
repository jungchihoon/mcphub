// React 라이브러리와 필요한 훅들을 가져옵니다
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// 타입 정의와 서비스 함수들을 가져옵니다
import { AuthState } from '../types';
import * as authService from '../services/authService';
import { shouldSkipAuth } from '../services/configService';

/**
 * 초기 인증 상태
 * 
 * 애플리케이션이 시작될 때의 기본 인증 상태를 정의합니다.
 * 사용자가 로그인하지 않은 상태를 나타냅니다.
 */
const initialState: AuthState = {
  isAuthenticated: false,  // 인증되지 않은 상태
  loading: true,           // 초기 로딩 중
  user: null,              // 사용자 정보 없음
  error: null,             // 오류 없음
};

/**
 * 인증 컨텍스트 생성
 * 
 * React Context API를 사용하여 전역 인증 상태를 관리합니다.
 * 이 컨텍스트는 인증 상태와 인증 관련 함수들을 제공합니다.
 */
const AuthContext = createContext<{
  auth: AuthState;  // 현재 인증 상태
  login: (username: string, password: string) => Promise<boolean>;  // 로그인 함수
  register: (username: string, password: string, isAdmin?: boolean) => Promise<boolean>;  // 회원가입 함수
  logout: () => void;  // 로그아웃 함수
  handleGitHubCallback: (token: string) => Promise<boolean>;  // GitHub OAuth 콜백 처리
}>({
  auth: initialState,
  login: async () => false,
  register: async () => false,
  logout: () => { },
  handleGitHubCallback: async () => false,
});

/**
 * 인증 제공자 컴포넌트
 * 
 * 이 컴포넌트는 애플리케이션의 모든 하위 컴포넌트들에게
 * 인증 관련 기능을 제공합니다.
 * 
 * @param children - AuthProvider로 감싸진 하위 컴포넌트들
 */
export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // 인증 상태를 관리하는 state
  const [auth, setAuth] = useState<AuthState>(initialState);

  /**
   * 사용자 로딩 효과
   * 
   * 컴포넌트가 마운트될 때 실행되며, 다음을 수행합니다:
   * 1. 인증 건너뛰기 설정 확인
   * 2. 저장된 토큰 확인
   * 3. 토큰이 있으면 사용자 정보 로드
   */
  useEffect(() => {
    const loadUser = async () => {
      // 먼저 인증을 건너뛰어야 하는지 확인
      const skipAuth = await shouldSkipAuth();

      if (skipAuth) {
        // 인증이 비활성화된 경우, 게스트 사용자로 인증된 상태로 설정
        setAuth({
          isAuthenticated: true,
          loading: false,
          user: {
            username: 'guest',
            isAdmin: true,
          },
          error: null,
        });
        return;
      }

      // 일반적인 인증 플로우
      const token = authService.getToken();

      if (!token) {
        // 토큰이 없으면 인증되지 않은 상태로 설정
        setAuth({
          ...initialState,
          loading: false,
        });
        return;
      }

      try {
        // 토큰을 사용하여 현재 사용자 정보를 가져옴
        const response = await authService.getCurrentUser();

        if (response.success && response.user) {
          // 사용자 정보 로드 성공
          setAuth({
            isAuthenticated: true,
            loading: false,
            user: response.user,
            error: null,
          });
        } else {
          // 사용자 정보 로드 실패 - 토큰 제거
          authService.removeToken();
          setAuth({
            ...initialState,
            loading: false,
          });
        }
      } catch (error) {
        // 오류 발생 - 토큰 제거
        authService.removeToken();
        setAuth({
          ...initialState,
          loading: false,
        });
      }
    };

    loadUser();
  }, []);

  /**
   * 로그인 함수
   * 
   * 사용자명과 비밀번호를 사용하여 로그인을 시도합니다.
   * 
   * @param username - 사용자명
   * @param password - 비밀번호
   * @returns Promise<boolean> - 로그인 성공 여부
   */
  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const response = await authService.login({ username, password });

      if (response.success && response.token && response.user) {
        // 로그인 성공 - 인증 상태 업데이트
        setAuth({
          isAuthenticated: true,
          loading: false,
          user: response.user,
          error: null,
        });
        return true;
      } else {
        // 로그인 실패 - 오류 메시지 설정
        setAuth({
          ...initialState,
          loading: false,
          error: response.message || 'Authentication failed',
        });
        return false;
      }
    } catch (error) {
      // 예외 발생 - 오류 메시지 설정
      setAuth({
        ...initialState,
        loading: false,
        error: 'Authentication failed',
      });
      return false;
    }
  };

  /**
   * 회원가입 함수
   * 
   * 새로운 사용자를 등록합니다.
   * 
   * @param username - 사용자명
   * @param password - 비밀번호
   * @param isAdmin - 관리자 권한 여부 (기본값: false)
   * @returns Promise<boolean> - 회원가입 성공 여부
   */
  const register = async (
    username: string,
    password: string,
    isAdmin = false
  ): Promise<boolean> => {
    try {
      const response = await authService.register({ username, password, isAdmin });

      if (response.success && response.token && response.user) {
        // 회원가입 성공 - 인증 상태 업데이트
        setAuth({
          isAuthenticated: true,
          loading: false,
          user: response.user,
          error: null,
        });
        return true;
      } else {
        // 회원가입 실패 - 오류 메시지 설정
        setAuth({
          ...initialState,
          loading: false,
          error: response.message || 'Registration failed',
        });
        return false;
      }
    } catch (error) {
      // 예외 발생 - 오류 메시지 설정
      setAuth({
        ...initialState,
        loading: false,
        error: 'Registration failed',
      });
      return false;
    }
  };

  /**
   * GitHub OAuth 콜백 처리 함수
   * 
   * GitHub OAuth에서 받은 토큰을 처리하고 인증 상태를 업데이트합니다.
   * 
   * @param token - GitHub OAuth에서 받은 JWT 토큰
   * @returns Promise<boolean> - 인증 성공 여부
   */
  const handleGitHubCallback = async (token: string): Promise<boolean> => {
    console.log('🔐 handleGitHubCallback called with token:', token ? 'Token exists' : 'No token');
    try {
      // 토큰을 저장
      console.log('💾 Saving token to localStorage...');
      authService.setToken(token);
      console.log('✅ Token saved successfully');
      
      // 사용자 정보 가져오기
      console.log('👤 Fetching user info...');
      const response = await authService.getCurrentUser();

      console.log('📋 User info response:', response);
      
      if (response.success && response.user) {
        // 인증 성공 - 인증 상태 업데이트
        console.log('✅ Authentication successful, updating auth state');
        setAuth({
          isAuthenticated: true,
          loading: false,
          user: response.user,
          error: null,
        });
        return true;
      } else {
        // 인증 실패 - 토큰 제거
        console.log('❌ Authentication failed:', response.message);
        authService.removeToken();
        setAuth({
          ...initialState,
          loading: false,
          error: response.message || 'GitHub authentication failed',
        });
        return false;
      }
    } catch (error) {
      // 예외 발생 - 토큰 제거
      authService.removeToken();
      setAuth({
        ...initialState,
        loading: false,
        error: 'GitHub authentication failed',
      });
      return false;
    }
  };

  /**
   * 로그아웃 함수
   * 
   * 현재 사용자를 로그아웃시키고 인증 상태를 초기화합니다.
   */
  const logout = (): void => {
    authService.logout();
    setAuth({
      ...initialState,
      loading: false,
    });
  };

  // 컨텍스트 제공자로 하위 컴포넌트들에게 인증 관련 값들을 제공
  return (
    <AuthContext.Provider value={{ auth, login, register, logout, handleGitHubCallback }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * 인증 컨텍스트를 사용하기 위한 커스텀 훅
 * 
 * 이 훅을 사용하면 어떤 컴포넌트에서든 인증 상태와 인증 관련 함수들에 접근할 수 있습니다.
 * 
 * @returns 인증 컨텍스트 값들 (auth, login, register, logout)
 */
export const useAuth = () => useContext(AuthContext);
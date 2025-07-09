/**
 * 런타임 설정 유틸리티
 * 
 * 애플리케이션의 런타임 설정을 관리하는 유틸리티입니다.
 * 서버에서 제공되는 동적 설정과 기본 경로 처리를 담당합니다.
 * 
 * 주요 기능:
 * - 윈도우 객체에서 런타임 설정 읽기
 * - 기본 경로(basePath) 정규화
 * - API URL 구성
 * - 서버로부터 설정 로드
 * - 다중 경로 시도를 통한 설정 발견
 */

import type { RuntimeConfig } from '../types/runtime';

/**
 * 윈도우 객체에서 런타임 설정을 가져옵니다
 * 
 * 서버에서 주입된 전역 설정 객체(__MCPHUB_CONFIG__)를 읽어옵니다.
 * 설정이 없는 경우 기본값을 반환합니다.
 * 
 * @returns {RuntimeConfig} 런타임 설정 객체
 * 
 * @example
 * ```typescript
 * const config = getRuntimeConfig();
 * console.log(`Base path: ${config.basePath}`);
 * console.log(`Version: ${config.version}`);
 * ```
 */
export const getRuntimeConfig = (): RuntimeConfig => {
  return (
    // 윈도우 객체에 저장된 설정이 있으면 사용하고, 없으면 기본값 사용
    window.__MCPHUB_CONFIG__ || {
      basePath: '',      // 기본 경로 (예: /app, /mcphub)
      version: 'dev',    // 애플리케이션 버전
      name: 'mcphub',    // 애플리케이션 이름
    }
  );
};

/**
 * 런타임 설정에서 기본 경로를 가져옵니다
 * 
 * 런타임 설정의 basePath를 정규화하여 반환합니다.
 * 경로가 비어있지 않고 /로 시작하지 않으면 /를 앞에 추가합니다.
 * 
 * @returns {string} 정규화된 기본 경로
 * 
 * @example
 * ```typescript
 * // basePath가 'admin'인 경우
 * const path = getBasePath(); // '/admin'
 * 
 * // basePath가 빈 문자열인 경우
 * const path = getBasePath(); // ''
 * ```
 */
export const getBasePath = (): string => {
  const config = getRuntimeConfig();
  const basePath = config.basePath || '';

  // 경로가 비어있지 않고 /로 시작하지 않으면 / 추가
  if (basePath && !basePath.startsWith('/')) {
    return '/' + basePath;
  }
  return basePath;
};

/**
 * 기본 경로와 /api 접두사를 포함한 API 기본 URL을 가져옵니다
 * 
 * 애플리케이션의 모든 API 엔드포인트에 사용할 기본 URL을 구성합니다.
 * 
 * @returns {string} 완전한 API 기본 URL
 * 
 * @example
 * ```typescript
 * // basePath가 '/admin'인 경우
 * const apiBaseUrl = getApiBaseUrl(); // '/admin/api'
 * 
 * // basePath가 빈 문자열인 경우
 * const apiBaseUrl = getApiBaseUrl(); // '/api'
 * ```
 */
export const getApiBaseUrl = (): string => {
  const basePath = getBasePath();
  // API 엔드포인트를 위해 기본 경로에 항상 /api 추가
  return basePath + '/api';
};

/**
 * 주어진 엔드포인트로 완전한 API URL을 구성합니다
 * 
 * 기본 API URL과 엔드포인트를 결합하여 완전한 URL을 생성합니다.
 * 엔드포인트가 /로 시작하지 않으면 자동으로 추가합니다.
 * 
 * @param {string} endpoint - API 엔드포인트
 * @returns {string} 완전한 API URL
 * 
 * @example
 * ```typescript
 * const loginUrl = getApiUrl('/auth/login');   // '/api/auth/login'
 * const userUrl = getApiUrl('user/profile');   // '/api/user/profile'
 * 
 * // basePath가 '/admin'인 경우
 * const serverUrl = getApiUrl('/servers');     // '/admin/api/servers'
 * ```
 */
export const getApiUrl = (endpoint: string): string => {
  const baseUrl = getApiBaseUrl();
  // 엔드포인트가 /로 시작하는지 확인
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return baseUrl + normalizedEndpoint;
};

/**
 * 서버에서 런타임 설정을 로드합니다
 * 
 * 다양한 가능한 경로에서 설정을 시도해서 로드합니다.
 * 현재 경로를 기반으로 적절한 설정 경로를 추론하고,
 * 여러 경로를 순차적으로 시도하여 설정을 찾습니다.
 * 
 * @returns {Promise<RuntimeConfig>} 로드된 런타임 설정 또는 기본값
 * 
 * @example
 * ```typescript
 * const config = await loadRuntimeConfig();
 * 
 * // 전역 설정 객체에 저장
 * window.__MCPHUB_CONFIG__ = config;
 * 
 * // 이후 getRuntimeConfig()로 접근 가능
 * const currentConfig = getRuntimeConfig();
 * ```
 */
export const loadRuntimeConfig = async (): Promise<RuntimeConfig> => {
  try {
    // 초기 설정 로드를 위해 현재 위치를 기반으로 올바른 경로 결정
    // 현재 위치에 따라 다양한 가능한 경로 시도
    const currentPath = window.location.pathname;
    
    // 시도할 수 있는 설정 경로들
    const possibleConfigPaths = [
      // 이미 하위 경로에 있는 경우, 해당 경로 사용 시도
      currentPath.replace(/\/[^/]*$/, '') + '/config',
      // 루트 설정 시도
      '/config',
      // 잠재적인 기본 경로들과 함께 시도
      ...(currentPath.includes('/')
        ? [currentPath.split('/')[1] ? `/${currentPath.split('/')[1]}/config` : '/config']
        : ['/config']),
    ];

    // 각 가능한 경로에서 설정 로드 시도
    for (const configPath of possibleConfigPaths) {
      try {
        const response = await fetch(configPath, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'Cache-Control': 'no-cache',  // 캐시하지 않음
          },
        });

        // 성공적으로 응답을 받았고 데이터가 있으면 반환
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            return data.data;
          }
        }
      } catch (error) {
        // 다음 경로로 계속 진행
        console.debug(`Failed to load config from ${configPath}:`, error);
      }
    }

    // 서버에서 설정을 로드할 수 없는 경우 기본값으로 폴백
    console.warn('Could not load runtime config from server, using defaults');
    return {
      basePath: '',
      version: 'dev',
      name: 'mcphub',
    };
  } catch (error) {
    // 예상치 못한 오류가 발생한 경우에도 기본 설정으로 폴백
    console.error('Error loading runtime config:', error);
    return {
      basePath: '',
      version: 'dev',
      name: 'mcphub',
    };
  }
};

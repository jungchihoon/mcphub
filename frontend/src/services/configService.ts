// API URL과 기본 경로 생성을 위한 유틸리티 함수들을 가져옵니다
import { getApiUrl, getBasePath } from '../utils/runtime';

/**
 * 시스템 설정 인터페이스
 * 
 * 애플리케이션의 다양한 설정들을 정의합니다.
 * 각 설정은 선택적(optional)으로 정의되어 있어서
 * 일부 설정만 있어도 동작할 수 있습니다.
 */
export interface SystemConfig {
  // 라우팅 관련 설정
  routing?: {
    enableGlobalRoute?: boolean;      // 글로벌 라우트 활성화 여부
    enableGroupNameRoute?: boolean;   // 그룹명 라우트 활성화 여부
    enableBearerAuth?: boolean;       // Bearer 인증 활성화 여부
    bearerAuthKey?: string;           // Bearer 인증 키
    skipAuth?: boolean;               // 인증 건너뛰기 여부
  };
  
  // 설치 관련 설정
  install?: {
    pythonIndexUrl?: string;          // Python 패키지 인덱스 URL
    npmRegistry?: string;             // NPM 레지스트리 URL
  };
  
  // 스마트 라우팅 관련 설정
  smartRouting?: {
    enabled?: boolean;                // 스마트 라우팅 활성화 여부
    dbUrl?: string;                   // 데이터베이스 URL
    openaiApiBaseUrl?: string;        // OpenAI API 기본 URL
    openaiApiKey?: string;            // OpenAI API 키
    openaiApiEmbeddingModel?: string; // OpenAI 임베딩 모델명
  };
}

/**
 * 공개 설정 응답 인터페이스
 * 
 * 인증 없이 접근 가능한 공개 설정의 응답 구조를 정의합니다.
 */
export interface PublicConfigResponse {
  success: boolean;                   // 요청 성공 여부
  data?: {
    skipAuth?: boolean;               // 인증 건너뛰기 설정
  };
  message?: string;                   // 응답 메시지
}

/**
 * 시스템 설정 응답 인터페이스
 * 
 * 시스템 설정 요청의 응답 구조를 정의합니다.
 */
export interface SystemConfigResponse {
  success: boolean;                   // 요청 성공 여부
  data?: {
    systemConfig?: SystemConfig;      // 시스템 설정 데이터
  };
  message?: string;                   // 응답 메시지
}

/**
 * 공개 설정을 가져오는 함수 (인증 없이)
 * 
 * 이 함수는 인증이 필요하지 않은 공개 설정을 가져옵니다.
 * 주로 인증 건너뛰기 설정을 확인하는 데 사용됩니다.
 * 
 * @returns Promise<{ skipAuth: boolean }> - 인증 건너뛰기 설정
 */
export const getPublicConfig = async (): Promise<{ skipAuth: boolean }> => {
  try {
    // 기본 경로를 가져와서 공개 설정 엔드포인트 구성
    const basePath = getBasePath();
    const response = await fetch(`${basePath}/public-config`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 응답이 성공적이면 설정 데이터 반환
    if (response.ok) {
      const data: PublicConfigResponse = await response.json();
      return { skipAuth: data.data?.skipAuth === true };
    }

    // 응답이 실패하면 기본값 반환
    return { skipAuth: false };
  } catch (error) {
    // 오류 발생 시 기본값 반환
    console.debug('Failed to get public config:', error);
    return { skipAuth: false };
  }
};

/**
 * 인증 없이 시스템 설정을 가져오는 함수
 * 
 * 이 함수는 먼저 인증 없이 시스템 설정을 가져오려고 시도합니다.
 * 만약 인증이 필요한 경우(대부분의 경우) null을 반환합니다.
 * 이는 애플리케이션 시작 시 인증 건너뛰기 설정을 확인하는 데 사용됩니다.
 * 
 * @returns Promise<SystemConfig | null> - 시스템 설정 또는 null
 */
export const getSystemConfigPublic = async (): Promise<SystemConfig | null> => {
  try {
    // 인증 없이 시스템 설정 요청
    const response = await fetch(getApiUrl('/settings'), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // 응답이 성공적이면 설정 데이터 반환
    if (response.ok) {
      const data: SystemConfigResponse = await response.json();
      return data.data?.systemConfig || null;
    }

    // 응답이 실패하면 null 반환
    return null;
  } catch (error) {
    // 오류 발생 시 null 반환
    console.debug('Failed to get system config without auth:', error);
    return null;
  }
};

/**
 * 인증을 건너뛰어야 하는지 확인하는 함수
 * 
 * 시스템 설정에서 인증 건너뛰기 설정을 확인합니다.
 * 이 함수는 애플리케이션 시작 시 인증 플로우를 결정하는 데 사용됩니다.
 * 
 * @returns Promise<boolean> - 인증을 건너뛰어야 하면 true, 아니면 false
 */
export const shouldSkipAuth = async (): Promise<boolean> => {
  try {
    // 공개 설정에서 인증 건너뛰기 설정 확인
    const config = await getPublicConfig();
    return config.skipAuth;
  } catch (error) {
    // 오류 발생 시 기본적으로 인증을 건너뛰지 않음
    console.debug('Failed to check skipAuth setting:', error);
    return false;
  }
};

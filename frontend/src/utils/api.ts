/**
 * API 유틸리티 함수 (레거시)
 * 
 * 적절한 기본 경로 지원으로 URL을 구성하는 API 유틸리티 함수들입니다.
 * 
 * ⚠️ 주의: 이 모듈은 더 이상 사용되지 않습니다.
 * 런타임 구성 지원을 위해 utils/runtime.ts의 함수들을 대신 사용하세요.
 * 
 * @deprecated 런타임 구성 지원을 위해 utils/runtime.ts의 함수들을 사용하세요
 */

// runtime.ts에서 실제 구현된 함수들을 가져옵니다
// 이 함수들은 런타임 설정을 지원하여 더 유연한 API URL 생성을 제공합니다
import { getApiBaseUrl as getRuntimeApiBaseUrl, getApiUrl as getRuntimeApiUrl } from './runtime';

/**
 * /api 접두사를 포함한 API 기본 URL을 가져옵니다
 * 
 * ⚠️ 이 함수는 더 이상 사용되지 않습니다.
 * 
 * @returns {string} 완전한 API 기본 URL
 * @deprecated utils/runtime.ts의 getApiBaseUrl을 대신 사용하세요
 * 
 * @example
 * ```typescript
 * // ❌ 더 이상 사용하지 마세요
 * const baseUrl = getApiBaseUrl();
 * 
 * // ✅ 대신 이것을 사용하세요
 * import { getApiBaseUrl } from './runtime';
 * const baseUrl = getApiBaseUrl();
 * ```
 */
export const getApiBaseUrl = (): string => {
  // 사용자에게 deprecated 경고를 표시합니다
  console.warn('getApiBaseUrl from utils/api.ts is deprecated, use utils/runtime.ts instead');
  
  // 실제로는 runtime.ts의 함수를 호출합니다
  return getRuntimeApiBaseUrl();
};

/**
 * 주어진 엔드포인트로 완전한 API URL을 구성합니다
 * 
 * ⚠️ 이 함수는 더 이상 사용되지 않습니다.
 * 
 * @param {string} endpoint - API 엔드포인트 (/로 시작해야 함, 예: '/auth/login')
 * @returns {string} 완전한 API URL
 * @deprecated utils/runtime.ts의 getApiUrl을 대신 사용하세요
 * 
 * @example
 * ```typescript
 * // ❌ 더 이상 사용하지 마세요
 * const loginUrl = getApiUrl('/auth/login');
 * 
 * // ✅ 대신 이것을 사용하세요
 * import { getApiUrl } from './runtime';
 * const loginUrl = getApiUrl('/auth/login');
 * ```
 */
export const getApiUrl = (endpoint: string): string => {
  // 사용자에게 deprecated 경고를 표시합니다
  console.warn('getApiUrl from utils/api.ts is deprecated, use utils/runtime.ts instead');
  
  // 실제로는 runtime.ts의 함수를 호출합니다
  return getRuntimeApiUrl(endpoint);
};

/**
 * 버전 관리 유틸리티 (프론트엔드)
 * 
 * NPM 레지스트리를 통해 최신 버전을 확인하고 버전을 비교하는 유틸리티입니다.
 * 애플리케이션의 업데이트 알림 기능을 위해 사용됩니다.
 * 
 * 주요 기능:
 * - NPM 레지스트리에서 최신 버전 조회
 * - 현재 버전과 최신 버전 비교
 * - 시맨틱 버전 파싱 및 비교
 * - 개발 버전('dev') 특수 처리
 */

/** NPM 레지스트리 URL */
const NPM_REGISTRY = 'https://registry.npmjs.org';
/** 패키지명 */
const PACKAGE_NAME = '@samanhappy/mcphub';

/**
 * NPM 레지스트리에서 최신 버전을 확인합니다
 * 
 * NPM 레지스트리 API를 호출하여 패키지의 최신 버전 정보를 가져옵니다.
 * 네트워크 오류나 API 오류 시 null을 반환합니다.
 * 
 * @returns {Promise<string | null>} 최신 버전 문자열 또는 null
 * 
 * @example
 * ```typescript
 * const latestVersion = await checkLatestVersion();
 * if (latestVersion) {
 *   console.log(`최신 버전: ${latestVersion}`);
 * } else {
 *   console.log('최신 버전을 확인할 수 없습니다');
 * }
 * ```
 */
export const checkLatestVersion = async (): Promise<string | null> => {
  try {
    // NPM 레지스트리 API 엔드포인트 호출
    // /latest 엔드포인트는 해당 패키지의 최신 버전 정보를 반환합니다
    const response = await fetch(`${NPM_REGISTRY}/${PACKAGE_NAME}/latest`);
    
    // HTTP 응답이 성공적이지 않으면 오류 발생
    if (!response.ok) {
      throw new Error(`Failed to fetch latest version: ${response.status}`);
    }
    
    // JSON 응답을 파싱하여 버전 정보 추출
    const data = await response.json();
    return data.version || null;
  } catch (error) {
    // 네트워크 오류나 기타 예외 상황 처리
    console.error('Error checking for latest version:', error);
    return null;
  }
};

/**
 * 두 버전을 비교합니다
 * 
 * 시맨틱 버전 형식(x.y.z)을 기반으로 두 버전을 비교합니다.
 * 개발 버전('dev')은 항상 오래된 것으로 처리됩니다.
 * 
 * @param {string} current - 현재 버전
 * @param {string} latest - 최신 버전
 * @returns {number} 비교 결과 (-1: current가 오래됨, 0: 같음, 1: current가 최신)
 * 
 * @example
 * ```typescript
 * compareVersions('1.0.0', '1.0.1') // 1 (현재가 최신)
 * compareVersions('1.0.1', '1.0.0') // -1 (현재가 오래됨)
 * compareVersions('1.0.0', '1.0.0') // 0 (같음)
 * compareVersions('dev', '1.0.0')   // -1 (dev는 항상 오래됨)
 * ```
 */
export const compareVersions = (current: string, latest: string): number => {
  // 개발 버전은 항상 오래된 것으로 처리
  if (current === 'dev') return -1;
  
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);

  // 주요, 부 버전, 패치 버전을 순서대로 비교
  for (let i = 0; i < 3; i++) {
    // 각 부분이 없으면 0으로 처리 (예: '1.2' → [1, 2, 0])
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;

    if (currentPart > latestPart) return -1; // 현재가 최신
    if (currentPart < latestPart) return 1;  // 현재가 오래됨
  }

  return 0; // 같음
};

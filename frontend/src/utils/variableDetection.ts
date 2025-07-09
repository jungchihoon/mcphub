/**
 * 변수 탐지 유틸리티
 * 
 * 서버 설정에서 환경 변수 패턴(${변수명})을 탐지하는 유틸리티입니다.
 * 중첩된 객체와 배열을 재귀적으로 탐색하여 모든 변수 참조를 찾습니다.
 * 
 * 주요 기능:
 * - ${변수명} 패턴 탐지
 * - 중첩된 객체/배열 재귀 탐색
 * - 중복 변수 제거
 * - 다양한 데이터 타입 지원
 */

/**
 * 서버 설정에서 ${} 변수를 탐지하는 유틸리티 함수
 * 
 * 주어진 객체를 재귀적으로 탐색하여 ${변수명} 형태의 환경 변수 참조를
 * 모두 찾아서 배열로 반환합니다. 중복된 변수명은 자동으로 제거됩니다.
 * 
 * @param {any} payload - 탐색할 데이터 (객체, 배열, 문자열 등)
 * @returns {string[]} 탐지된 변수명들의 배열 (중복 제거됨)
 * 
 * @example
 * ```typescript
 * const config = {
 *   host: "${DB_HOST}",
 *   port: "${DB_PORT}",
 *   auth: {
 *     username: "${DB_USER}",
 *     password: "${DB_PASSWORD}"
 *   },
 *   connections: ["${DB_HOST}:${DB_PORT}", "localhost:5432"]
 * };
 * 
 * const variables = detectVariables(config);
 * console.log(variables); // ["DB_HOST", "DB_PORT", "DB_USER", "DB_PASSWORD"]
 * ```
 */
export const detectVariables = (payload: any): string[] => {
  // 중복을 제거하기 위해 Set을 사용
  const variables = new Set<string>();
  
  // ${VARIABLE_NAME} 형태의 변수를 찾는 정규식
  // ${} 안의 내용을 캡처 그룹으로 추출
  const variableRegex = /\$\{([^}]+)\}/g;

  /**
   * 문자열에서 변수 패턴을 찾아 추가합니다
   * 
   * @param {string} str - 검사할 문자열
   */
  const checkString = (str: string) => {
    let match;
    // 정규식으로 모든 매치를 찾아서 변수명을 Set에 추가
    while ((match = variableRegex.exec(str)) !== null) {
      variables.add(match[1]);  // 캡처 그룹의 내용 (변수명)
    }
  };

  /**
   * 객체를 재귀적으로 탐색하여 변수를 찾습니다
   * 
   * @param {any} obj - 탐색할 객체
   * @param {string} path - 현재 경로 (디버깅용, 현재는 미사용)
   */
  const checkObject = (obj: any, path: string = '') => {
    if (typeof obj === 'string') {
      // 문자열인 경우 직접 변수 검사
      checkString(obj);
    } else if (Array.isArray(obj)) {
      // 배열인 경우 각 요소를 재귀적으로 검사
      obj.forEach((item, index) => checkObject(item, `${path}[${index}]`));
    } else if (obj && typeof obj === 'object') {
      // 객체인 경우 각 속성을 재귀적으로 검사
      Object.entries(obj).forEach(([key, value]) => {
        checkObject(value, path ? `${path}.${key}` : key);
      });
    }
  };

  // 최상위 객체부터 검사 시작
  checkObject(payload);
  
  // Set을 배열로 변환하여 반환
  return Array.from(variables);
};

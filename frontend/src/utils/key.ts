/**
 * 키 생성 유틸리티
 * 
 * 암호학적으로 안전한 랜덤 키를 생성하는 유틸리티 함수를 제공합니다.
 * Web Crypto API를 사용하여 보안성이 높은 랜덤 값을 생성합니다.
 * 
 * 주요 기능:
 * - 암호학적으로 안전한 랜덤 키 생성
 * - 사용자 정의 길이 지원
 * - 영숫자 문자 조합 사용
 * - 브라우저 네이티브 Crypto API 활용
 */

/**
 * 지정된 길이의 랜덤 키를 생성합니다
 * 
 * 이 함수는 Web Crypto API의 getRandomValues를 사용하여
 * 암호학적으로 안전한 랜덤 문자열을 생성합니다.
 * 영문 대소문자와 숫자로 구성된 62개 문자를 사용합니다.
 * 
 * @param {number} [length=32] - 생성할 키의 길이 (기본값: 32)
 * @returns {string} 생성된 랜덤 키 문자열
 * 
 * @example
 * ```typescript
 * // 기본 길이 (32자) 키 생성
 * const defaultKey = generateRandomKey();
 * console.log(defaultKey); // "a1B2c3D4e5F6g7H8i9J0k1L2m3N4o5P6"
 * 
 * // 사용자 정의 길이 키 생성
 * const shortKey = generateRandomKey(16);
 * console.log(shortKey); // "a1B2c3D4e5F6g7H8"
 * 
 * // API 키, 세션 ID 등에 활용
 * const apiKey = generateRandomKey(64);
 * const sessionId = generateRandomKey(128);
 * ```
 */
export function generateRandomKey(length: number = 32): string {
  // 사용할 문자 집합 정의
  // 대문자, 소문자, 숫자를 포함하여 다양한 문자 조합 가능
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
  // 암호학적으로 안전한 랜덤 바이트 배열 생성
  // Uint8Array는 0-255 범위의 부호 없는 8비트 정수 배열입니다
  const array = new Uint8Array(length);
  
  // 웹 암호화 API를 사용하여 암호학적으로 안전한 랜덤 값 생성
  // 이 함수는 운영체제의 엔트로피 소스를 사용하여 예측 불가능한 값을 생성합니다
  crypto.getRandomValues(array);
  
  // 바이트 배열을 문자열로 변환
  return Array.from(array)
    // 각 바이트 값을 문자 집합의 인덱스로 변환
    // 모듈로 연산(%)을 사용하여 0-61 범위로 매핑
    .map((x) => characters.charAt(x % characters.length))
    // 모든 문자를 하나의 문자열로 결합
    .join('');
}

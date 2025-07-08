/**
 * Vite 환경 변수 타입 정의 파일
 * 
 * 이 파일은 Vite 빌드 도구에서 제공하는 환경 변수들의 TypeScript 타입을 정의합니다.
 * Vite는 빌드 시에 환경 변수를 주입하고, 이 파일을 통해 TypeScript가 해당 변수들을 인식할 수 있습니다.
 */

// Vite 클라이언트 타입 참조
// 이 참조를 통해 Vite에서 제공하는 import.meta.env 등의 타입을 사용할 수 있습니다
/// <reference types="vite/client" />

/**
 * ImportMeta 인터페이스 확장
 * 
 * import.meta.env 객체에 추가할 커스텀 환경 변수들의 타입을 정의합니다.
 * 이렇게 정의하면 TypeScript에서 환경 변수에 안전하게 접근할 수 있습니다.
 */
interface ImportMeta {
  readonly env: {
    // 패키지 버전 정보
    // 빌드 시 package.json의 version이 주입됩니다
    readonly PACKAGE_VERSION: string;
    
    // 추가 커스텀 환경 변수들을 여기에 정의할 수 있습니다
    // 예: readonly API_URL: string;
    [key: string]: any;
  };
}

/**
 * 런타임 설정 타입 정의
 * 
 * 이 파일은 애플리케이션 실행 중에 동적으로 로드되는 설정의 타입을 정의합니다.
 * 런타임 설정은 서버에서 로드되어 윈도우 객체에 저장되며,
 * 애플리케이션 전체에서 사용할 수 있는 전역 설정입니다.
 */

/**
 * 런타임 설정 인터페이스
 * 
 * 애플리케이션이 시작될 때 서버에서 로드되는 설정의 구조를 정의합니다.
 * 이 설정들은 빌드 시점이 아닌 실행 시점에 결정되므로,
 * 다양한 배포 환경에서 유연하게 설정을 변경할 수 있습니다.
 */
export interface RuntimeConfig {
  basePath: string;  // 애플리케이션의 기본 경로 (예: '/app', '/mcphub')
  version: string;   // 애플리케이션 버전 (예: '1.0.0', 'dev')
  name: string;      // 애플리케이션 이름 (예: 'mcphub')
}

/**
 * 전역 Window 인터페이스 확장
 * 
 * TypeScript에서 윈도우 객체에 커스텀 속성을 추가할 때 사용합니다.
 * 이렇게 하면 window.__MCPHUB_CONFIG__에 타입 안전하게 접근할 수 있습니다.
 */
declare global {
  interface Window {
    // 런타임 설정을 저장하는 전역 속성
    // 애플리케이션 시작 시 서버에서 로드된 설정이 여기에 저장됩니다
    __MCPHUB_CONFIG__?: RuntimeConfig;
  }
}

// 이 파일이 모듈로 인식되도록 빈 export 추가
export {};

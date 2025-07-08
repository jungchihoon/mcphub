// i18next: JavaScript 애플리케이션을 위한 국제화(i18n) 라이브러리
// 웹 애플리케이션에서 여러 언어를 지원하기 위한 핵심 라이브러리입니다
import i18n from 'i18next';

// react-i18next: React 애플리케이션에서 i18next를 사용하기 위한 React 바인딩
// React 컴포넌트에서 번역 함수를 쉽게 사용할 수 있게 해줍니다
import { initReactI18next } from 'react-i18next';

// i18next-browser-languagedetector: 브라우저에서 사용자의 언어를 자동으로 감지하는 플러그인
// 사용자의 브라우저 설정, localStorage, 쿠키 등을 확인하여 적절한 언어를 선택합니다
import LanguageDetector from 'i18next-browser-languagedetector';

// 번역 파일들을 가져옵니다
// 각 언어별로 JSON 파일에 번역 키와 값들이 저장되어 있습니다
import enTranslation from './locales/en.json';  // 영어 번역

/**
 * i18n 설정 및 초기화
 * 
 * 이 설정은 애플리케이션의 다국어 지원을 위한 핵심 설정입니다.
 * 사용자의 언어를 자동으로 감지하고, 적절한 번역을 제공합니다.
 */
i18n
  // 1. 사용자 언어 자동 감지 플러그인 활성화
  // 브라우저 설정, localStorage, 쿠키 등을 확인하여 사용자의 선호 언어를 감지합니다
  .use(LanguageDetector)
  
  // 2. React 애플리케이션에서 사용할 수 있도록 React 바인딩 추가
  // 이 플러그인을 통해 useTranslation 훅을 사용할 수 있습니다
  .use(initReactI18next)
  
  // 3. i18next 초기화 및 설정
  .init({
    // 번역 리소스 정의
    // 각 언어별로 번역 파일을 연결합니다
    resources: {
      en: {
        translation: enTranslation  // 영어 번역 데이터
      }
    },
    
    // 기본 언어 설정 (번역이 없을 때 사용할 언어)
    fallbackLng: 'en',
    
    // 개발 모드에서만 디버그 정보 출력
    // 번역 키가 없거나 오류가 있을 때 콘솔에 경고를 표시합니다
    debug: process.env.NODE_ENV === 'development',
    
    // 기본 네임스페이스 설정
    // 모든 번역이 'translation' 네임스페이스에 속합니다
    defaultNS: 'translation',
    
    // 보간(interpolation) 설정
    // 번역 문자열에서 변수를 치환하는 방식 설정
    interpolation: {
      escapeValue: false, // React가 이미 XSS 공격을 방지하므로 이스케이프하지 않음
    },

    // 언어 감지 설정
    detection: {
      // 언어 감지 우선순위 설정
      // 1. localStorage: 사용자가 이전에 선택한 언어 (가장 높은 우선순위)
      // 2. cookie: 쿠키에 저장된 언어 설정
      // 3. htmlTag: HTML lang 속성
      // 4. navigator: 브라우저의 언어 설정
      order: ['localStorage', 'cookie', 'htmlTag', 'navigator'],
      
      // 언어 설정을 캐시할 위치
      // 사용자가 언어를 선택하면 localStorage와 쿠키에 저장됩니다
      caches: ['localStorage', 'cookie'],
    }
  });

// 설정된 i18n 인스턴스를 내보냅니다
// 다른 파일에서 이 인스턴스를 import하여 사용할 수 있습니다
export default i18n;
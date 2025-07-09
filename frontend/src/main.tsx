// React 라이브러리와 ReactDOM을 가져옵니다
// React: UI 컴포넌트를 만들기 위한 핵심 라이브러리
// ReactDOM: React 컴포넌트를 실제 웹페이지에 렌더링하는 라이브러리
import React from 'react';
import ReactDOM from 'react-dom/client';

// 메인 App 컴포넌트를 가져옵니다 (애플리케이션의 루트 컴포넌트)
import App from './App';

// 전역 CSS 스타일을 가져옵니다 (Tailwind CSS 등)
import './index.css';

// 다국어 지원(i18n) 설정을 가져옵니다
import './i18n';

// 런타임 설정을 로드하는 유틸리티 함수를 가져옵니다
import { loadRuntimeConfig } from './utils/runtime';

/**
 * 애플리케이션을 초기화하는 함수
 * React 앱을 시작하기 전에 필요한 설정들을 로드합니다
 */
async function initializeApp() {
  try {
    console.log('Loading runtime configuration...');
    
    // 서버에서 런타임 설정을 가져옵니다 (API URL, 버전 등)
    const config = await loadRuntimeConfig();
    console.log('Runtime configuration loaded:', config);

    // 설정을 전역 window 객체에 저장합니다
    // 이렇게 하면 애플리케이션 어디서든 설정에 접근할 수 있습니다
    window.__MCPHUB_CONFIG__ = config;

    // React 앱을 시작합니다
    // document.getElementById('root')는 HTML에서 React 앱이 마운트될 요소입니다
    // React.StrictMode는 개발 모드에서 잠재적인 문제를 찾아내는 도구입니다
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  } catch (error) {
    // 설정 로드에 실패한 경우의 처리
    console.error('Failed to initialize app:', error);

    // 폴백: 기본 설정으로 앱을 시작합니다
    console.log('Starting app with default configuration...');
    window.__MCPHUB_CONFIG__ = {
      basePath: '',        // 기본 경로
      version: 'dev',      // 개발 버전
      name: 'mcphub',      // 앱 이름
    };

    // 기본 설정으로도 React 앱을 시작합니다
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );
  }
}

// 애플리케이션 초기화를 시작합니다
// 이 파일이 로드되면 즉시 실행됩니다
initializeApp();
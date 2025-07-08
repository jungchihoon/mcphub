/**
 * 헤더 컴포넌트
 * 
 * 애플리케이션의 최상단 헤더 영역을 담당하는 컴포넌트입니다.
 * 사이드바 토글, 앱 제목, 테마 스위치, 외부 링크 등을 포함합니다.
 * 
 * 주요 기능:
 * - 사이드바 토글 버튼
 * - 애플리케이션 제목 표시
 * - 버전 정보 표시
 * - GitHub 링크
 * - 언어별 소셜 링크 (중국어: WeChat, 기타: Discord)
 * - 후원 다이얼로그
 * - 테마 스위치
 */

import React, { useState } from 'react';

// 다국어 지원을 위한 react-i18next 라이브러리를 가져옵니다
// useTranslation: 번역 함수와 현재 언어 정보를 제공하는 훅
import { useTranslation } from 'react-i18next';
import ThemeSwitch from '@/components/ui/ThemeSwitch';

/**
 * Header 컴포넌트의 Props 인터페이스
 */
interface HeaderProps {
  /** 사이드바 토글 핸들러 */
  onToggleSidebar: () => void;
}

/**
 * 헤더 컴포넌트
 * 
 * 애플리케이션의 최상단 헤더를 렌더링하며, 네비게이션 컨트롤과
 * 각종 유틸리티 버튼들을 제공합니다.
 * 
 * @param {HeaderProps} props - 컴포넌트 props
 * @param {() => void} props.onToggleSidebar - 사이드바 토글 핸들러
 * @returns {JSX.Element} 헤더 컴포넌트
 */
const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  // 다국어 지원 훅 사용
  // t: 번역 함수 (예: t('app.title') → "MCP Hub")
  // i18n: 현재 언어 정보 (예: i18n.language → "ko", "en", "zh")
  const { t, i18n } = useTranslation();
  
  // 다이얼로그 열림/닫힘 상태 관리
  // useState는 컴포넌트의 상태를 관리하는 React 훅입니다
  const [sponsorDialogOpen, setSponsorDialogOpen] = useState(false);  // 스폰서 다이얼로그 상태
  const [wechatDialogOpen, setWechatDialogOpen] = useState(false);    // WeChat 다이얼로그 상태

  return (
    // 헤더 컨테이너
    // bg-white dark:bg-gray-800: 라이트/다크 테마에 따른 배경색
    // shadow-sm: 약간의 그림자 효과
    // z-10: 다른 요소들보다 위에 표시되도록 z-index 설정
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
      {/* 헤더 내용을 담는 컨테이너 */}
      {/* flex justify-between: 좌우 끝에 요소들을 배치 */}
      {/* items-center: 세로 중앙 정렬 */}
      {/* px-3 py-3: 좌우 패딩 3, 상하 패딩 3 */}
      <div className="flex justify-between items-center px-3 py-3">
        {/* 왼쪽 영역: 사이드바 토글 버튼과 제목 */}
        <div className="flex items-center">
          {/* 사이드바 토글 버튼 */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label={t('app.toggleSidebar')}
          >
            {/* 햄버거 메뉴 아이콘 (SVG) */}
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 애플리케이션 제목 */}
          <h1 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">{t('app.title')}</h1>
        </div>

        {/* 테마 스위치 및 버전 정보 */}
        <div className="flex items-center space-x-4">
          {/* 버전 정보 표시 */}
          {/* <span className="text-sm text-gray-500 dark:text-gray-400">
            {import.meta.env.PACKAGE_VERSION === 'dev'
              ? import.meta.env.PACKAGE_VERSION
              : `v${import.meta.env.PACKAGE_VERSION}`}
          </span> */}
          
          {/* 테마 스위치 */}
          <ThemeSwitch />
        </div>
      </div>
     
    </header>
  );
};

// Header 컴포넌트를 다른 파일에서 사용할 수 있도록 내보냅니다
export default Header;
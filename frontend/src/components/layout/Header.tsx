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

import React from 'react';
import { useTranslation } from 'react-i18next';
import ThemeSwitch from '@/components/ui/ThemeSwitch';
import UserProfileMenu from '@/components/ui/UserProfileMenu';

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
  const { t } = useTranslation();
  
  // package.json에서 가져온 애플리케이션 버전
  const appVersion = import.meta.env.PACKAGE_VERSION as string;

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
      <div className="flex justify-between items-center px-3 py-3">
        <div className="flex items-center">
          {/* 사이드바 토글 버튼 */}
          <button
            onClick={onToggleSidebar}
            className="p-2 rounded-md text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none"
            aria-label={t('app.toggleSidebar')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* 애플리케이션 제목 */}
          <h1 className="ml-4 text-xl font-bold text-gray-900 dark:text-white">{t('app.title')}</h1>
        </div>

        {/* 우측 상단 영역: 테마 스위치와 사용자 메뉴 */}
        <div className="flex items-center space-x-4">
          {/* 테마 스위치 */}
          <ThemeSwitch />
          
          {/* 사용자 프로필 메뉴 */}
          <div className="min-w-0">
            <UserProfileMenu collapsed={false} version={appVersion} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
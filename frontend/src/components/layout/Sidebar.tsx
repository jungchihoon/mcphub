/**
 * 사이드바 컴포넌트
 * 
 * 애플리케이션의 주요 네비게이션을 담당하는 사이드바 컴포넌트입니다.
 * 접을 수 있는 네비게이션 메뉴와 사용자 프로필 메뉴를 제공합니다.
 * 
 * 주요 기능:
 * - 접을 수 있는 네비게이션 메뉴
 * - 대시보드, 서버, 그룹, 마켓, 로그 페이지 링크
 * - 활성 페이지 하이라이트
 * - 사용자 프로필 메뉴
 * - 버전 정보 표시
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import AdminOnly from '@/components/AdminOnly';

/**
 * Sidebar 컴포넌트의 Props 인터페이스
 */
interface SidebarProps {
  /** 사이드바 접힘 상태 */
  collapsed: boolean;
}

/**
 * 메뉴 아이템 인터페이스
 */
interface MenuItem {
  /** 라우트 경로 */
  path: string;
  /** 메뉴 라벨 */
  label: string;
  /** 메뉴 아이콘 */
  icon: React.ReactNode;
}

/**
 * 사이드바 컴포넌트
 * 
 * 애플리케이션의 주요 네비게이션을 제공하는 사이드바를 렌더링합니다.
 * 접을 수 있는 구조로 되어 있으며, 각 페이지로의 링크를 제공합니다.
 * 
 * @param {SidebarProps} props - 컴포넌트 props
 * @param {boolean} props.collapsed - 사이드바 접힘 상태
 * @returns {JSX.Element} 사이드바 컴포넌트
 */
const Sidebar: React.FC<SidebarProps> = ({ collapsed }) => {
  const { t } = useTranslation();
  const { auth } = useAuth();

  // 일반 사용자용 메뉴 아이템
  const userMenuItems: MenuItem[] = [
    {
      path: '/',
      label: t('nav.dashboard'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" />
          <path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" />
        </svg>
      ),
    },
    {
      path: '/groups',
      label: t('nav.groups'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
      ),
    },
    {
      path: '/market',
      label: t('nav.market'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3zM16 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM6.5 18a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        </svg>
      ),
    },
    {
      path: '/keys',
      label: 'MCPHub Keys',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  // 관리자 전용 메뉴 아이템
  const adminMenuItems: MenuItem[] = [
    {
      path: '/servers',
      label: t('nav.servers'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M2 5a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V5zm14 1a1 1 0 11-2 0 1 1 0 012 0zM2 13a2 2 0 012-2h12a2 2 0 012 2v2a2 2 0 01-2 2H4a2 2 0 01-2-2v-2zm14 1a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      path: '/users',
      label: '사용자 관리',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      ),
    },
    {
      path: '/logs',
      label: t('nav.logs'),
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];

  return (
    <aside
      className={`bg-white dark:bg-gray-800 shadow-sm transition-all duration-300 ease-in-out flex flex-col h-full relative ${collapsed ? 'w-16' : 'w-64'
        }`}
    >
      {/* 네비게이션 영역 */}
      <div className="overflow-y-auto flex-grow">
        <nav className="p-3 space-y-1">
          {/* 일반 사용자 메뉴 */}
          {userMenuItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center px-2.5 py-2 rounded-lg transition-colors duration-200
         ${isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-100'}`
              }
              end={item.path === '/'}
            >
              <span className="flex-shrink-0">{item.icon}</span>
              {!collapsed && <span className="ml-3">{item.label}</span>}
            </NavLink>
          ))}

          {/* 관리자 전용 메뉴 */}
          <AdminOnly>
            {!collapsed && (
              <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="px-2.5 mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  관리자 전용
                </p>
              </div>
            )}
            {adminMenuItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-2.5 py-2 rounded-lg transition-colors duration-200
           ${isActive
                    ? 'bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-100'}`
                }
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="ml-3">{item.label}</span>}
                {!collapsed && (
                  <span className="ml-auto">
                    <svg className="w-3 h-3 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </NavLink>
            ))}
          </AdminOnly>
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
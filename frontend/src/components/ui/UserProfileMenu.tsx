/**
 * 사용자 프로필 메뉴 컴포넌트
 * 
 * 사용자 프로필과 관련된 메뉴를 제공하는 드롭다운 컴포넌트입니다.
 * 설정, 정보, 로그아웃 등의 기능에 접근할 수 있습니다.
 * 
 * 주요 기능:
 * - 사용자 정보 표시
 * - 설정 페이지 이동
 * - 앱 정보 다이얼로그
 * - 새 버전 알림
 * - 로그아웃 기능
 * - 사이드바 축소 상태 지원
 * - 외부 클릭 시 자동 닫기
 */

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { User, Settings, LogOut, Info } from 'lucide-react';
import AboutDialog from './AboutDialog';
import { checkLatestVersion, compareVersions } from '@/utils/version';

/**
 * UserProfileMenu 컴포넌트의 Props 인터페이스
 */
interface UserProfileMenuProps {
  /** 사이드바 축소 상태 */
  collapsed: boolean;
  /** 현재 애플리케이션 버전 */
  version: string;
}

/**
 * 사용자 프로필 메뉴 컴포넌트
 * 
 * 사용자 프로필과 관련된 드롭다운 메뉴를 제공합니다.
 * 사이드바의 하단에 위치하며, 다양한 사용자 액션을 제공합니다.
 * 
 * @param {UserProfileMenuProps} props - 컴포넌트 props
 * @param {boolean} props.collapsed - 사이드바 축소 상태
 * @param {string} props.version - 현재 애플리케이션 버전
 * @returns {JSX.Element} 사용자 프로필 메뉴 컴포넌트
 */
const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ collapsed, version }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { auth, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [showNewVersionInfo, setShowNewVersionInfo] = useState(false);
  const [showAboutDialog, setShowAboutDialog] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 로그인 시 및 컴포넌트 마운트 시 새 버전 확인
  useEffect(() => {
    /**
     * 새 버전 확인 함수
     * 
     * GitHub API를 통해 최신 버전을 확인하고 현재 버전과 비교합니다.
     */
    const checkForNewVersion = async () => {
      try {
        const latestVersion = await checkLatestVersion();
        if (latestVersion) {
          setShowNewVersionInfo(compareVersions(version, latestVersion) > 0);
        }
      } catch (error) {
        console.error('Error checking for new version:', error);
      }
    };

    checkForNewVersion();
  }, [version]);

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    /**
     * 외부 클릭 핸들러
     * 
     * @param {MouseEvent} event - 마우스 클릭 이벤트
     */
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  /**
   * 설정 페이지 이동 핸들러
   */
  const handleSettingsClick = () => {
    navigate('/settings');
    setIsOpen(false);
  };

  /**
   * 로그아웃 핸들러
   */
  const handleLogoutClick = () => {
    logout();
    navigate('/login');
  };

  /**
   * 앱 정보 다이얼로그 열기 핸들러
   */
  const handleAboutClick = () => {
    setShowAboutDialog(true);
    setIsOpen(false);
  };

  return (
    <div ref={menuRef} className="relative">
      {/* 프로필 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex ${collapsed ? 'justify-center' : 'items-center'} w-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors rounded-md ${isOpen ? 'bg-gray-100 dark:bg-gray-700' : ''
          }`}
      >
        {/* 사용자 아바타 */}
        <div className="flex-shrink-0 relative">
          <div className="w-5 h-5 flex items-center justify-center rounded-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
            <User className="h-4 w-4 text-gray-700 dark:text-gray-300" />
          </div>
          {/* 새 버전 알림 표시 */}
          {showNewVersionInfo && (
            <span className="absolute -top-1 -right-1 block w-2 h-2 bg-red-500 rounded-full"></span>
          )}
        </div>
        
        {/* 사용자 정보 (사이드바 확장 시에만 표시) */}
        {!collapsed && (
          <div className="ml-3 flex flex-col items-start">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {auth.user?.username || t('auth.user')}
            </span>
            {auth.user?.isAdmin && (
              <span className="text-xs text-indigo-600 dark:text-indigo-400">
                관리자
              </span>
            )}
          </div>
        )}
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div className={`absolute ${collapsed ? 'top-0 transform -translate-y-full left-0' : 'top-full mt-2 right-0'} w-full min-w-max bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 z-50`}>
          {/* 설정 메뉴 */}
          <button
            onClick={handleSettingsClick}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <Settings className="h-4 w-4 mr-2" />
            {t('nav.settings')}
          </button>
          
          {/* 앱 정보 메뉴 */}
          <button
            onClick={handleAboutClick}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 relative"
          >
            <Info className="h-4 w-4 mr-2" />
            {t('about.title')}
            {/* 새 버전 알림 표시 */}
            {showNewVersionInfo && (
              <span className="absolute top-2 right-4 block w-2 h-2 bg-red-500 rounded-full"></span>
            )}
          </button>
          
          {/* 로그아웃 메뉴 */}
          <button
            onClick={handleLogoutClick}
            className="flex items-center w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('app.logout')}
          </button>
        </div>
      )}

      {/* 앱 정보 다이얼로그 */}
      <AboutDialog
        isOpen={showAboutDialog}
        onClose={() => setShowAboutDialog(false)}
        version={version}
      />
    </div>
  );
};

export default UserProfileMenu;

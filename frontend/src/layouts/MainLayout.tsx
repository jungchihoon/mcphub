// React 라이브러리를 가져옵니다
import React from 'react';

// React Router의 Outlet 컴포넌트를 가져옵니다
// Outlet은 중첩된 라우트에서 자식 컴포넌트를 렌더링하는 위치를 나타냅니다
import { Outlet } from 'react-router-dom';

// 레이아웃 관련 컴포넌트들을 가져옵니다
import Header from '@/components/layout/Header';    // 상단 헤더 (네비게이션, 제목 등)
import Sidebar from '@/components/layout/Sidebar';  // 사이드바 (메뉴 목록)
import Content from '@/components/layout/Content';  // 메인 콘텐츠 영역

/**
 * MainLayout 컴포넌트: 애플리케이션의 메인 레이아웃 구조
 * 
 * 이 컴포넌트는 모든 보호된 페이지(로그인이 필요한 페이지)에 공통으로 적용되는
 * 레이아웃을 제공합니다. 다음과 같은 구조를 가집니다:
 * 
 * ┌─────────────────────────────────────┐
 * │              Header                 │ ← 상단 헤더 (제목, 네비게이션, 테마 스위치 등)
 * ├─────────────┬───────────────────────┤
 * │             │                       │
 * │   Sidebar   │       Content         │ ← 사이드바와 메인 콘텐츠 영역
 * │             │                       │
 * │             │                       │
 * └─────────────┴───────────────────────┘
 */
const MainLayout: React.FC = () => {
  // 사이드바 펼침/접힘 상태 제어
  // useState는 React의 상태 관리 훅입니다
  // sidebarCollapsed: 현재 사이드바가 접혀있는지 여부 (true=접힘, false=펼침)
  // setSidebarCollapsed: 사이드바 상태를 변경하는 함수
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false);

  /**
   * 사이드바 토글 함수
   * 현재 상태의 반대값으로 사이드바 상태를 변경합니다
   */
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    // 전체 레이아웃 컨테이너
    // flex flex-col: 세로 방향으로 요소들을 배치
    // h-screen: 화면 전체 높이 사용
    // bg-gray-100 dark:bg-gray-900: 라이트/다크 테마에 따른 배경색
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900">
      {/* 상단 네비게이션 */}
      {/* onToggleSidebar: 헤더에서 사이드바 토글 버튼을 클릭했을 때 호출될 함수 */}
      <Header onToggleSidebar={toggleSidebar} />
      
      {/* 메인 콘텐츠 영역 (헤더 아래 부분) */}
      {/* flex flex-1: 남은 공간을 모두 차지하도록 설정 */}
      {/* overflow-hidden: 내용이 넘칠 때 스크롤바 숨김 */}
      <div className="flex flex-1 overflow-hidden">
        {/* 사이드 네비게이션 */}
        {/* collapsed: 사이드바의 펼침/접힘 상태를 전달 */}
        <Sidebar collapsed={sidebarCollapsed} />
        
        {/* 메인 콘텐츠 영역 */}
        {/* Content 컴포넌트 안에 Outlet이 있어서, 현재 라우트에 해당하는 페이지가 여기에 렌더링됩니다 */}
        <Content>
          <Outlet />
        </Content>
      </div>
    </div>
  );
};

// MainLayout 컴포넌트를 다른 파일에서 사용할 수 있도록 내보냅니다
export default MainLayout;
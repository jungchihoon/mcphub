// MCPHub 서버 관리 페이지
// 이 페이지는 서버 목록 조회, 추가, 수정, 삭제, 토글, 새로고침, DXT 업로드 등 서버 관리 기능을 제공합니다.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Server } from '@/types';
import ServerCard from '@/components/ServerCard';
import AddServerForm from '@/components/AddServerForm';
import EditServerForm from '@/components/EditServerForm';
import { useServerData } from '@/hooks/useServerData';
import DxtUploadForm from '@/components/DxtUploadForm';

// ServersPage 컴포넌트: MCP 서버 관리 메인 페이지
const ServersPage: React.FC = () => {
  // 다국어 번역 훅
  const { t } = useTranslation();
  // 페이지 이동을 위한 navigate 함수
  const navigate = useNavigate();
  // 서버 데이터 및 관련 함수들을 커스텀 훅에서 가져옴
  const {
    servers,           // 서버 목록
    error,             // 에러 메시지
    setError,          // 에러 상태 변경 함수
    isLoading,         // 로딩 상태
    handleServerAdd,   // 서버 추가 함수
    handleServerEdit,  // 서버 편집(상세 정보 조회) 함수
    handleServerRemove,// 서버 삭제 함수
    handleServerToggle,// 서버 활성/비활성 토글 함수
    triggerRefresh     // 서버 목록 새로고침 함수
  } = useServerData();
  // 편집 중인 서버 상태
  const [editingServer, setEditingServer] = useState<Server | null>(null);
  // 새로고침 버튼 로딩 상태
  const [isRefreshing, setIsRefreshing] = useState(false);
  // DXT 업로드 폼 표시 여부
  const [showDxtUpload, setShowDxtUpload] = useState(false);

  // 서버 편집 버튼 클릭 시: 서버 상세 정보 조회 후 편집 폼 오픈
  const handleEditClick = async (server: Server) => {
    const fullServerData = await handleServerEdit(server);
    if (fullServerData) {
      setEditingServer(fullServerData);
    }
  };

  // 서버 편집 완료 시: 편집 폼 닫고 서버 목록 새로고침
  const handleEditComplete = () => {
    setEditingServer(null);
    triggerRefresh();
  };

  // 새로고침 버튼 클릭 시: 서버 목록 새로고침 + 스피너 잠깐 표시
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      triggerRefresh();
      // 스피너가 잠깐 보이도록 약간의 딜레이 추가
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setIsRefreshing(false);
    }
  };

  // DXT 업로드 성공 시: 업로드 폼 닫고 서버 목록 새로고침
  const handleDxtUploadSuccess = (_serverConfig: any) => {
    setShowDxtUpload(false);
    triggerRefresh();
  };

  // 실제 렌더링 영역
  return (
    <div>
      {/* 상단: 페이지 제목 + 우측 버튼들(마켓 이동, 서버 추가, DXT 업로드, 새로고침) */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.servers.title')}</h1>
        <div className="flex space-x-4">
          {/* 마켓플레이스 이동 버튼 */}
          <button
            onClick={() => navigate('/market')}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center btn-primary transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M3 1a1 1 0 000 2h1.22l.305 1.222a.997.997 0 00.01.042l1.358 5.43-.893.892C3.74 11.846 4.632 14 6.414 14H15a1 1 0 000-2H6.414l1-1H14a1 1 0 00.894-.553l3-6A1 1 0 0017 3H6.28l-.31-1.243A1 1 0 005 1H3z" />
            </svg>
            {t('nav.market')}
          </button>
          {/* 서버 추가 폼(모달) 오픈 버튼 */}
          <AddServerForm onAdd={handleServerAdd} />
          {/* DXT 업로드 폼(모달) 오픈 버튼 */}
          <button
            onClick={() => setShowDxtUpload(true)}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center btn-primary transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.413V13H5.5z" />
            </svg>
            {t('dxt.upload')}
          </button>
          {/* 서버 목록 새로고침 버튼 */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center btn-primary transition-all duration-200 ${isRefreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {/* 로딩 중이면 스피너, 아니면 새로고침 아이콘 */}
            {isRefreshing ? (
              <svg className="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            )}
            {t('common.refresh')}
          </button>
        </div>
      </div>

      {/* 에러 메시지 표시 영역 */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm error-box">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-red-600 text-lg font-medium">{t('app.error')}</h3>
              <p className="text-gray-600 mt-1">{error}</p>
            </div>
            {/* 에러 닫기 버튼 */}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-gray-500 hover:text-gray-700 transition-colors duration-200 btn-secondary"
              aria-label={t('app.closeButton')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 서버 목록 로딩/빈 상태/정상 표시 */}
      {isLoading ? (
        // 로딩 중: 스피너 표시
        <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center loading-container">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">{t('app.loading')}</p>
          </div>
        </div>
      ) : servers.length === 0 ? (
        // 서버가 하나도 없을 때: 빈 상태 메시지
        <div className="bg-white shadow rounded-lg p-6 empty-state">
          <p className="text-gray-600">{t('app.noServers')}</p>
        </div>
      ) : (
        // 서버 목록 표시: 각 서버를 카드 형태로 렌더링
        <div className="space-y-6">
          {servers.map((server, index) => (
            <ServerCard
              key={index}
              server={server}
              onRemove={handleServerRemove}
              onEdit={handleEditClick}
              onToggle={handleServerToggle}
              onRefresh={triggerRefresh}
            />
          ))}
        </div>
      )}

      {/* 서버 편집 폼(모달) */}
      {editingServer && (
        <EditServerForm
          server={editingServer}
          onEdit={handleEditComplete}
          onCancel={() => setEditingServer(null)}
        />
      )}

      {/* DXT 업로드 폼(모달) */}
      {showDxtUpload && (
        <DxtUploadForm
          onSuccess={handleDxtUploadSuccess}
          onCancel={() => setShowDxtUpload(false)}
        />
      )}
    </div>
  );
};

export default ServersPage;
// MCPHub 대시보드 페이지
// 이 페이지는 서버 통계(전체/온라인/오프라인/연결중), 최근 서버 목록 등 MCPHub의 대시보드 정보를 제공합니다.
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useServerData } from '@/hooks/useServerData';

/**
 * DashboardPage 컴포넌트: MCPHub 대시보드 메인 페이지
 * - 서버 상태별 통계(전체, 온라인, 오프라인, 연결중) 카드
 * - 최근 서버 목록 테이블
 * - 로딩/에러/빈 상태 처리
 */
const DashboardPage: React.FC = () => {
  // 다국어 번역 훅
  const { t } = useTranslation();
  // 서버 데이터 및 관련 함수들을 커스텀 훅에서 가져옴
  const { servers, error, setError, isLoading } = useServerData();

  /**
   * 서버 통계 계산
   * - 전체, 온라인, 오프라인, 연결중 서버 수를 계산하여 카드에 표시
   */
  const serverStats = {
    total: servers.length,                                    // 전체 서버 수
    online: servers.filter(server => server.status === 'connected').length,      // 온라인 서버 수
    offline: servers.filter(server => server.status === 'disconnected').length,  // 오프라인 서버 수
    connecting: servers.filter(server => server.status === 'connecting').length  // 연결 중인 서버 수
  };

  /**
   * 서버 상태를 번역 키로 매핑
   * - 서버 상태값을 다국어 지원을 위한 번역 키로 변환
   */
  const statusTranslations = {
    connected: 'status.online',      // 연결됨 → 온라인
    disconnected: 'status.offline',  // 연결 끊김 → 오프라인
    connecting: 'status.connecting'  // 연결 중
  };

  // 실제 렌더링 영역
  return (
    <div>
      {/* 상단: 페이지 제목 */}
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('pages.dashboard.title')}</h1>

      {/* 에러 메시지 표시 영역 */}
      {error && (
        <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded shadow-sm error-box">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-status-red text-lg font-medium">{t('app.error')}</h3>
              <p className="text-gray-600 mt-1">{error}</p>
            </div>
            {/* 에러 닫기 버튼 */}
            <button
              onClick={() => setError(null)}
              className="ml-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
              aria-label={t('app.closeButton')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 011.414 0L10 8.586l4.293-4.293a1 1 111.414 1.414L11.414 10l4.293 4.293a1 1 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 01-1.414-1.414L8.586 10 4.293 5.707a1 1 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* 로딩 상태 표시 */}
      {isLoading && (
        <div className="bg-white shadow rounded-lg p-6 flex items-center justify-center loading-container">
          <div className="flex flex-col items-center">
            {/* 회전하는 로딩 스피너 */}
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">{t('app.loading')}</p>
          </div>
        </div>
      )}

      {/* 서버 통계 카드들 */}
      {!isLoading && (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* 전체 서버 수 카드 */}
          <div className="bg-white rounded-lg shadow p-6 dashboard-card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-blue-100 text-blue-800 icon-container status-icon-blue">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-700">{t('pages.dashboard.totalServers')}</h2>
                <p className="text-3xl font-bold text-gray-900">{serverStats.total}</p>
              </div>
            </div>
          </div>

          {/* 온라인 서버 수 카드 */}
          <div className="bg-white rounded-lg shadow p-6 dashboard-card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-green-100 text-green-800 icon-container status-icon-green">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-700">{t('pages.dashboard.onlineServers')}</h2>
                <p className="text-3xl font-bold text-gray-900">{serverStats.online}</p>
              </div>
            </div>
          </div>

          {/* 오프라인 서버 수 카드 */}
          <div className="bg-white rounded-lg shadow p-6 dashboard-card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-red-100 text-red-800 icon-container status-icon-red">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-700">{t('pages.dashboard.offlineServers')}</h2>
                <p className="text-3xl font-bold text-gray-900">{serverStats.offline}</p>
              </div>
            </div>
          </div>

          {/* 연결 중인 서버 수 카드 */}
          <div className="bg-white rounded-lg shadow p-6 dashboard-card">
            <div className="flex items-center">
              <div className="p-3 rounded-full bg-yellow-100 text-yellow-800 icon-container status-icon-yellow">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <h2 className="text-xl font-semibold text-gray-700">{t('pages.dashboard.connectingServers')}</h2>
                <p className="text-3xl font-bold text-gray-900">{serverStats.connecting}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 최근 서버 활동 목록 */}
      {servers.length > 0 && !isLoading && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('pages.dashboard.recentServers')}</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden table-container">
            <table className="min-w-full">
              {/* 테이블 헤더 */}
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th scope="col" className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('server.name')}
                  </th>
                  <th scope="col" className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('server.status')}
                  </th>
                  <th scope="col" className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('server.tools')}
                  </th>
                  <th scope="col" className="px-6 py-5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('server.enabled')}
                  </th>
                </tr>
              </thead>
              {/* 테이블 본문 */}
              <tbody className="bg-white divide-y divide-gray-200">
                {/* 최대 5개의 서버만 표시 */}
                {servers.slice(0, 5).map((server, index) => (
                  <tr key={index}>
                    {/* 서버 이름 */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {server.name}
                    </td>
                    {/* 서버 상태 */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${server.status === 'connected'
                        ? 'status-badge-online'
                        : server.status === 'disconnected'
                          ? 'status-badge-offline'
                          : 'status-badge-connecting'
                        }`}>
                        {t(statusTranslations[server.status] || server.status)}
                      </span>
                    </td>
                    {/* 도구 수 */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {server.tools?.length || 0}
                    </td>
                    {/* 활성화 상태 */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {server.enabled !== false ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-status-red">✗</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
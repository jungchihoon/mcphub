// MCPHub 시스템 로그 페이지
// 이 페이지는 시스템 로그를 실시간으로 조회하고, 삭제할 수 있는 기능을 제공합니다.
import React from 'react';
import { useTranslation } from 'react-i18next';
import LogViewer from '../components/LogViewer';
import { useLogs } from '../services/logService';

// LogsPage 컴포넌트: 시스템 로그 메인 페이지
const LogsPage: React.FC = () => {
  // 다국어 번역 훅
  const { t } = useTranslation();
  // 로그 데이터 및 관련 함수들을 커스텀 훅에서 가져옴
  const { logs, loading, error, clearLogs } = useLogs();

  // 실제 렌더링 영역
  return (
    <div className="container mx-auto p-4">
      {/* 상단: 페이지 제목 */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.logs.title')}</h1>
      </div>
      {/* 로그 뷰어 컴포넌트: 로그 목록, 로딩, 에러, 삭제 기능 제공 */}
      <div className="bg-card rounded-md shadow-sm border border-gray-200 page-card">
        <LogViewer
          logs={logs}
          isLoading={loading}
          error={error}
          onClear={clearLogs}
        />
      </div>
    </div>
  );
};

export default LogsPage;
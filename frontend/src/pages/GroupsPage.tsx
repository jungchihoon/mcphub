// MCPHub 그룹 관리 페이지
// 이 페이지는 서버 그룹 목록 조회, 추가, 수정, 삭제, 그룹별 서버 관리 기능을 제공합니다.
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Group } from '@/types';
import { useGroupData } from '@/hooks/useGroupData';
import { useServerData } from '@/hooks/useServerData';
import AddGroupForm from '@/components/AddGroupForm';
import EditGroupForm from '@/components/EditGroupForm';
import GroupCard from '@/components/GroupCard';

// GroupsPage 컴포넌트: MCP 그룹 관리 메인 페이지
const GroupsPage: React.FC = () => {
  // 다국어 번역 훅
  const { t } = useTranslation();
  // 그룹 데이터 및 관련 함수들을 커스텀 훅에서 가져옴
  const {
    groups,             // 그룹 목록
    loading: groupsLoading, // 로딩 상태
    error: groupError,      // 에러 메시지
    deleteGroup,            // 그룹 삭제 함수
    triggerRefresh          // 그룹 목록 새로고침 함수
  } = useGroupData();
  // 서버 목록(그룹 카드에서 서버명 표시용)
  const { servers } = useServerData();

  // 편집 중인 그룹 상태
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  // 그룹 추가 폼 표시 여부
  const [showAddForm, setShowAddForm] = useState(false);

  // 그룹 편집 버튼 클릭 시: 편집 폼 오픈
  const handleEditClick = (group: Group) => {
    setEditingGroup(group);
  };

  // 그룹 편집 완료 시: 편집 폼 닫고 그룹 목록 새로고침
  const handleEditComplete = () => {
    setEditingGroup(null);
    triggerRefresh(); // Refresh the groups list after editing
  };

  // 그룹 삭제 버튼 클릭 시: 삭제 후 에러 처리
  const handleDeleteGroup = async (groupId: string) => {
    const success = await deleteGroup(groupId);
    if (!success) {
      // setGroupError(t('groups.deleteError')); // This line was removed as per the edit hint
    }
  };

  // 그룹 추가 버튼 클릭 시: 추가 폼 오픈
  const handleAddGroup = () => {
    setShowAddForm(true);
  };

  // 그룹 추가 완료 시: 추가 폼 닫고 그룹 목록 새로고침
  const handleAddComplete = () => {
    setShowAddForm(false);
    triggerRefresh(); // Refresh the groups list after adding
  };

  // 실제 렌더링 영역
  return (
    <div>
      {/* 상단: 페이지 제목 + 우측 그룹 추가 버튼 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900">{t('pages.groups.title')}</h1>
        <div className="flex space-x-4">
          {/* 그룹 추가 폼(모달) 오픈 버튼 */}
          <button
            onClick={handleAddGroup}
            className="px-4 py-2 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 flex items-center btn-primary transition-all duration-200"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 00-1 1v5H4a1 1 0 100 2h5v5a1 1 0 102 0v-5h5a1 1 0 100-2h-5V4a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {t('groups.add')}
          </button>
        </div>
      </div>

      {/* 에러 메시지 표시 영역 */}
      {groupError && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 error-box rounded-lg">
          <p>{groupError}</p>
        </div>
      )}

      {/* 그룹 목록 로딩/빈 상태/정상 표시 */}
      {groupsLoading ? (
        // 로딩 중: 스피너 표시
        <div className="bg-white shadow rounded-lg p-6 loading-container">
          <div className="flex flex-col items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-gray-600">{t('app.loading')}</p>
          </div>
        </div>
      ) : groups.length === 0 ? (
        // 그룹이 하나도 없을 때: 빈 상태 메시지
        <div className="bg-white shadow rounded-lg p-6 empty-state">
          <p className="text-gray-600">{t('groups.noGroups')}</p>
        </div>
      ) : (
        // 그룹 목록 표시: 각 그룹을 카드 형태로 렌더링
        <div className="space-y-6">
          {groups.map((group) => (
            <GroupCard
              key={group.id}
              group={group}
              servers={servers}
              onEdit={handleEditClick}
              onDelete={handleDeleteGroup}
            />
          ))}
        </div>
      )}

      {/* 그룹 추가 폼(모달) */}
      {showAddForm && (
        <AddGroupForm onAdd={handleAddComplete} onCancel={handleAddComplete} />
      )}

      {/* 그룹 편집 폼(모달) */}
      {editingGroup && (
        <EditGroupForm
          group={editingGroup}
          onEdit={handleEditComplete}
          onCancel={() => setEditingGroup(null)}
        />
      )}
    </div>
  );
};

export default GroupsPage;
// React 훅들과 다국어 지원을 가져옵니다
import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

// 타입 정의와 유틸리티 함수를 가져옵니다
import { Group, ApiResponse } from '@/types';
import { getApiUrl } from '../utils/runtime';

/**
 * 그룹 데이터 관리 커스텀 훅
 * 
 * 이 훅은 그룹과 관련된 모든 데이터 관리 작업을 담당합니다.
 * 그룹의 CRUD(Create, Read, Update, Delete) 작업과
 * 그룹 내 서버 관리 기능을 제공합니다.
 * 
 * 주요 기능:
 * - 그룹 목록 조회
 * - 그룹 생성/수정/삭제
 * - 그룹에 서버 추가/제거
 * - 그룹 서버 일괄 업데이트
 * 
 * @returns 그룹 데이터와 관련 함수들을 포함한 객체
 */
export const useGroupData = () => {
  // 다국어 지원 훅
  const { t } = useTranslation();
  
  // 그룹 목록 상태 관리
  const [groups, setGroups] = useState<Group[]>([]);
  
  // 로딩 상태 관리
  const [loading, setLoading] = useState(true);
  
  // 오류 상태 관리
  const [error, setError] = useState<string | null>(null);
  
  // 데이터 새로고침을 위한 키 (의존성 배열로 사용)
  const [refreshKey, setRefreshKey] = useState(0);

  /**
   * 그룹 목록을 서버에서 가져오는 함수
   * 
   * 이 함수는 useCallback으로 메모이제이션되어 있어서
   * 불필요한 리렌더링을 방지합니다.
   */
  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true);
      
      // localStorage에서 인증 토큰 가져오기
      const token = localStorage.getItem('mcphub_token');
      
      // 서버에 그룹 목록 요청
      const response = await fetch(getApiUrl('/groups'), {
        headers: {
          'x-auth-token': token || '',
        },
      });

      // HTTP 응답 상태 확인
      if (!response.ok) {
        throw new Error(`Status: ${response.status}`);
      }

      // 응답 데이터 파싱
      const data: ApiResponse<Group[]> = await response.json();

      // 데이터 유효성 검사 및 상태 업데이트
      if (data && data.success && Array.isArray(data.data)) {
        setGroups(data.data);
      } else {
        console.error('Invalid group data format:', data);
        setGroups([]);
      }

      setError(null);
    } catch (err) {
      // 오류 처리
      console.error('Error fetching groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch groups');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * 그룹 데이터 새로고침을 트리거하는 함수
   * 
   * refreshKey를 증가시켜 useEffect의 의존성 배열을 변경하여
   * 데이터를 다시 가져오도록 합니다.
   */
  const triggerRefresh = useCallback(() => {
    setRefreshKey((prev) => prev + 1);
  }, []);

  /**
   * 새로운 그룹을 생성하는 함수
   * 
   * @param name - 그룹 이름
   * @param description - 그룹 설명 (선택사항)
   * @param servers - 그룹에 포함할 서버 목록 (선택사항)
   * @returns 생성된 그룹 객체 또는 null (실패 시)
   */
  const createGroup = async (name: string, description?: string, servers: string[] = []) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      
      // 서버에 그룹 생성 요청
      const response = await fetch(getApiUrl('/groups'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ name, description, servers }),
      });

      const result: ApiResponse<Group> = await response.json();

      // 응답 상태 확인
      if (!response.ok) {
        setError(result.message || t('groups.createError'));
        return null;
      }

      // 성공 시 데이터 새로고침
      triggerRefresh();
      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create group');
      return null;
    }
  };

  /**
   * 기존 그룹을 수정하는 함수
   * 
   * @param id - 수정할 그룹의 ID
   * @param data - 수정할 데이터 (이름, 설명, 서버 목록)
   * @returns 수정된 그룹 객체 또는 null (실패 시)
   */
  const updateGroup = async (
    id: string,
    data: { name?: string; description?: string; servers?: string[] },
  ) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      
      // 서버에 그룹 수정 요청
      const response = await fetch(getApiUrl(`/groups/${id}`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify(data),
      });

      const result: ApiResponse<Group> = await response.json();

      // 응답 상태 확인
      if (!response.ok) {
        setError(result.message || t('groups.updateError'));
        return null;
      }

      // 성공 시 데이터 새로고침
      triggerRefresh();
      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group');
      return null;
    }
  };

  /**
   * 그룹의 서버 목록을 일괄 업데이트하는 함수
   * 
   * @param groupId - 그룹 ID
   * @param servers - 새로운 서버 목록
   * @returns 업데이트된 그룹 객체 또는 null (실패 시)
   */
  const updateGroupServers = async (groupId: string, servers: string[]) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      
      // 서버에 일괄 업데이트 요청
      const response = await fetch(getApiUrl(`/groups/${groupId}/servers/batch`), {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ servers }),
      });

      const result: ApiResponse<Group> = await response.json();

      // 응답 상태 확인
      if (!response.ok) {
        setError(result.message || t('groups.updateError'));
        return null;
      }

      // 성공 시 데이터 새로고침
      triggerRefresh();
      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update group servers');
      return null;
    }
  };

  /**
   * 그룹을 삭제하는 함수
   * 
   * @param id - 삭제할 그룹의 ID
   * @returns 삭제 성공 여부
   */
  const deleteGroup = async (id: string) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      
      // 서버에 그룹 삭제 요청
      const response = await fetch(getApiUrl(`/groups/${id}`), {
        method: 'DELETE',
        headers: {
          'x-auth-token': token || '',
        },
      });

      const result = await response.json();

      // 응답 상태 확인
      if (!response.ok) {
        setError(result.message || t('groups.deleteError'));
        return false;
      }

      // 성공 시 데이터 새로고침
      triggerRefresh();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete group');
      return false;
    }
  };

  /**
   * 그룹에 서버를 추가하는 함수
   * 
   * @param groupId - 그룹 ID
   * @param serverName - 추가할 서버 이름
   * @returns 업데이트된 그룹 객체 또는 null (실패 시)
   */
  const addServerToGroup = async (groupId: string, serverName: string) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      
      // 서버에 서버 추가 요청
      const response = await fetch(getApiUrl(`/groups/${groupId}/servers`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ serverName }),
      });

      const result: ApiResponse<Group> = await response.json();

      // 응답 상태 확인
      if (!response.ok) {
        setError(result.message || t('groups.serverAddError'));
        return null;
      }

      // 성공 시 데이터 새로고침
      triggerRefresh();
      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server to group');
      return null;
    }
  };

  /**
   * 그룹에서 서버를 제거하는 함수
   * 
   * @param groupId - 그룹 ID
   * @param serverName - 제거할 서버 이름
   * @returns 업데이트된 그룹 객체 또는 null (실패 시)
   */
  const removeServerFromGroup = async (groupId: string, serverName: string) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      
      // 서버에 서버 제거 요청
      const response = await fetch(getApiUrl(`/groups/${groupId}/servers/${serverName}`), {
        method: 'DELETE',
        headers: {
          'x-auth-token': token || '',
        },
      });

      const result: ApiResponse<Group> = await response.json();

      // 응답 상태 확인
      if (!response.ok) {
        setError(result.message || t('groups.serverRemoveError'));
        return null;
      }

      // 성공 시 데이터 새로고침
      triggerRefresh();
      return result.data || null;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove server from group');
      return null;
    }
  };

  // refreshKey가 변경될 때마다 그룹 데이터를 다시 가져옴
  useEffect(() => {
    fetchGroups();
  }, [fetchGroups, refreshKey]);

  // 훅에서 제공하는 모든 값과 함수들을 반환
  return {
    groups,
    loading,
    error,
    createGroup,
    updateGroup,
    updateGroupServers,
    deleteGroup,
    addServerToGroup,
    removeServerFromGroup,
    triggerRefresh,
  };
};

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, User, Crown, Clock, Calendar, Settings, Check, X } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';

interface UserInfo {
  id: string;
  githubId: string;
  githubUsername: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  githubProfileUrl?: string;
  isAdmin: boolean;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  keyCount?: number;
}

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { auth } = useAuth();
  const { addToast } = useToast();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // 사용자 목록 로드
  const loadUsers = async () => {
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch('/api/admin/users', {
        headers: {
          'x-auth-token': token || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      } else {
        const error = await response.json();
        throw new Error(error.message || '사용자 목록 로드 실패');
      }
    } catch (error) {
      console.error('사용자 목록 로드 오류:', error);
      addToast(error instanceof Error ? error.message : '사용자 목록을 불러오는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 사용자 관리자 권한 토글 (슈퍼 어드민 전용)
  const toggleAdminRole = async (userId: string, currentIsAdmin: boolean) => {

    setUpdating(userId);
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/admin/users/${userId}/admin`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ isAdmin: !currentIsAdmin })
      });

      if (response.ok) {
        const verb = !currentIsAdmin ? '부여' : '제거';
        addToast(`관리자 권한이 ${verb}되었습니다.`, 'success');
        loadUsers(); // 목록 새로고침
      } else {
        const error = await response.json();
        throw new Error(error.message || '권한 변경 실패');
      }
    } catch (error) {
      console.error('권한 변경 오류:', error);
      addToast(error instanceof Error ? error.message : '권한 변경 중 오류가 발생했습니다.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  // 사용자 계정 활성화/비활성화 (슈퍼 어드민 전용)
  const toggleUserStatus = async (userId: string, currentIsActive: boolean) => {

    setUpdating(userId);
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ isActive: !currentIsActive })
      });

      if (response.ok) {
        const verb = !currentIsActive ? '활성화' : '비활성화';
        addToast(`계정이 ${verb}되었습니다.`, 'success');
        loadUsers(); // 목록 새로고침
      } else {
        const error = await response.json();
        throw new Error(error.message || '상태 변경 실패');
      }
    } catch (error) {
      console.error('상태 변경 오류:', error);
      addToast(error instanceof Error ? error.message : '상태 변경 중 오류가 발생했습니다.', 'error');
    } finally {
      setUpdating(null);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // 날짜 포맷팅
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 시간 차이 계산
  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return '-';
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return '방금 전';
    if (diffInHours < 24) return `${diffInHours}시간 전`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}일 전`;
    return `${Math.floor(diffInHours / 168)}주 전`;
  };

  if (loading) {
    return (
      <div className="container mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600 dark:text-gray-400">사용자 목록을 불러오는 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <Shield className="w-8 h-8 text-red-600 dark:text-red-400 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">사용자 관리</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">GitHub OAuth 사용자들의 권한을 관리합니다</p>
          </div>
        </div>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
          <Crown className="w-4 h-4 mr-1.5" />
          관리자 전용
        </span>
      </div>

      {/* 슈퍼 어드민 권한 안내 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Crown className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3" />
          <div>
            <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-1">
              슈퍼 어드민 전용 기능
            </h3>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-2">
              GitHub OAuth 사용자들의 관리자 권한은 <strong>파일 기반 admin 계정</strong>만 변경할 수 있습니다.
              이는 보안을 위한 설계로, 환경변수 노출 위험을 방지합니다.
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              현재 슈퍼 어드민: <code className="bg-amber-100 dark:bg-amber-800 px-1 rounded">admin (파일 기반)</code>
            </p>
          </div>
        </div>
      </div>

      {/* 사용자 목록 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            등록된 사용자 ({users.length}명)
          </h2>
        </div>

        {users.length === 0 ? (
          <div className="p-8 text-center">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">등록된 사용자가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    사용자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    권한
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    키 개수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    마지막 로그인
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    가입일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img
                          src={user.avatarUrl || `https://github.com/${user.githubUsername}.png`}
                          alt={user.githubUsername}
                          className="w-10 h-10 rounded-full mr-3"
                        />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {user.displayName || user.githubUsername}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            @{user.githubUsername}
                          </div>
                          {user.email && (
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {user.email}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isAdmin ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                          <Crown className="w-3 h-3 mr-1" />
                          관리자
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          <User className="w-3 h-3 mr-1" />
                          일반 사용자
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          <Check className="w-3 h-3 mr-1" />
                          활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                          <X className="w-3 h-3 mr-1" />
                          비활성
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {user.keyCount || 0}개
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                        <div>
                          <div>{getTimeAgo(user.lastLoginAt)}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {formatDate(user.lastLoginAt)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                        {formatDate(user.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        {/* 관리자 권한 토글 */}
                        <button
                          onClick={() => toggleAdminRole(user.id, user.isAdmin)}
                          disabled={updating === user.id}
                          className={`px-3 py-1.5 text-xs rounded transition-colors ${
                            user.isAdmin
                              ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-800 dark:text-red-100 dark:hover:bg-red-700'
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={user.isAdmin ? '관리자 권한 제거' : '관리자 권한 부여'}
                        >
                          {updating === user.id ? '처리 중...' : (user.isAdmin ? '권한 제거' : '관리자로 승급')}
                        </button>

                        {/* 계정 상태 토글 */}
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          disabled={updating === user.id}
                          className={`px-3 py-1.5 text-xs rounded transition-colors ${
                            user.isActive
                              ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 dark:hover:bg-yellow-700'
                              : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-800 dark:text-green-100 dark:hover:bg-green-700'
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                          title={user.isActive ? '계정 비활성화' : '계정 활성화'}
                        >
                          {user.isActive ? '비활성화' : '활성화'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagementPage; 
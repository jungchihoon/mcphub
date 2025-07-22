import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Key, Plus, Calendar, Shield, Copy, AlertTriangle, RefreshCw, Trash2, Settings } from 'lucide-react';
import { useToast } from '../contexts/ToastContext';
import ServiceTokenForm from '../components/ServiceTokenForm';

interface MCPHubKey {
  id: string;
  keyValue: string;
  name: string;
  description?: string;
  isActive: boolean;
  expiresAt: string;
  lastUsedAt?: string;
  usageCount: number;
  serviceTokens: string[];
  createdAt: string;
  daysUntilExpiry: number;
}

const KeyManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [keys, setKeys] = useState<MCPHubKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyExpirationDays, setNewKeyExpirationDays] = useState(90);
  const [creatingKey, setCreatingKey] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<Record<string, boolean>>({});

  // 키 목록 로드
  const loadKeys = async () => {
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch('/api/keys', {
        headers: {
          'x-auth-token': token || '',
        },
      });

      if (response.ok) {
        const result = await response.json();
        setKeys(result.data || []);
      } else {
        throw new Error('키 목록 로드 실패');
      }
    } catch (error) {
      console.error('키 목록 로드 오류:', error);
      addToast('키 목록을 로드하는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 새 키 생성
  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) {
      addToast('키 이름을 입력해주세요.', 'error');
      return;
    }

    setCreatingKey(true);
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          description: newKeyDescription.trim() || undefined,
          expirationDays: newKeyExpirationDays
        })
      });

      if (response.ok) {
        const result = await response.json();
        addToast('새 MCPHub Key가 생성되었습니다!', 'success');
        
        // 생성된 키 값을 클립보드에 복사
        if (result.data?.keyValue) {
          await navigator.clipboard.writeText(result.data.keyValue);
          addToast('키 값이 클립보드에 복사되었습니다.', 'info');
        }

        // 폼 리셋 및 목록 새로고침
        setNewKeyName('');
        setNewKeyDescription('');
        setNewKeyExpirationDays(90);
        setShowCreateForm(false);
        loadKeys();
      } else {
        const error = await response.json();
        throw new Error(error.message || '키 생성 실패');
      }
    } catch (error) {
      console.error('키 생성 오류:', error);
      addToast(error instanceof Error ? error.message : '키 생성 중 오류가 발생했습니다.', 'error');
    } finally {
      setCreatingKey(false);
    }
  };



  // 키 비활성화
  const handleDeactivateKey = async (keyId: string, keyName: string) => {
    if (!confirm(`"${keyName}" 키를 비활성화하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/keys/${keyId}/deactivate`, {
        method: 'POST',
        headers: {
          'x-auth-token': token || '',
        }
      });

      if (response.ok) {
        addToast(`"${keyName}" 키가 비활성화되었습니다.`, 'success');
        loadKeys();
      } else {
        const error = await response.json();
        throw new Error(error.message || '키 비활성화 실패');
      }
    } catch (error) {
      console.error('키 비활성화 오류:', error);
      addToast(error instanceof Error ? error.message : '키 비활성화 중 오류가 발생했습니다.', 'error');
    }
  };

  // 키 값 복사
  const handleCopyKey = async (keyValue: string) => {
    try {
      await navigator.clipboard.writeText(keyValue);
      addToast('키 값이 클립보드에 복사되었습니다.', 'success');
    } catch (error) {
      addToast('키 값 복사에 실패했습니다.', 'error');
    }
  };

  // 서비스 토큰 업데이트
  const handleUpdateServiceTokens = async (keyId: string, tokens: Record<string, string>) => {
    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/keys/${keyId}/tokens`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ serviceTokens: tokens })
      });

      if (response.ok) {
        addToast('서비스 토큰이 업데이트되었습니다.', 'success');
        loadKeys(); // 키 목록 새로고침
      } else {
        const error = await response.json();
        throw new Error(error.message || '서비스 토큰 업데이트 실패');
      }
    } catch (error) {
      console.error('서비스 토큰 업데이트 오류:', error);
      addToast(error instanceof Error ? error.message : '서비스 토큰 업데이트 중 오류가 발생했습니다.', 'error');
    }
  };

  // 키 만료일 연장
  const handleExtendKey = async (keyId: string, keyName: string) => {
    if (!confirm(`"${keyName}" 키의 만료일을 30일 연장하시겠습니까?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('mcphub_token');
      const response = await fetch(`/api/keys/${keyId}/extend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-auth-token': token || '',
        },
        body: JSON.stringify({ days: 30 })
      });

      if (response.ok) {
        addToast(`"${keyName}" 키의 만료일이 30일 연장되었습니다.`, 'success');
        loadKeys();
      } else {
        const error = await response.json();
        throw new Error(error.message || '키 만료일 연장 실패');
      }
    } catch (error) {
      console.error('키 만료일 연장 오류:', error);
      addToast(error instanceof Error ? error.message : '키 만료일 연장 중 오류가 발생했습니다.', 'error');
    }
  };

  // 키 확장/축소 토글
  const toggleKeyExpansion = (keyId: string) => {
    setExpandedKeys(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  };

  // 만료일 표시 색상
  const getExpiryColor = (daysUntilExpiry: number) => {
    if (daysUntilExpiry <= 7) return 'text-red-600 dark:text-red-400';
    if (daysUntilExpiry <= 30) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  useEffect(() => {
    loadKeys();
  }, []);

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Key className="w-8 h-8 text-indigo-600 dark:text-indigo-400 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">MCPHub Key 관리</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Cursor IDE에서 사용할 MCPHub Key를 관리하세요
            </p>
          </div>
        </div>
        
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 키 생성
        </button>
      </div>

      {/* 키 생성 폼 */}
      {showCreateForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">새 MCPHub Key 생성</h3>
          <form onSubmit={handleCreateKey} className="space-y-4">
            <div>
              <label htmlFor="keyName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                키 이름 *
              </label>
              <input
                type="text"
                id="keyName"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="예: Cursor IDE Key"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
                required
              />
            </div>
            
            <div>
              <label htmlFor="keyDescription" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                설명 (선택사항)
              </label>
              <textarea
                id="keyDescription"
                value={newKeyDescription}
                onChange={(e) => setNewKeyDescription(e.target.value)}
                placeholder="이 키의 용도를 설명해주세요"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="keyExpiration" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                만료일 설정
              </label>
              <select
                id="keyExpiration"
                value={newKeyExpirationDays}
                onChange={(e) => setNewKeyExpirationDays(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-white"
              >
                <option value={1}>1일</option>
                <option value={7}>7일</option>
                <option value={30}>30일 (1개월)</option>
                <option value={60}>60일 (2개월)</option>
                <option value={90}>90일 (3개월) - 권장</option>
              </select>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                키는 선택한 날짜 이후 자동으로 만료됩니다.
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                type="submit"
                disabled={creatingKey}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
              >
                {creatingKey ? '생성 중...' : '키 생성'}
              </button>
              
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
              >
                취소
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 키 목록 */}
      {keys.length === 0 ? (
        <div className="text-center py-12">
          <Key className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">MCPHub Key가 없습니다</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            첫 번째 키를 생성해서 Cursor IDE에서 MCPHub를 사용해보세요.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="w-4 h-4 mr-2" />
            첫 번째 키 생성
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {keys.map((key) => (
            <div key={key.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{key.name}</h3>
                    <div className="flex items-center ml-3 space-x-2">
                      {key.isActive ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                          <Shield className="w-3 h-3 mr-1" />
                          활성
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                          비활성
                        </span>
                      )}
                      
                      {key.daysUntilExpiry <= 7 && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          곧 만료
                        </span>
                      )}
                    </div>
                  </div>

                  {key.description && (
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{key.description}</p>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">키 값:</span>
                      <div className="flex items-center mt-1">
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs font-mono">
                          {key.keyValue}
                        </code>
                        <button
                          onClick={() => handleCopyKey(key.keyValue)}
                          className="ml-2 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="복사"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 dark:text-gray-400">만료일:</span>
                      <div className={`flex items-center mt-1 ${getExpiryColor(key.daysUntilExpiry)}`}>
                        <Calendar className="w-4 h-4 mr-1" />
                        {new Date(key.expiresAt).toLocaleDateString()} ({key.daysUntilExpiry}일 남음)
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 dark:text-gray-400">사용 횟수:</span>
                      <div className="mt-1">{key.usageCount.toLocaleString()}회</div>
                    </div>
                  </div>

                  {key.serviceTokens.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">연결된 서비스:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {key.serviceTokens.map((service) => (
                          <span key={service} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100">
                            {service}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => toggleKeyExpansion(key.id)}
                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                    title="토큰 관리"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                  
                  {key.isActive && (
                    <button
                      onClick={() => handleExtendKey(key.id, key.name)}
                      className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                      title="만료일 연장"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleDeactivateKey(key.id, key.name)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                    title="키 비활성화"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 서비스 토큰 관리 섹션 */}
              {expandedKeys[key.id] && (
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <ServiceTokenForm
                    keyId={key.id}
                    currentTokens={key.serviceTokens.reduce((acc, service) => {
                      acc[service] = '***'; // 실제 값은 보안상 마스킹
                      return acc;
                    }, {} as Record<string, string>)}
                    onUpdate={(tokens) => handleUpdateServiceTokens(key.id, tokens)}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default KeyManagementPage; 
import React, { useState, useEffect } from 'react';
import { Key, Plus, Save, Trash2, Eye, EyeOff } from 'lucide-react';

interface ServiceToken {
  name: string;
  label: string;
  description: string;
  placeholder: string;
  required?: boolean;
}

interface ServiceTokenFormProps {
  keyId: string;
  currentTokens: Record<string, string>;
  onUpdate: (tokens: Record<string, string>) => Promise<void>;
}

// 지원하는 서비스 토큰 목록
const SUPPORTED_SERVICES: ServiceToken[] = [
  {
    name: 'GITHUB_TOKEN',
    label: 'GitHub Token',
    description: 'GitHub API 접근을 위한 Personal Access Token',
    placeholder: 'ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    required: false
  },
  {
    name: 'FIRECRAWL_API_KEY',
    label: 'Firecrawl API Key',
    description: '웹 스크래핑을 위한 Firecrawl API 키',
    placeholder: 'fc-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    required: false
  },
  {
    name: 'ANTHROPIC_API_KEY',
    label: 'Anthropic API Key',
    description: 'Claude API 접근을 위한 Anthropic API 키',
    placeholder: 'sk-ant-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    required: false
  },
  {
    name: 'OPENAI_API_KEY',
    label: 'OpenAI API Key',
    description: 'OpenAI API 접근을 위한 API 키',
    placeholder: 'sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    required: false
  },
  {
    name: 'GOOGLE_API_KEY',
    label: 'Google API Key',
    description: 'Google 서비스 접근을 위한 API 키',
    placeholder: 'AIzaxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    required: false
  }
];

const ServiceTokenForm: React.FC<ServiceTokenFormProps> = ({ 
  keyId, 
  currentTokens = {}, 
  onUpdate 
}) => {
  const [tokens, setTokens] = useState<Record<string, string>>(currentTokens);
  const [showValues, setShowValues] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [customService, setCustomService] = useState({ name: '', value: '' });
  const [showCustomForm, setShowCustomForm] = useState(false);

  // 토큰 값 업데이트
  const handleTokenChange = (serviceName: string, value: string) => {
    setTokens(prev => ({
      ...prev,
      [serviceName]: value
    }));
  };

  // 토큰 삭제
  const handleRemoveToken = (serviceName: string) => {
    setTokens(prev => {
      const updated = { ...prev };
      delete updated[serviceName];
      return updated;
    });
  };

  // 토큰 값 표시/숨김 토글
  const toggleShowValue = (serviceName: string) => {
    setShowValues(prev => ({
      ...prev,
      [serviceName]: !prev[serviceName]
    }));
  };

  // 커스텀 서비스 추가
  const handleAddCustomService = () => {
    if (customService.name.trim() && customService.value.trim()) {
      setTokens(prev => ({
        ...prev,
        [customService.name.trim().toUpperCase()]: customService.value.trim()
      }));
      setCustomService({ name: '', value: '' });
      setShowCustomForm(false);
    }
  };

  // 변경사항 저장
  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdate(tokens);
    } finally {
      setSaving(false);
    }
  };

  // 변경사항이 있는지 확인
  const hasChanges = JSON.stringify(tokens) !== JSON.stringify(currentTokens);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Key className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              서비스 토큰
            </h3>
          </div>
          {hasChanges && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="w-4 h-4 mr-1" />
              {saving ? '저장 중...' : '저장'}
            </button>
          )}
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          MCP 서버에서 사용할 API 키와 토큰을 설정하세요
        </p>
      </div>

      <div className="p-4 space-y-4">
        {/* 지원 서비스 목록 */}
        {SUPPORTED_SERVICES.map((service) => (
          <div key={service.name} className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {service.label}
                {service.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {tokens[service.name] && (
                <button
                  onClick={() => handleRemoveToken(service.name)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {service.description}
            </p>
            <div className="relative">
              <input
                type={showValues[service.name] ? 'text' : 'password'}
                value={tokens[service.name] || ''}
                onChange={(e) => handleTokenChange(service.name, e.target.value)}
                placeholder={service.placeholder}
                className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {tokens[service.name] && (
                <button
                  type="button"
                  onClick={() => toggleShowValue(service.name)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showValues[service.name] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>
          </div>
        ))}

        {/* 기타 커스텀 토큰들 */}
        {Object.entries(tokens)
          .filter(([name]) => !SUPPORTED_SERVICES.some(s => s.name === name))
          .map(([name, value]) => (
            <div key={name} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {name}
                </label>
                <button
                  onClick={() => handleRemoveToken(name)}
                  className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <input
                  type={showValues[name] ? 'text' : 'password'}
                  value={value}
                  onChange={(e) => handleTokenChange(name, e.target.value)}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => toggleShowValue(name)}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showValues[name] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          ))}

        {/* 커스텀 서비스 추가 */}
        {showCustomForm ? (
          <div className="space-y-3 p-3 bg-gray-50 dark:bg-gray-750 rounded-md">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              커스텀 토큰 추가
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={customService.name}
                onChange={(e) => setCustomService(prev => ({ ...prev, name: e.target.value }))}
                placeholder="토큰 이름 (예: MY_API_KEY)"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              <input
                type="password"
                value={customService.value}
                onChange={(e) => setCustomService(prev => ({ ...prev, value: e.target.value }))}
                placeholder="토큰 값"
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowCustomForm(false)}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300"
              >
                취소
              </button>
              <button
                onClick={handleAddCustomService}
                disabled={!customService.name.trim() || !customService.value.trim()}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                추가
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomForm(true)}
            className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
          >
            <Plus className="w-4 h-4 mr-1" />
            커스텀 토큰 추가
          </button>
        )}
      </div>
    </div>
  );
};

export default ServiceTokenForm; 
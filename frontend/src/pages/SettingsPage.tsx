// MCPHub 시스템 설정 페이지
// 이 페이지는 언어, 라우팅, 설치, 스마트라우팅, 비밀번호 등 MCPHub의 시스템 설정을 관리합니다.
// 각 섹션별로 입력, 토글, 저장, 검증 등 다양한 UI와 로직을 포함합니다.
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { Switch } from '@/components/ui/ToggleGroup';
import { useSettingsData } from '@/hooks/useSettingsData';
import { useToast } from '@/contexts/ToastContext';
import { generateRandomKey } from '@/utils/key';

/**
 * SettingsPage 컴포넌트: MCPHub 시스템 설정 메인 페이지
 * - 언어 설정, 라우팅 설정, 설치 설정, 스마트라우팅 설정, 비밀번호 변경 등 제공
 * - 각 섹션은 토글로 열고 닫을 수 있음
 * - 각종 입력, 저장, 검증, 알림 등 다양한 UX 제공
 */
const SettingsPage: React.FC = () => {
  // 다국어 번역 훅
  const { t, i18n } = useTranslation();
  // 페이지 이동 함수
  const navigate = useNavigate();
  // 토스트(알림) 메시지 표시 함수
  const { showToast } = useToast();
  // 현재 언어 상태
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // 언어 변경 시 상태 동기화
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  // 설치 설정 상태 (로컬 임시)
  const [installConfig, setInstallConfig] = useState<{
    pythonIndexUrl: string;
    npmRegistry: string;
  }>({
    pythonIndexUrl: '',
    npmRegistry: '',
  });

  // 스마트라우팅 임시 설정 상태
  const [tempSmartRoutingConfig, setTempSmartRoutingConfig] = useState<{
    dbUrl: string;
    openaiApiBaseUrl: string;
    openaiApiKey: string;
    openaiApiEmbeddingModel: string;
  }>({
    dbUrl: '',
    openaiApiBaseUrl: '',
    openaiApiKey: '',
    openaiApiEmbeddingModel: '',
  });

  // 커스텀 훅에서 각종 설정 데이터와 함수 가져오기
  const {
    routingConfig,                    // 현재 라우팅 설정
    tempRoutingConfig,                // 임시 라우팅 설정
    setTempRoutingConfig,             // 임시 라우팅 설정 변경 함수
    installConfig: savedInstallConfig,// 저장된 설치 설정
    smartRoutingConfig,               // 현재 스마트라우팅 설정
    loading,                          // 로딩 상태
    updateRoutingConfig,              // 라우팅 설정 업데이트 함수
    updateRoutingConfigBatch,         // 라우팅 설정 일괄 업데이트 함수
    updateInstallConfig,              // 설치 설정 업데이트 함수
    updateSmartRoutingConfig,         // 스마트라우팅 설정 업데이트 함수
    updateSmartRoutingConfigBatch     // 스마트라우팅 설정 일괄 업데이트 함수
  } = useSettingsData();

  // 저장된 설치 설정이 변경될 때 로컬 상태 동기화
  useEffect(() => {
    if (savedInstallConfig) {
      setInstallConfig(savedInstallConfig);
    }
  }, [savedInstallConfig]);

  // 스마트라우팅 설정이 변경될 때 임시 상태 동기화
  useEffect(() => {
    if (smartRoutingConfig) {
      setTempSmartRoutingConfig({
        dbUrl: smartRoutingConfig.dbUrl || '',
        openaiApiBaseUrl: smartRoutingConfig.openaiApiBaseUrl || '',
        openaiApiKey: smartRoutingConfig.openaiApiKey || '',
        openaiApiEmbeddingModel: smartRoutingConfig.openaiApiEmbeddingModel || '',
      });
    }
  }, [smartRoutingConfig]);

  // 각 설정 섹션의 열림/닫힘 상태 관리
  const [sectionsVisible, setSectionsVisible] = useState({
    routingConfig: false,      // 라우팅 설정 섹션
    installConfig: false,      // 설치 설정 섹션
    smartRoutingConfig: false, // 스마트라우팅 설정 섹션
    password: false            // 비밀번호 변경 섹션
  });

  /**
   * 설정 섹션의 열림/닫힘 토글 함수
   * @param section - 토글할 섹션 이름
   */
  const toggleSection = (section: 'routingConfig' | 'installConfig' | 'smartRoutingConfig' | 'password') => {
    setSectionsVisible(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // 라우팅 설정 변경 핸들러 (Bearer Auth 등)
  const handleRoutingConfigChange = async (key: 'enableGlobalRoute' | 'enableGroupNameRoute' | 'enableBearerAuth' | 'bearerAuthKey' | 'skipAuth', value: boolean | string) => {
    // Bearer Auth 활성화 시 키가 없으면 자동 생성
    if (key === 'enableBearerAuth' && value === true) {
      if (!tempRoutingConfig.bearerAuthKey && !routingConfig.bearerAuthKey) {
        const newKey = generateRandomKey();
        handleBearerAuthKeyChange(newKey);
        // 두 값을 한 번에 저장
        const success = await updateRoutingConfigBatch({
          enableBearerAuth: true,
          bearerAuthKey: newKey
        });
        if (success) {
          setTempRoutingConfig(prev => ({
            ...prev,
            bearerAuthKey: newKey
          }));
        }
        return;
      }
    }
    await updateRoutingConfig(key, value);
  };

  // Bearer Auth 키 입력 핸들러
  const handleBearerAuthKeyChange = (value: string) => {
    setTempRoutingConfig(prev => ({
      ...prev,
      bearerAuthKey: value
    }));
  };

  // Bearer Auth 키 저장 핸들러
  const saveBearerAuthKey = async () => {
    await updateRoutingConfig('bearerAuthKey', tempRoutingConfig.bearerAuthKey);
  };

  // 설치 설정 입력 핸들러
  const handleInstallConfigChange = (key: 'pythonIndexUrl' | 'npmRegistry', value: string) => {
    setInstallConfig({
      ...installConfig,
      [key]: value
    });
  };

  // 설치 설정 저장 핸들러
  const saveInstallConfig = async (key: 'pythonIndexUrl' | 'npmRegistry') => {
    await updateInstallConfig(key, installConfig[key]);
  };

  // 스마트라우팅 임시 설정 입력 핸들러
  const handleSmartRoutingConfigChange = (key: 'dbUrl' | 'openaiApiBaseUrl' | 'openaiApiKey' | 'openaiApiEmbeddingModel', value: string) => {
    setTempSmartRoutingConfig({
      ...tempSmartRoutingConfig,
      [key]: value
    });
  };

  // 스마트라우팅 설정 저장 핸들러
  const saveSmartRoutingConfig = async (key: 'dbUrl' | 'openaiApiBaseUrl' | 'openaiApiKey' | 'openaiApiEmbeddingModel') => {
    await updateSmartRoutingConfig(key, tempSmartRoutingConfig[key]);
  };

  // 스마트라우팅 활성/비활성 토글 핸들러
  const handleSmartRoutingEnabledChange = async (value: boolean) => {
    if (value) {
      // 활성화 시 필수값 검증 및 일괄 저장
      const currentDbUrl = tempSmartRoutingConfig.dbUrl || smartRoutingConfig.dbUrl;
      const currentOpenaiApiKey = tempSmartRoutingConfig.openaiApiKey || smartRoutingConfig.openaiApiKey;
      if (!currentDbUrl || !currentOpenaiApiKey) {
        const missingFields = [];
        if (!currentDbUrl) missingFields.push(t('settings.dbUrl'));
        if (!currentOpenaiApiKey) missingFields.push(t('settings.openaiApiKey'));
        showToast(t('settings.smartRoutingValidationError', {
          fields: missingFields.join(', ')
        }));
        return;
      }
      // 변경된 값만 모아서 일괄 저장
      const updates: any = { enabled: value };
      if (tempSmartRoutingConfig.dbUrl !== smartRoutingConfig.dbUrl) {
        updates.dbUrl = tempSmartRoutingConfig.dbUrl;
      }
      if (tempSmartRoutingConfig.openaiApiBaseUrl !== smartRoutingConfig.openaiApiBaseUrl) {
        updates.openaiApiBaseUrl = tempSmartRoutingConfig.openaiApiBaseUrl;
      }
      if (tempSmartRoutingConfig.openaiApiKey !== smartRoutingConfig.openaiApiKey) {
        updates.openaiApiKey = tempSmartRoutingConfig.openaiApiKey;
      }
      if (tempSmartRoutingConfig.openaiApiEmbeddingModel !== smartRoutingConfig.openaiApiEmbeddingModel) {
        updates.openaiApiEmbeddingModel = tempSmartRoutingConfig.openaiApiEmbeddingModel;
      }
      await updateSmartRoutingConfigBatch(updates);
    } else {
      // 비활성화 시 enabled만 저장
      await updateSmartRoutingConfig('enabled', value);
    }
  };

  // 비밀번호 변경 성공 시 메인 페이지로 이동
  const handlePasswordChangeSuccess = () => {
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  // 언어 변경 핸들러
  const handleLanguageChange = (lang: string) => {
    localStorage.setItem('i18nextLng', lang);
    window.location.reload();
  };

  // 이하 실제 렌더링 영역 (UI 주석은 생략, 필요시 추가 가능)
  return (
    <div className="container mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('pages.settings.title')}</h1>

      {/* Language Settings */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6 page-card">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-800">{t('pages.settings.language')}</h2>
          <div className="flex space-x-3">
            <button
              className={`px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${currentLanguage.startsWith('en')
                ? 'bg-blue-500 text-white btn-primary'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 btn-secondary'
                }`}
              onClick={() => handleLanguageChange('en')}
            >
              English
            </button>
            <button
              className={`px-3 py-1.5 rounded-md transition-all duration-200 text-sm ${currentLanguage.startsWith('zh')
                ? 'bg-blue-500 text-white btn-primary'
                : 'bg-blue-100 text-blue-800 hover:bg-blue-200 btn-secondary'
                }`}
              onClick={() => handleLanguageChange('zh')}
            >
              中文
            </button>
          </div>
        </div>
      </div>

      {/* Smart Routing Configuration Settings */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6 page-card">
        <div
          className="flex justify-between items-center cursor-pointer transition-colors duration-200 hover:text-blue-600"
          onClick={() => toggleSection('smartRoutingConfig')}
        >
          <h2 className="font-semibold text-gray-800">{t('pages.settings.smartRouting')}</h2>
          <span className="text-gray-500 transition-transform duration-200">
            {sectionsVisible.smartRoutingConfig ? '▼' : '►'}
          </span>
        </div>

        {sectionsVisible.smartRoutingConfig && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <h3 className="font-medium text-gray-700">{t('settings.enableSmartRouting')}</h3>
                <p className="text-sm text-gray-500">{t('settings.enableSmartRoutingDescription')}</p>
              </div>
              <Switch
                disabled={loading}
                checked={smartRoutingConfig.enabled}
                onCheckedChange={(checked) => handleSmartRoutingEnabledChange(checked)}
              />
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <div className="mb-2">
                <h3 className="font-medium text-gray-700">
                  <span className="text-red-500 px-1">*</span>{t('settings.dbUrl')}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={tempSmartRoutingConfig.dbUrl}
                  onChange={(e) => handleSmartRoutingConfigChange('dbUrl', e.target.value)}
                  placeholder={t('settings.dbUrlPlaceholder')}
                  className="flex-1 mt-1 block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300 form-input"
                  disabled={loading}
                />
                <button
                  onClick={() => saveSmartRoutingConfig('dbUrl')}
                  disabled={loading}
                  className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <div className="mb-2">
                <h3 className="font-medium text-gray-700">
                  <span className="text-red-500 px-1">*</span>{t('settings.openaiApiKey')}
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="password"
                  value={tempSmartRoutingConfig.openaiApiKey}
                  onChange={(e) => handleSmartRoutingConfigChange('openaiApiKey', e.target.value)}
                  placeholder={t('settings.openaiApiKeyPlaceholder')}
                  className="flex-1 mt-1 block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm border-gray-300"
                  disabled={loading}
                />
                <button
                  onClick={() => saveSmartRoutingConfig('openaiApiKey')}
                  disabled={loading}
                  className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <div className="mb-2">
                <h3 className="font-medium text-gray-700">{t('settings.openaiApiBaseUrl')}</h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={tempSmartRoutingConfig.openaiApiBaseUrl}
                  onChange={(e) => handleSmartRoutingConfigChange('openaiApiBaseUrl', e.target.value)}
                  placeholder={t('settings.openaiApiBaseUrlPlaceholder')}
                  className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                  disabled={loading}
                />
                <button
                  onClick={() => saveSmartRoutingConfig('openaiApiBaseUrl')}
                  disabled={loading}
                  className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <div className="mb-2">
                <h3 className="font-medium text-gray-700">{t('settings.openaiApiEmbeddingModel')}</h3>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={tempSmartRoutingConfig.openaiApiEmbeddingModel}
                  onChange={(e) => handleSmartRoutingConfigChange('openaiApiEmbeddingModel', e.target.value)}
                  placeholder={t('settings.openaiApiEmbeddingModelPlaceholder')}
                  className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                  disabled={loading}
                />
                <button
                  onClick={() => saveSmartRoutingConfig('openaiApiEmbeddingModel')}
                  disabled={loading}
                  className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Route Configuration Settings */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('routingConfig')}
        >
          <h2 className="font-semibold text-gray-800">{t('pages.settings.routeConfig')}</h2>
          <span className="text-gray-500">
            {sectionsVisible.routingConfig ? '▼' : '►'}
          </span>
        </div>

        {sectionsVisible.routingConfig && (
          <div className="space-y-4 mt-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <h3 className="font-medium text-gray-700">{t('settings.enableBearerAuth')}</h3>
                <p className="text-sm text-gray-500">{t('settings.enableBearerAuthDescription')}</p>
              </div>
              <Switch
                disabled={loading}
                checked={routingConfig.enableBearerAuth}
                onCheckedChange={(checked) => handleRoutingConfigChange('enableBearerAuth', checked)}
              />
            </div>

            {routingConfig.enableBearerAuth && (
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="mb-2">
                  <h3 className="font-medium text-gray-700">{t('settings.bearerAuthKey')}</h3>
                  <p className="text-sm text-gray-500">{t('settings.bearerAuthKeyDescription')}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={tempRoutingConfig.bearerAuthKey}
                    onChange={(e) => handleBearerAuthKeyChange(e.target.value)}
                    placeholder={t('settings.bearerAuthKeyPlaceholder')}
                    className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                    disabled={loading || !routingConfig.enableBearerAuth}
                  />
                  <button
                    onClick={saveBearerAuthKey}
                    disabled={loading || !routingConfig.enableBearerAuth}
                    className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <h3 className="font-medium text-gray-700">{t('settings.enableGlobalRoute')}</h3>
                <p className="text-sm text-gray-500">{t('settings.enableGlobalRouteDescription')}</p>
              </div>
              <Switch
                disabled={loading}
                checked={routingConfig.enableGlobalRoute}
                onCheckedChange={(checked) => handleRoutingConfigChange('enableGlobalRoute', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <h3 className="font-medium text-gray-700">{t('settings.enableGroupNameRoute')}</h3>
                <p className="text-sm text-gray-500">{t('settings.enableGroupNameRouteDescription')}</p>
              </div>
              <Switch
                disabled={loading}
                checked={routingConfig.enableGroupNameRoute}
                onCheckedChange={(checked) => handleRoutingConfigChange('enableGroupNameRoute', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <div>
                <h3 className="font-medium text-gray-700">{t('settings.skipAuth')}</h3>
                <p className="text-sm text-gray-500">{t('settings.skipAuthDescription')}</p>
              </div>
              <Switch
                disabled={loading}
                checked={routingConfig.skipAuth}
                onCheckedChange={(checked) => handleRoutingConfigChange('skipAuth', checked)}
              />
            </div>

          </div>
        )}
      </div>

      {/* Installation Configuration Settings */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('installConfig')}
        >
          <h2 className="font-semibold text-gray-800">{t('settings.installConfig')}</h2>
          <span className="text-gray-500">
            {sectionsVisible.installConfig ? '▼' : '►'}
          </span>
        </div>

        {sectionsVisible.installConfig && (
          <div className="space-y-4 mt-4">
            <div className="p-3 bg-gray-50 rounded-md">
              <div className="mb-2">
                <h3 className="font-medium text-gray-700">{t('settings.pythonIndexUrl')}</h3>
                <p className="text-sm text-gray-500">{t('settings.pythonIndexUrlDescription')}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={installConfig.pythonIndexUrl}
                  onChange={(e) => handleInstallConfigChange('pythonIndexUrl', e.target.value)}
                  placeholder={t('settings.pythonIndexUrlPlaceholder')}
                  className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                  disabled={loading}
                />
                <button
                  onClick={() => saveInstallConfig('pythonIndexUrl')}
                  disabled={loading}
                  className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>

            <div className="p-3 bg-gray-50 rounded-md">
              <div className="mb-2">
                <h3 className="font-medium text-gray-700">{t('settings.npmRegistry')}</h3>
                <p className="text-sm text-gray-500">{t('settings.npmRegistryDescription')}</p>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={installConfig.npmRegistry}
                  onChange={(e) => handleInstallConfigChange('npmRegistry', e.target.value)}
                  placeholder={t('settings.npmRegistryPlaceholder')}
                  className="flex-1 mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm form-input"
                  disabled={loading}
                />
                <button
                  onClick={() => saveInstallConfig('npmRegistry')}
                  disabled={loading}
                  className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 btn-primary"
                >
                  {t('common.save')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Password */}
      <div className="bg-white shadow rounded-lg py-4 px-6 mb-6">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('password')}
        >
          <h2 className="font-semibold text-gray-800">{t('auth.changePassword')}</h2>
          <span className="text-gray-500">
            {sectionsVisible.password ? '▼' : '►'}
          </span>
        </div>

        {sectionsVisible.password && (
          <div className="max-w-lg mt-4">
            <ChangePasswordForm onSuccess={handlePasswordChangeSuccess} />
          </div>
        )}
      </div>
    </div >
  );
};

export default SettingsPage;
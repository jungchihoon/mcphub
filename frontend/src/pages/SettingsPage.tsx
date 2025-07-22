import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import ChangePasswordForm from '@/components/ChangePasswordForm';
import { Switch } from '@/components/ui/ToggleGroup';
import { useSettingsData } from '@/hooks/useSettingsData';
import { useToast } from '@/contexts/ToastContext';
import { generateRandomKey } from '@/utils/key';
import { useAuth } from '@/contexts/AuthContext';
import AdminOnly from '@/components/AdminOnly';

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { auth } = useAuth();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);

  // Update current language when it changes
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);

  const [installConfig, setInstallConfig] = useState<{
    pythonIndexUrl: string;
    npmRegistry: string;
  }>({
    pythonIndexUrl: '',
    npmRegistry: '',
  });

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

  const {
    routingConfig,
    tempRoutingConfig,
    setTempRoutingConfig,
    installConfig: savedInstallConfig,
    smartRoutingConfig,
    loading,
    updateRoutingConfig,
    updateRoutingConfigBatch,
    updateInstallConfig,
    updateSmartRoutingConfig,
    updateSmartRoutingConfigBatch
  } = useSettingsData();

  // Update local installConfig when savedInstallConfig changes
  useEffect(() => {
    if (savedInstallConfig) {
      setInstallConfig(savedInstallConfig);
    }
  }, [savedInstallConfig]);

  // Update local tempSmartRoutingConfig when smartRoutingConfig changes
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

  const [sectionsVisible, setSectionsVisible] = useState({
    routingConfig: false,
    installConfig: false,
    smartRoutingConfig: false,
    password: false
  });

  const toggleSection = (section: 'routingConfig' | 'installConfig' | 'smartRoutingConfig' | 'password') => {
    setSectionsVisible(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleRoutingConfigChange = async (key: 'enableGlobalRoute' | 'enableGroupNameRoute' | 'enableBearerAuth' | 'bearerAuthKey' | 'skipAuth', value: boolean | string) => {
    // If enableBearerAuth is turned on and there's no key, generate one first
    if (key === 'enableBearerAuth' && value === true) {
      if (!tempRoutingConfig.bearerAuthKey && !routingConfig.bearerAuthKey) {
        const newKey = generateRandomKey();
        handleBearerAuthKeyChange(newKey);

        // Update both enableBearerAuth and bearerAuthKey in a single call
        const success = await updateRoutingConfigBatch({
          enableBearerAuth: true,
          bearerAuthKey: newKey
        });

        if (success) {
          // Update tempRoutingConfig to reflect the saved values
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

  const handleBearerAuthKeyChange = (value: string) => {
    setTempRoutingConfig(prev => ({
      ...prev,
      bearerAuthKey: value
    }));
  };

  const saveBearerAuthKey = async () => {
    await updateRoutingConfig('bearerAuthKey', tempRoutingConfig.bearerAuthKey);
  };

  const handleInstallConfigChange = (key: 'pythonIndexUrl' | 'npmRegistry', value: string) => {
    setInstallConfig({
      ...installConfig,
      [key]: value
    });
  };

  const saveInstallConfig = async (key: 'pythonIndexUrl' | 'npmRegistry') => {
    await updateInstallConfig(key, installConfig[key]);
  };

  const handleSmartRoutingConfigChange = (key: 'dbUrl' | 'openaiApiBaseUrl' | 'openaiApiKey' | 'openaiApiEmbeddingModel', value: string) => {
    setTempSmartRoutingConfig({
      ...tempSmartRoutingConfig,
      [key]: value
    });
  };

  const saveSmartRoutingConfig = async (key: 'dbUrl' | 'openaiApiBaseUrl' | 'openaiApiKey' | 'openaiApiEmbeddingModel') => {
    await updateSmartRoutingConfig(key, tempSmartRoutingConfig[key]);
  };

  const handleSmartRoutingEnabledChange = async (value: boolean) => {
    // If enabling Smart Routing, validate required fields and save any unsaved changes
    if (value) {
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

      // Prepare updates object with unsaved changes and enabled status
      const updates: any = { enabled: value };

      // Check for unsaved changes and include them in the batch update
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

      // Save all changes in a single batch update
      await updateSmartRoutingConfigBatch(updates);
    } else {
      // If disabling, just update the enabled status
      await updateSmartRoutingConfig('enabled', value);
    }
  };

  const handlePasswordChangeSuccess = () => {
    setTimeout(() => {
      navigate('/');
    }, 2000);
  };

  const handleLanguageChange = (lang: string) => {
    localStorage.setItem('i18nextLng', lang);
    window.location.reload();
  };

  return (
    <div className="container mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('pages.settings.title')}</h1>
        {auth.user?.isAdmin && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100">
            <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            관리자 설정
          </span>
        )}
      </div>

      {/* Language Settings - 모든 사용자 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg py-4 px-6 mb-6 page-card border-l-4 border-blue-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
            </svg>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">{t('pages.settings.language')}</h2>
          </div>
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

      {/* Smart Routing Configuration Settings - 관리자 전용 */}
      <AdminOnly>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg py-4 px-6 mb-6 page-card border-l-4 border-red-500">
        <div
          className="flex justify-between items-center cursor-pointer transition-colors duration-200 hover:text-red-600"
          onClick={() => toggleSection('smartRoutingConfig')}
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">{t('pages.settings.smartRouting')}</h2>
            <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 rounded-full">관리자</span>
          </div>
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
      </AdminOnly>

      {/* Route Configuration Settings - 관리자 전용 */}
      <AdminOnly>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg py-4 px-6 mb-6 border-l-4 border-red-500">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('routingConfig')}
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">{t('pages.settings.routeConfig')}</h2>
            <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 rounded-full">관리자</span>
          </div>
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
      </AdminOnly>

      {/* Installation Configuration Settings - 관리자 전용 */}
      <AdminOnly>
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg py-4 px-6 mb-6 border-l-4 border-red-500">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('installConfig')}
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-red-600 dark:text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">{t('settings.installConfig')}</h2>
            <span className="ml-2 text-xs px-2 py-0.5 bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100 rounded-full">관리자</span>
          </div>
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
      </AdminOnly>

      {/* Change Password - 모든 사용자 */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg py-4 px-6 mb-6 border-l-4 border-green-500">
        <div
          className="flex justify-between items-center cursor-pointer"
          onClick={() => toggleSection('password')}
        >
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h2 className="font-semibold text-gray-800 dark:text-gray-200">{t('auth.changePassword')}</h2>
          </div>
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
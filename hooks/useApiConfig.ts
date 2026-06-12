import { useEffect, useState } from 'react';
import { useSettingsStore } from '@/stores/settingsStore';
import { api } from '@/services/api';
import { buildApiConfigStatus, ApiConfigStatus } from './apiConfigState';
import { isLocalModeApiBaseUrl } from '@/utils/localMode';

export const useApiConfig = () => {
  const { apiBaseUrl, serverConfig, isLoadingServerConfig } = useSettingsStore();
  const [validationState, setValidationState] = useState<{
    isValidating: boolean;
    isValid: boolean | null;
    error: string | null;
  }>({
    isValidating: false,
    isValid: null,
    error: null,
  });

  const isConfigured = Boolean(apiBaseUrl && apiBaseUrl.trim());
  const isLocalMode = isLocalModeApiBaseUrl(apiBaseUrl);

  // Validate API configuration when it changes
  useEffect(() => {
    if (!isConfigured || isLocalMode) {
      setValidationState({
        isValidating: false,
        isValid: isLocalMode ? true : false,
        error: null,
      });
      return;
    }

    const validateConfig = async () => {
      setValidationState(prev => ({ ...prev, isValidating: true, error: null }));

      try {
        await api.getServerConfig();
        setValidationState({
          isValidating: false,
          isValid: true,
          error: null,
        });
      } catch (error) {
        let errorMessage = '服务器连接失败';

        if (error instanceof Error) {
          switch (error.message) {
            case 'API_URL_NOT_SET':
              errorMessage = 'API地址未设置';
              break;
            case 'UNAUTHORIZED':
              errorMessage = '服务器认证失败';
              break;
            default:
              if (error.message.includes('Network')) {
                errorMessage = '网络连接失败，请检查网络或服务器地址';
              } else if (error.message.includes('timeout')) {
                errorMessage = '连接超时，请检查服务器地址';
              } else if (error.message.includes('404')) {
                errorMessage = '服务器地址无效，请检查API路径';
              } else if (error.message.includes('500')) {
                errorMessage = '服务器内部错误';
              }
              break;
          }
        }

        setValidationState({
          isValidating: false,
          isValid: false,
          error: errorMessage,
        });
      }
    };

    // Only validate if not already loading server config
    if (!isLoadingServerConfig) {
      validateConfig();
    }
  }, [apiBaseUrl, isConfigured, isLoadingServerConfig, isLocalMode]);

  // Reset validation when server config loading state changes
  useEffect(() => {
    if (isLoadingServerConfig) {
      setValidationState(prev => ({ ...prev, isValidating: true, error: null }));
    }
  }, [isLoadingServerConfig]);

  // Update validation state based on server config
  useEffect(() => {
    if (!isLoadingServerConfig && isConfigured && !isLocalMode) {
      if (serverConfig) {
        setValidationState(prev => ({ ...prev, isValid: true, error: null }));
      } else {
        setValidationState(prev => ({
          ...prev,
          isValid: false,
          error: prev.error || '无法获取服务器配置'
        }));
      }
    }
  }, [serverConfig, isLoadingServerConfig, isConfigured, isLocalMode]);

  const status = buildApiConfigStatus({
    apiBaseUrl,
    serverConfig,
    isLoadingServerConfig,
    validationState,
  });

  return status;
};

export const getApiConfigErrorMessage = (status: ApiConfigStatus): string => {
  if (status.needsConfiguration) {
    return '请点击右上角设置按钮，配置兼容服务器地址，或直接使用内置 LunaTV';
  }

  if (status.error) {
    return status.error;
  }

  if (status.isValidating) {
    return '正在验证兼容服务器配置...';
  }

  if (status.isValid === false) {
    return '服务器配置验证失败，请检查设置';
  }

  return '加载失败，请重试';
};

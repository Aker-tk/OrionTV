import { ServerConfig } from "@/services/api";
import { isLocalModeApiBaseUrl } from "@/utils/localMode";

export interface ApiValidationState {
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
}

export interface ApiConfigStatus {
  isConfigured: boolean;
  isValidating: boolean;
  isValid: boolean | null;
  error: string | null;
  needsConfiguration: boolean;
  isLocalMode: boolean;
}

interface BuildApiConfigStatusArgs {
  apiBaseUrl: string;
  serverConfig: ServerConfig | null;
  isLoadingServerConfig: boolean;
  validationState: ApiValidationState;
}

export function buildApiConfigStatus({
  apiBaseUrl,
  serverConfig,
  isLoadingServerConfig,
  validationState,
}: BuildApiConfigStatusArgs): ApiConfigStatus {
  const isLocalMode = isLocalModeApiBaseUrl(apiBaseUrl);

  if (isLocalMode) {
    return {
      isConfigured: true,
      isValidating: false,
      isValid: true,
      error: null,
      needsConfiguration: false,
      isLocalMode: true,
    };
  }

  const isConfigured = Boolean(apiBaseUrl && apiBaseUrl.trim());

  return {
    isConfigured,
    isValidating: validationState.isValidating || isLoadingServerConfig,
    isValid: serverConfig ? true : validationState.isValid,
    error: serverConfig ? null : validationState.error,
    needsConfiguration: !isConfigured,
    isLocalMode: false,
  };
}

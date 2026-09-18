export type AppEnvironment = 'development' | 'preview' | 'production';

export type ApiConfig = {
  appEnvironment: AppEnvironment;
  baseUrl: string;
  sessionStorageKey: string;
};

export class ApiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiConfigurationError';
  }
}

function encodeStorageNamespace(value: string) {
  return Array.from(value, (character) => character.charCodeAt(0).toString(16).padStart(4, '0')).join('');
}

export function resolveApiConfig(input: {
  baseUrl?: string;
  appEnvironment?: string;
  isDevelopmentRuntime: boolean;
}): ApiConfig {
  const appEnvironment = input.appEnvironment?.trim();
  if (!appEnvironment || !['development', 'preview', 'production'].includes(appEnvironment)) {
    throw new ApiConfigurationError('EXPO_PUBLIC_APP_ENV must be development, preview, or production.');
  }

  const rawBaseUrl = input.baseUrl?.trim();
  if (!rawBaseUrl) {
    throw new ApiConfigurationError('EXPO_PUBLIC_API_BASE_URL is required.');
  }

  let url: URL;
  try {
    url = new URL(rawBaseUrl);
  } catch {
    throw new ApiConfigurationError('EXPO_PUBLIC_API_BASE_URL must be an absolute URL.');
  }

  if (!['http:', 'https:'].includes(url.protocol) || !url.host || url.username || url.password
    || url.pathname !== '/' || url.search || url.hash) {
    throw new ApiConfigurationError('The API base URL must be a credential-free HTTP(S) origin.');
  }

  const localHttpAllowed = appEnvironment === 'development' && input.isDevelopmentRuntime;
  if (url.protocol !== 'https:' && !localHttpAllowed) {
    throw new ApiConfigurationError('HTTPS is required outside an explicit development runtime.');
  }

  const baseUrl = url.origin;
  return {
    appEnvironment: appEnvironment as AppEnvironment,
    baseUrl,
    sessionStorageKey: `diary.session.v1.${appEnvironment}.${encodeStorageNamespace(baseUrl)}`,
  };
}

export function loadApiConfig() {
  return resolveApiConfig({
    baseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
    isDevelopmentRuntime: __DEV__,
  });
}

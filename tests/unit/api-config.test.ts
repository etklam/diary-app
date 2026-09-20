import { describe, expect, it } from 'vitest';

import { ApiConfigurationError, resolveApiConfig } from '../../src/config/api';

describe('resolveApiConfig', () => {
  it('accepts local HTTP only for an explicit development runtime', () => {
    expect(resolveApiConfig({
      baseUrl: 'http://10.0.2.2:3101',
      appEnvironment: 'development',
      isDevelopmentRuntime: true,
    }).baseUrl).toBe('http://10.0.2.2:3101');

    expect(() => resolveApiConfig({
      baseUrl: 'http://10.0.2.2:3101',
      appEnvironment: 'production',
      isDevelopmentRuntime: true,
    })).toThrow(ApiConfigurationError);
  });

  it('rejects paths, credentials, and missing environments', () => {
    for (const baseUrl of ['https://api.example.test/v1', 'https://name:secret@api.example.test']) {
      expect(() => resolveApiConfig({ baseUrl, appEnvironment: 'preview', isDevelopmentRuntime: false }))
        .toThrow(ApiConfigurationError);
    }
    expect(() => resolveApiConfig({ baseUrl: 'https://api.example.test', isDevelopmentRuntime: false }))
      .toThrow(ApiConfigurationError);
  });

  it('isolates secure storage when the environment or origin changes', () => {
    const first = resolveApiConfig({ baseUrl: 'https://one.operator-approved.org', appEnvironment: 'preview', isDevelopmentRuntime: false });
    const second = resolveApiConfig({ baseUrl: 'https://two.operator-approved.org', appEnvironment: 'preview', isDevelopmentRuntime: false });
    const production = resolveApiConfig({ baseUrl: 'https://one.operator-approved.org', appEnvironment: 'production', isDevelopmentRuntime: false });
    expect(new Set([first.sessionStorageKey, second.sessionStorageKey, production.sessionStorageKey]).size).toBe(3);
  });
});

export const screens = ['login', 'account', 'diary-read', 'quick', 'review-editor', 'diary-editor', 'root', 'help'] as const;
export type SupportScreen = typeof screens[number];
const codes = new Set(['AUTH_UNAUTHORIZED', 'AUTH_LOGIN_INVALID_CREDENTIALS', 'DIARY_NOT_FOUND', 'DIARY_ALREADY_EXISTS', 'SYS_VALIDATION_ERROR', 'SERVICE_UNAVAILABLE', 'network', 'server', 'storage', 'validation', 'session', 'conflict', 'invalid-response', 'not-found', 'connection', 'invalid-credentials', 'logout-unconfirmed', 'session-invalid', 'configuration-error', 'RENDER_ERROR', 'UNKNOWN_WRITE']);
export function safeFailure(input: { code?: unknown; requestId?: unknown }) {
  return {
    code: typeof input.code === 'string' && codes.has(input.code) ? input.code : 'unavailable',
    // The backend's UUID request ID is correlation metadata, never a resource ID.
    requestId: typeof input.requestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.requestId) ? input.requestId : 'unavailable',
  };
}
export function diagnosticSummary(input: { version?: unknown; build?: unknown; osVersion?: unknown; platform?: unknown; environment?: unknown; screen?: unknown; code?: unknown; requestId?: unknown }) {
  const version = typeof input.version === 'string' && /^\d+(\.\d+){1,3}([+-][a-zA-Z0-9.-]{1,24})?$/.test(input.version) ? input.version : 'unavailable';
  const build = typeof input.build === 'string' && /^\d{1,10}$/.test(input.build) ? input.build : 'unavailable';
  const os = String(input.osVersion ?? '');
  const failure = safeFailure(input);
  return ['Trade Basic diagnostic', `Version: ${version}`, `Build: ${build}`,
    `Platform: ${['android', 'ios', 'web'].includes(String(input.platform)) ? input.platform : 'unavailable'}`,
    `OS: ${/^\d+(\.\d+){0,3}$/.test(os) ? os : 'unavailable'}`,
    `Environment: ${['development', 'preview', 'production'].includes(String(input.environment)) ? input.environment : 'unavailable'}`,
    `Screen: ${screens.includes(input.screen as SupportScreen) ? input.screen : 'help'}`,
    `Error: ${failure.code}`, `Request: ${failure.requestId}`].join('\n');
}

// Metadata only, memory only. Clear on every auth epoch change; never retain bodies.
const failures = new Map<SupportScreen, ReturnType<typeof safeFailure>>();
export const reportMetadata = {
  set: (screen: SupportScreen, value: { code?: unknown; requestId?: unknown }) => failures.set(screen, safeFailure(value)),
  get: (screen: SupportScreen) => failures.get(screen),
  reset: (screen: SupportScreen) => { failures.delete(screen); },
  clear: () => failures.clear(),
};

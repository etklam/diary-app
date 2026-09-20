import { createApiClient, createNativeSession, type NativeSessionStorage } from '@diary/api-client';
import {
  apiErrorResponseSchema,
  authUserResponseSchema,
  type AuthUser,
  type LoginRequest,
  type NativeSession,
} from '@diary/contracts';

import type { ApiConfig } from '@/config/api';

export type AuthVerification =
  | { ok: true; user: AuthUser }
  | { ok: false; status: number; code: string | null };

export type AuthRuntime = {
  login(credentials: LoginRequest): Promise<NativeSession>;
  logout(): Promise<void>;
  verifyCurrentUser(): Promise<AuthVerification>;
};

export function createTimeoutFetch(
  transport: typeof globalThis.fetch,
  timeoutMs = 10_000,
): typeof globalThis.fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const existingSignal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
    const forwardAbort = () => controller.abort(existingSignal?.reason);
    if (existingSignal?.aborted) forwardAbort();
    else existingSignal?.addEventListener('abort', forwardAbort, { once: true });
    const timeout = setTimeout(() => controller.abort(new Error('API request timed out.')), timeoutMs);
    try {
      return await transport(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timeout);
      existingSignal?.removeEventListener('abort', forwardAbort);
    }
  };
}

export function createAuthRuntime(
  config: ApiConfig,
  storage: NativeSessionStorage,
  transport?: typeof globalThis.fetch,
): AuthRuntime & { api: ReturnType<typeof createApiClient> } {
  const fetchWithTimeout = createTimeoutFetch(transport ?? globalThis.fetch);
  const nativeSession = createNativeSession({
    baseUrl: config.baseUrl,
    storage,
    fetch: fetchWithTimeout,
  });
  const api = createApiClient({ baseUrl: config.baseUrl, fetch: nativeSession.fetch });

  return {
    api,
    login: nativeSession.login,
    logout: nativeSession.logout,
    async verifyCurrentUser() {
      const result = await api.GET('/api/auth/me');
      if (result.response.ok && result.data) {
        return { ok: true, user: authUserResponseSchema.parse(result.data).data };
      }
      const parsed = apiErrorResponseSchema.safeParse(result.error);
      return {
        ok: false,
        status: result.response.status,
        code: parsed.success ? parsed.data.data.code : null,
      };
    },
  };
}

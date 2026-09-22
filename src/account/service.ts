import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema, registerRequestSchema, registerResponseSchema, changePasswordRequestSchema, changePasswordResponseSchema, authMutationResponseSchema } from '@diary/contracts';
import { userSettingsResponseSchema, updateUserSettingsSchema } from '@diary/contracts/settings';
import type { DiaryReadScope } from '../diaries/access';

export class AccountFailure extends Error {
  constructor(readonly kind: 'rejected' | 'uncertain' | 'stale', readonly code?: string, readonly fields: string[] = []) { super(kind); }
}
type Api = ReturnType<typeof createApiClient>;
type Result = { response: Response; data?: unknown; error?: unknown };
const headers = { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' };
function accepted(result: Result) {
  if (result.response.ok) return result.data;
  const error = apiErrorResponseSchema.safeParse(result.error);
  if (error.success && error.data.statusCode === result.response.status && result.response.status >= 400 && result.response.status < 500) {
    throw new AccountFailure('rejected', error.data.data.code, error.data.data.details?.flatMap(d => d.field ? [d.field] : []) ?? []);
  }
  throw new AccountFailure('uncertain');
}
export async function registerAccount(api: Api, input: unknown) {
  const body = registerRequestSchema.parse(input);
  try { return registerResponseSchema.parse(accepted(await api.POST('/api/auth/register', { body, headers }))); }
  catch (error) { if (error instanceof AccountFailure) throw error; throw new AccountFailure('uncertain'); }
}
export function accountService(api: Api, scope: Pick<DiaryReadScope, 'isCurrent'>) {
  const check = () => { if (!scope.isCurrent()) throw new AccountFailure('stale'); };
  const run = async <T>(request: () => Promise<Result>, parse: (data: unknown) => T) => {
    check();
    try { const result = await request(); check(); return parse(accepted(result)); }
    catch (error) { check(); if (error instanceof AccountFailure) throw error; throw new AccountFailure('uncertain'); }
  };
  return {
    read: () => run(() => api.GET('/api/user/settings'), data => userSettingsResponseSchema.parse(data).settings),
    save(input: unknown) {
      const body = updateUserSettingsSchema.parse(input);
      return run(() => api.PUT('/api/user/settings', { body, headers }), data => userSettingsResponseSchema.parse(data).settings);
    },
    password(input: unknown) {
      const body = changePasswordRequestSchema.parse(input);
      return run(() => api.PUT('/api/user/password', { body, headers }), data => changePasswordResponseSchema.parse(data));
    },
    logoutAll: () => run(() => api.POST('/api/auth/logout-all', { headers }), data => authMutationResponseSchema.parse(data)),
  };
}

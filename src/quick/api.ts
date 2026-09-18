import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema, diaryByDateResponseSchema, diaryResponseSchema, type DiaryResponse } from '@diary/contracts';
import type { AuthLifecycle } from '../auth/lifecycle';
import { ReadError, StaleRead } from '../diaries/access';
import type { QuickPayload } from './model';

export type QuickApi = {
  ownerId: string;
  isCurrent(): boolean;
  byDate(date: string): Promise<DiaryResponse | null>;
  write(payload: QuickPayload): Promise<{ ok: true; diary: DiaryResponse } | { ok: false; status: number; code: string | null }>;
  recoverSession(): Promise<void>;
  changed(): void;
};
export function createQuickApi(api: ReturnType<typeof createApiClient>, owner: Pick<QuickApi, 'ownerId' | 'isCurrent' | 'changed'>, lifecycle: AuthLifecycle): QuickApi {
  const check = () => { if (!owner.isCurrent()) throw new StaleRead(); };
  return {
    ...owner,
    recoverSession: async () => { if (owner.isCurrent()) await lifecycle.retryVerification(); },
    async byDate(date) {
      check();
      const result = await api.GET('/api/diaries/by-date', { params: { query: { date } } });
      check();
      if (result.response.status === 401) { await lifecycle.retryVerification(); throw new ReadError('session'); }
      if (!result.response.ok) throw new ReadError('server');
      const diary = diaryByDateResponseSchema.parse(result.data);
      if (diary && (diary.userId !== owner.ownerId || diary.date !== date)) throw new ReadError('invalid-response');
      return diary;
    },
    async write(payload) {
      check();
      // Preserve HTTP status even if an error response isn't valid JSON. A malformed
      // success body remains uncertain because it cannot identify the saved diary.
      const result = await api.POST('/api/diaries', { body: payload, parseAs: 'text',
        headers: { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' } });
      check();
      if (!result.response.ok) {
        let code: string | null = null;
        try {
          const errorBody: unknown = result.error;
          const parsed = apiErrorResponseSchema.safeParse(typeof errorBody === 'string' ? JSON.parse(errorBody) : errorBody);
          if (parsed.success) code = parsed.data.data.code;
        } catch { /* Only the status is needed for a definitive failure. */ }
        return { ok: false, status: result.response.status, code };
      }
      const diary = diaryResponseSchema.parse(JSON.parse(result.data ?? ''));
      if (diary.userId !== owner.ownerId || diary.date !== payload.date) throw new ReadError('invalid-response');
      return { ok: true, diary };
    },
  };
}

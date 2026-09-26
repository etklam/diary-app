import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema, serializedIdSchema } from '@diary/contracts';
import { alertListResponseSchema, alertResponseSchema } from '@diary/contracts/alerts';

export class ReminderFailure extends Error {
  constructor(readonly kind: 'rejected' | 'uncertain' | 'session' | 'stale', readonly code?: string) { super(kind); }
}
export function reminderService(api: ReturnType<typeof createApiClient>, scope: { isCurrent(): boolean }) {
  const check = () => { if (!scope.isCurrent()) throw new ReminderFailure('stale'); };
  const run = async <T>(request: () => Promise<{ response: Response; data?: unknown; error?: unknown }>, parse: (data: unknown) => T) => {
    check();
    try {
      const result = await request(); check();
      if (!result.response.ok) {
        const error = apiErrorResponseSchema.safeParse(result.error);
        const code = error.success && error.data.statusCode === result.response.status ? error.data.data.code : undefined;
        if (result.response.status === 401) throw new ReminderFailure('session', code);
        throw new ReminderFailure(result.response.status >= 400 && result.response.status < 500 && code ? 'rejected' : 'uncertain', code);
      }
      return parse(result.data);
    } catch (error) { check(); throw error instanceof ReminderFailure ? error : new ReminderFailure('uncertain'); }
  };
  return {
    read(signal?: AbortSignal) { return run(() => api.GET('/api/alerts', { signal }), data => alertListResponseSchema.parse(data)); },
    dismiss(id: string) {
      serializedIdSchema.parse(id);
      return run(() => api.PUT('/api/alerts/{id}/dismiss', { params: { path: { id } }, headers: { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' } }), data => {
        const row = alertResponseSchema.parse(data);
        if (row.id !== id || !row.isDismissed) throw new ReminderFailure('uncertain');
        return row;
      });
    },
  };
}
export type ReminderService = ReturnType<typeof reminderService>;

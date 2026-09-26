import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema, deleteDiaryResponseSchema } from '@diary/contracts';
import { disciplineListSchema, disciplineResponseSchema, randomDisciplineSchema, reorderDisciplinesSchema, writeDisciplineSchema } from '@diary/contracts/discipline';
import { exportDisciplineResponseSchema, importDisciplineRequestSchema, importDisciplineResponseSchema, parseDisciplineShare } from '@diary/contracts/discipline-share';
import type { DiaryReadScope } from '@/diaries/access';

type Api = ReturnType<typeof createApiClient>;
type Result = { response: Response; data?: unknown; error?: unknown };

export class DisciplineFailure extends Error {
  constructor(readonly kind: 'rejected' | 'uncertain' | 'session' | 'stale', readonly code?: string) { super(kind); }
}

export function disciplineService(api: Api, scope: Pick<DiaryReadScope, 'isCurrent'>) {
  const check = () => { if (!scope.isCurrent()) throw new DisciplineFailure('stale'); };
  const run = async <T>(request: () => Promise<Result>, parse: (data: unknown) => T) => {
    check();
    try {
      const result = await request();
      check();
      if (!result.response.ok) {
        const parsed = apiErrorResponseSchema.safeParse(result.error);
        const code = parsed.success && parsed.data.statusCode === result.response.status ? parsed.data.data.code : undefined;
        if (result.response.status === 401) throw new DisciplineFailure('session', code);
        if (result.response.status >= 400 && result.response.status < 500 && code) throw new DisciplineFailure('rejected', code);
        throw new DisciplineFailure('uncertain', code);
      }
      try { return parse(result.data); } catch { throw new DisciplineFailure('uncertain'); }
    } catch (error) {
      check();
      if (error instanceof DisciplineFailure) throw error;
      throw new DisciplineFailure('uncertain');
    }
  };
  const noRetry = { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' };
  return {
    read(signal?: AbortSignal) { return run(() => api.GET('/api/discipline', { signal }), data => disciplineListSchema.parse(data)); },
    exportShare(query: { title?: string; description?: string; includeAuthor: boolean }, signal?: AbortSignal) {
      return run(() => api.GET('/api/discipline/export', { params: { query: { ...query, includeAuthor: query.includeAuthor ? 'true' : 'false' } }, signal }), data => exportDisciplineResponseSchema.parse(data));
    },
    importShare(json: string, replaceExisting: boolean) {
      const body = importDisciplineRequestSchema.parse({ json, replaceExisting });
      const preview = parseDisciplineShare(body.json);
      return run(() => api.POST('/api/discipline/import', { body, headers: noRetry }), data => {
        const result = importDisciplineResponseSchema.parse(data);
        if (result.imported !== preview.count) throw new Error('Unexpected discipline import count');
        return result;
      });
    },
    random(signal?: AbortSignal) { return run(() => api.GET('/api/discipline/random', { signal }), data => randomDisciplineSchema.parse(data)); },
    create(input: unknown) {
      const body = writeDisciplineSchema.parse(input);
      return run(() => api.POST('/api/discipline', { body, headers: noRetry }), data => {
        const result = disciplineResponseSchema.parse(data);
        if (result.content !== body.content) throw new Error('Unexpected discipline content');
        return result;
      });
    },
    update(id: string, input: unknown) {
      const body = writeDisciplineSchema.parse(input);
      return run(() => api.PUT('/api/discipline/{id}', { params: { path: { id } }, body, headers: noRetry }), data => {
        const result = disciplineResponseSchema.parse(data);
        if (result.id !== id || result.content !== body.content) throw new Error('Unexpected discipline result');
        return result;
      });
    },
    remove(id: string) { return run(() => api.DELETE('/api/discipline/{id}', { params: { path: { id } }, headers: noRetry }), data => deleteDiaryResponseSchema.parse(data)); },
    reorder(input: unknown) {
      const body = reorderDisciplinesSchema.parse(input);
      return run(() => api.PATCH('/api/discipline/reorder', { body, headers: noRetry }), data => disciplineListSchema.parse(data));
    },
  };
}

export type DisciplineService = ReturnType<typeof disciplineService>;

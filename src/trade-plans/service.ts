import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema } from '@diary/contracts';
import { tradePlanInputSchema, tradePlanListResponseSchema, tradePlanResponseSchema, deleteTradePlanResponseSchema, type TradePlanInput, type TradePlanListQuery } from '@diary/contracts/trade-plan';
import type { DiaryReadScope } from '@/diaries/access';
import { samePlanWrite } from './model';

type Api = ReturnType<typeof createApiClient>;
type Result = { response: Response; data?: unknown; error?: unknown };
export class PlanFailure extends Error {
  constructor(readonly kind: 'rejected' | 'uncertain' | 'session' | 'stale' | 'not-found', readonly code?: string, readonly requestId?: string) { super(kind); }
}
export function tradePlanService(api: Api, scope: Pick<DiaryReadScope, 'ownerId' | 'isCurrent'>) {
  const check = () => { if (!scope.isCurrent()) throw new PlanFailure('stale'); };
  async function run<T>(request: () => Promise<Result>, parse: (value: unknown) => T, mutation = false): Promise<T> {
    check();
    try {
      const result = await request(); check();
      if (!result.response.ok) {
        const parsed = apiErrorResponseSchema.safeParse(result.error);
        const verified = parsed.success && parsed.data.statusCode === result.response.status ? parsed.data.data : null;
        if (result.response.status === 401) throw new PlanFailure('session', verified?.code, verified?.requestId);
        if (result.response.status === 404 && !mutation) throw new PlanFailure('not-found', verified?.code, verified?.requestId);
        if (mutation && result.response.status >= 400 && result.response.status < 500 && verified) throw new PlanFailure('rejected', verified.code, verified.requestId);
        throw new PlanFailure(mutation ? 'uncertain' : 'rejected', verified?.code, verified?.requestId);
      }
      try { return parse(result.data); } catch { throw new PlanFailure(mutation ? 'uncertain' : 'rejected'); }
    } catch (error) {
      check();
      if (error instanceof PlanFailure) throw error;
      throw new PlanFailure(mutation ? 'uncertain' : 'rejected');
    }
  }
  const noRetry = { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' };
  return {
    list(query: TradePlanListQuery, signal?: AbortSignal) {
      return run(() => api.GET('/api/trade-plans', { params: { query }, signal }), value => {
        const page = tradePlanListResponseSchema.parse(value);
        if (page.pagination.page !== query.page || page.data.some(plan => plan.userId !== scope.ownerId)) throw new Error('Unexpected plan list');
        return page;
      });
    },
    detail(id: string, signal?: AbortSignal) {
      if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) return Promise.reject(new PlanFailure('not-found'));
      return run(() => api.GET('/api/trade-plans/{id}', { params: { path: { id } }, signal }), value => {
        const plan = tradePlanResponseSchema.parse(value);
        if (plan.id !== id || plan.userId !== scope.ownerId || (plan.diary?.id ?? null) !== plan.diaryId) throw new Error('Unexpected plan identity');
        return plan;
      });
    },
    create(body: TradePlanInput) {
      const canonical = tradePlanInputSchema.parse(body);
      return run(() => api.POST('/api/trade-plans', { body: canonical, headers: noRetry }), value => {
        const plan = tradePlanResponseSchema.parse(value);
        if (!samePlanWrite(plan, canonical, scope.ownerId)) throw new Error('Unexpected plan result');
        return plan;
      }, true);
    },
    update(id: string, body: TradePlanInput) {
      const canonical = tradePlanInputSchema.parse(body);
      return run(() => api.PUT('/api/trade-plans/{id}', { params: { path: { id } }, body: canonical, headers: noRetry }), value => {
        const plan = tradePlanResponseSchema.parse(value);
        if (!samePlanWrite(plan, canonical, scope.ownerId, id)) throw new Error('Unexpected plan result');
        return plan;
      }, true);
    },
    remove(id: string) { return run(() => api.DELETE('/api/trade-plans/{id}', { params: { path: { id } }, headers: noRetry }), value => deleteTradePlanResponseSchema.parse(value), true); },
  };
}

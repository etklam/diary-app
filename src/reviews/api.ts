import { reportMetadata } from '../beta/diagnostics';
import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema } from '@diary/contracts';
import { diaryReviewResponseSchema } from '@diary/contracts/review';
import { ReadError, StaleRead, type DiaryReadScope } from '../diaries/access';
import type { ReviewPayload, ServerReview } from './model';

export type ReviewApi = {
  ownerId: string; isCurrent(): boolean; read(signal?: AbortSignal): Promise<ServerReview>;
  write(payload: ReviewPayload): Promise<{ ok: true; review: ServerReview } | { ok: false; status: number; code: string | null }>;
  changed(): void;
};
export function createReviewApi(api: ReturnType<typeof createApiClient>, scope: DiaryReadScope, id: string, changed: () => void): ReviewApi {
  const check = () => { if (!scope.isCurrent()) throw new StaleRead(); };
  return { ownerId: scope.ownerId, isCurrent: scope.isCurrent, read: signal => scope.review(id, signal), changed,
    async write(payload) {
      check();
      reportMetadata.reset('review-editor');
      const result = await api.PATCH('/api/diaries/{id}/review', { params: { path: { id } }, body: payload,
        parseAs: 'text', headers: { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' } });
      check();
      if (!result.response.ok) {
        let code: string | null = null;
        try {
          const body: unknown = result.error;
          const parsed = apiErrorResponseSchema.safeParse(typeof body === 'string' ? JSON.parse(body) : body);
          if (parsed.success) { code = parsed.data.data.code; reportMetadata.set('review-editor', parsed.data.data); }
        } catch { /* An unrecognized error is not a rejection receipt. */ }
        return { ok: false, status: result.response.status, code };
      }
      const review = diaryReviewResponseSchema.parse(JSON.parse(result.data ?? ''));
      if (review.id !== id || review.reviewStatus !== 'reviewed' || !review.reviewedAt
        || review.reviewOutcome !== payload.reviewOutcome
        || (['reviewSummary', 'reviewLearning', 'reviewAdjustment'] as const).some(key => review[key] !== (payload[key]?.trim() || null))) throw new ReadError('invalid-response');
      return { ok: true, review };
    },
  };
}

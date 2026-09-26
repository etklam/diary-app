import { NO_AUTOMATIC_SESSION_RETRY_HEADER, type createApiClient } from '@diary/api-client';
import { apiErrorResponseSchema, deleteDiaryResponseSchema } from '@diary/contracts';
import { invitePartnerSchema, partnerListResponseSchema, partnerMutationResponseSchema, updatePartnerSharingSchema, type PartnerLinkResponse } from '@diary/contracts/partners';
import type { DiaryReadScope } from '@/diaries/access';

type Api = ReturnType<typeof createApiClient>;
type Result = { response: Response; data?: unknown; error?: unknown };

export class PartnerFailure extends Error {
  constructor(readonly kind: 'rejected' | 'uncertain' | 'session' | 'stale', readonly code?: string) { super(kind); }
}

export function partnerService(api: Api, scope: Pick<DiaryReadScope, 'isCurrent'>) {
  const check = () => { if (!scope.isCurrent()) throw new PartnerFailure('stale'); };
  const run = async <T>(request: () => Promise<Result>, parse: (value: unknown) => T) => {
    check();
    try {
      const result = await request();
      check();
      if (!result.response.ok) {
        const parsed = apiErrorResponseSchema.safeParse(result.error);
        const code = parsed.success && parsed.data.statusCode === result.response.status ? parsed.data.data.code : undefined;
        if (result.response.status === 401) throw new PartnerFailure('session', code);
        if (result.response.status >= 400 && result.response.status < 500 && code) throw new PartnerFailure('rejected', code);
        throw new PartnerFailure('uncertain', code);
      }
      try { return parse(result.data); } catch { throw new PartnerFailure('uncertain'); }
    } catch (error) {
      check();
      if (error instanceof PartnerFailure) throw error;
      throw new PartnerFailure('uncertain');
    }
  };
  const noRetry = { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' };
  const byId = (id: string) => ({ params: { path: { id } }, headers: noRetry });

  return {
    read(signal?: AbortSignal) { return run(() => api.GET('/api/partners', { signal }), data => partnerListResponseSchema.parse(data)); },
    invite(email: string) {
      const body = invitePartnerSchema.parse({ partnerEmail: email });
      return run(() => api.POST('/api/partners', { body, headers: noRetry }), data => {
        const result = partnerMutationResponseSchema.parse(data);
        if (result.link.initiatedByCurrentUser !== true) throw new Error('Unexpected invitation owner');
        return result.link;
      });
    },
    accept(id: string) {
      return run(() => api.POST('/api/partners/{id}/accept', { ...byId(id) }), data => {
        const result = partnerMutationResponseSchema.parse(data).link;
        if (result.id !== id || result.status !== 'connected') throw new Error('Unexpected partner acceptance result');
        return result;
      });
    },
    updateSharing(id: string, input: unknown) {
      const body = updatePartnerSharingSchema.parse(input);
      return run(() => api.PUT('/api/partners/{id}/sharing', { ...byId(id), body }), data => {
        const result: PartnerLinkResponse = partnerMutationResponseSchema.parse(data).link;
        if (result.id !== id || result.status !== 'connected') throw new Error('Unexpected partner sharing result');
        return result;
      });
    },
    remove(id: string) {
      return run(() => api.DELETE('/api/partners/{id}', { ...byId(id) }), data => deleteDiaryResponseSchema.parse(data));
    },
  };
}

export type PartnerService = ReturnType<typeof partnerService>;

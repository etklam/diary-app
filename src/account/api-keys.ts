import { apiKeyCreateResponseSchema, apiKeyListResponseSchema, createApiKeySchema } from '@diary/contracts/api-keys';
import type { z } from 'zod';
import { AccountFailure } from './service';

export type ApiKeySummary = z.infer<typeof apiKeyListResponseSchema>['keys'][number];
export type ApiKeyScope = z.infer<typeof createApiKeySchema>['scope'];
type CreatedApiKey = z.infer<typeof apiKeyCreateResponseSchema>;

export type ApiKeyOperations = {
  listApiKeys(): Promise<z.infer<typeof apiKeyListResponseSchema>>;
  createApiKey(input: { label: string; scope: ApiKeyScope }): Promise<CreatedApiKey>;
  revokeApiKey(id: string): Promise<{ success: true }>;
};

export type ApiKeysSnapshot = {
  keys: ApiKeySummary[];
  loading: boolean;
  busy: boolean;
  loaded: boolean;
  error: unknown;
  oneTimeSecret: string | null;
  unknownCreateOutcome: boolean;
  confirmedRevocations: string[];
};

const emptySnapshot: ApiKeysSnapshot = {
  keys: [], loading: false, busy: false, loaded: false, error: null,
  oneTimeSecret: null, unknownCreateOutcome: false, confirmedRevocations: [],
};

export function createApiKeysManager(service: ApiKeyOperations) {
  let snapshot = emptySnapshot;
  let disposed = false;
  let loadRevision = 0;
  let listeners = new Set<() => void>();
  const publish = (update: Partial<ApiKeysSnapshot>) => {
    if (disposed) return;
    snapshot = { ...snapshot, ...update };
    listeners.forEach(listener => listener());
  };
  const isConfirmedRevoked = (id: string) => snapshot.confirmedRevocations.includes(id);

  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot() { return snapshot; },
    async refresh() {
      const revision = ++loadRevision;
      publish({ loading: true, error: null });
      try {
        const result = await service.listApiKeys();
        if (disposed || revision !== loadRevision) return;
        const confirmedRevocations = snapshot.confirmedRevocations.filter(id => result.keys.some(key => key.id === id && key.revokedAt === null));
        publish({ keys: result.keys, loaded: true, loading: false, error: null, confirmedRevocations });
      } catch (error) {
        if (!disposed && revision === loadRevision) publish({ loading: false, error });
      }
    },
    async create(label: string, scope: ApiKeyScope) {
      if (disposed || snapshot.busy || snapshot.unknownCreateOutcome) return false;
      publish({ busy: true, error: null, oneTimeSecret: null });
      try {
        const created = await service.createApiKey({ label, scope });
        if (disposed) return false;
        publish({
          keys: [created.key, ...snapshot.keys.filter(key => key.id !== created.key.id)],
          busy: false, error: null, oneTimeSecret: created.rawKey,
          unknownCreateOutcome: false,
          confirmedRevocations: snapshot.confirmedRevocations.filter(id => id !== created.key.id),
        });
        return true;
      } catch (error) {
        if (disposed) return false;
        publish({
          busy: false, error, oneTimeSecret: null,
          unknownCreateOutcome: error instanceof AccountFailure && error.kind === 'uncertain',
        });
        if (error instanceof AccountFailure && error.kind === 'uncertain') void this.refresh();
        return false;
      }
    },
    acknowledgeUnknownCreate() { publish({ unknownCreateOutcome: false, error: null }); },
    async revoke(id: string) {
      if (disposed || snapshot.busy || isConfirmedRevoked(id)) return false;
      publish({ busy: true, error: null });
      try {
        await service.revokeApiKey(id);
        if (disposed) return false;
        publish({ busy: false, error: null, confirmedRevocations: [...new Set([...snapshot.confirmedRevocations, id])] });
        await this.refresh();
        return true;
      } catch (error) {
        if (disposed) return false;
        publish({ busy: false, error });
        return false;
      }
    },
    clearOneTimeSecret() { publish({ oneTimeSecret: null }); },
    dispose() {
      disposed = true;
      loadRevision++;
      snapshot = { ...emptySnapshot };
      listeners.clear();
    },
  };
}

import { describe, expect, it, vi } from 'vitest';
import { createApiClient, NO_AUTOMATIC_SESSION_RETRY_HEADER } from '@diary/api-client';
import { AccountFailure, accountService } from '../../src/account/service';
import { createApiKeysManager } from '../../src/account/api-keys';
import { deferred } from './fixtures';

const secret = `dva_${'a'.repeat(48)}`;
const summary = {
  id: '42', label: 'Research connector', keyPrefix: 'dva_aaaaaaaa', scope: 'AGENT_WRITE' as const,
  lastUsedAt: null, revokedAt: null, createdAt: '2026-09-05T12:00:00.000Z',
};

describe('scoped API key lifecycle', () => {
  it('shows the server secret only in transient create state and keeps list metadata secret-free', async () => {
    const requests: Request[] = [];
    const api = createApiClient({ baseUrl: 'https://diary.example.test', fetch: async input => {
      const request = input as Request;
      requests.push(request);
      expect(request.headers.get(NO_AUTOMATIC_SESSION_RETRY_HEADER)).toBe('1');
      if (request.method === 'POST') return Response.json({ key: summary, rawKey: secret });
      return Response.json({ keys: [summary] });
    } });
    const model = createApiKeysManager(accountService(api, { isCurrent: () => true }));
    await model.refresh();
    expect(model.getSnapshot().keys).toEqual([summary]);
    expect(model.getSnapshot().keys[0]).not.toHaveProperty('rawKey');
    expect(await model.create('Research connector', 'AGENT_WRITE')).toBe(true);
    expect(model.getSnapshot().oneTimeSecret).toBe(secret);
    expect(model.getSnapshot().keys).toEqual([summary]);
    expect(requests.map(request => request.method)).toEqual(['GET', 'POST']);
    model.clearOneTimeSecret();
    expect(model.getSnapshot().oneTimeSecret).toBeNull();
    model.dispose();
    expect(model.getSnapshot().oneTimeSecret).toBeNull();
  });

  it('does not repeat a create after an uncertain response and refreshes metadata only', async () => {
    const listApiKeys = vi.fn().mockResolvedValue({ keys: [] });
    const createApiKey = vi.fn().mockRejectedValue(new AccountFailure('uncertain'));
    const model = createApiKeysManager({ listApiKeys, createApiKey, revokeApiKey: vi.fn() });
    expect(await model.create('Lost response', 'DIARY_CREATE')).toBe(false);
    await vi.waitFor(() => expect(listApiKeys).toHaveBeenCalledOnce());
    expect(createApiKey).toHaveBeenCalledOnce();
    expect(model.getSnapshot()).toMatchObject({ oneTimeSecret: null, keys: [], unknownCreateOutcome: true });
    expect(await model.create('Lost response', 'DIARY_CREATE')).toBe(false);
    expect(createApiKey).toHaveBeenCalledOnce();
    model.acknowledgeUnknownCreate();
    expect(await model.create('Lost response', 'DIARY_CREATE')).toBe(false);
    expect(createApiKey).toHaveBeenCalledTimes(2);
  });

  it('ignores an in-flight one-time secret when the owning screen is disposed', async () => {
    const created = deferred<{ key: typeof summary; rawKey: string }>();
    const model = createApiKeysManager({
      listApiKeys: async () => ({ keys: [] }),
      createApiKey: () => created.promise,
      revokeApiKey: async () => ({ success: true as const }),
    });
    const pending = model.create('Owner-scoped key', 'DIARY_CREATE');
    model.dispose();
    created.resolve({ key: summary, rawKey: secret });
    expect(await pending).toBe(false);
    expect(model.getSnapshot().oneTimeSecret).toBeNull();
    expect(model.getSnapshot().keys).toEqual([]);
  });

  it('keeps a confirmed revocation state if the follow-up metadata read fails', async () => {
    let readCount = 0;
    const model = createApiKeysManager({
      listApiKeys: async () => {
        readCount++;
        if (readCount === 1) return { keys: [summary] };
        throw new AccountFailure('uncertain');
      },
      createApiKey: async () => ({ key: summary, rawKey: secret }),
      revokeApiKey: async () => ({ success: true }),
    });
    await model.refresh();
    expect(await model.revoke(summary.id)).toBe(true);
    expect(model.getSnapshot().confirmedRevocations).toEqual([summary.id]);
    expect(model.getSnapshot().keys).toEqual([summary]);
    expect(model.getSnapshot().error).toMatchObject({ kind: 'uncertain' });
  });
});

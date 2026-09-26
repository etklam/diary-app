import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { createApiKeysManager } from '../../src/account/api-keys';
import { accountService } from '../../src/account/service';

const baseUrl = process.env.DIARY_API_BASE_URL;
const enabled = process.env.DIARY_DISPOSABLE_TEST_ENV === '1' && !!baseUrl;

async function createOwner(label: string) {
  const scenario = randomUUID();
  const compact = scenario.replaceAll('-', '');
  const transport: typeof fetch = (input, init) => {
    const request = new Request(input, init);
    request.headers.set('x-e2e-test-id', scenario);
    request.headers.set('x-forwarded-for', `fd00:${compact.slice(0, 4)}:${compact.slice(4, 8)}:${compact.slice(8, 12)}::1`);
    return fetch(request);
  };
  const credentials = { email: `api-keys-${label}-${scenario}@example.test`, password: 'SyntheticApiKeys2026' };
  const registered = await transport(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
  });
  expect(registered.status).toBe(200);

  let stored: Awaited<ReturnType<ReturnType<typeof createNativeSession>['login']>> | null = null;
  const native = createNativeSession({
    baseUrl: baseUrl!, fetch: transport,
    storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } },
  });
  await native.login(credentials);
  const api = createApiClient({ baseUrl: baseUrl!, fetch: native.fetch });
  return { transport, native, stored: () => stored, service: accountService(api, { isCurrent: () => true }) };
}

describe.runIf(enabled)('F7 disposable API-key acceptance', () => {
  it('creates one-time scoped keys, lists metadata, enforces scope/revocation and leaves other keys active', async () => {
    const owner = await createOwner('owner');
    const other = await createOwner('other');
    const manager = createApiKeysManager(owner.service);
    try {
      await manager.refresh();
      expect(manager.getSnapshot().keys).toEqual([]);
      expect((await other.service.listApiKeys()).keys).toEqual([]);

      expect(await manager.create('Diary writer', 'DIARY_CREATE')).toBe(true);
      const diaryKey = manager.getSnapshot().keys[0]!;
      const diarySecret = manager.getSnapshot().oneTimeSecret!;
      expect(diarySecret).toMatch(/^dva_[0-9a-f]{48}$/);
      expect(diaryKey).toMatchObject({ label: 'Diary writer', scope: 'DIARY_CREATE', keyPrefix: diarySecret.slice(0, 12), revokedAt: null });
      expect(JSON.stringify(manager.getSnapshot())).toContain(diarySecret);

      const denied = await owner.transport(`${baseUrl}/api/agent/stocks/records`, {
        method: 'POST', headers: { 'x-api-key': diarySecret, 'content-type': 'application/json' }, body: JSON.stringify({ records: [] }),
      });
      expect(denied.status).toBe(403);
      const diaryWrite = await owner.transport(`${baseUrl}/api/agent/diaries`, {
        method: 'POST', headers: { 'x-api-key': diarySecret, 'content-type': 'application/json' },
        body: JSON.stringify({ date: '2026-09-26', title: 'Scoped API-key write', content: 'Synthetic acceptance' }),
      });
      expect(diaryWrite.status).toBe(201);

      manager.clearOneTimeSecret();
      await manager.refresh();
      expect(manager.getSnapshot().oneTimeSecret).toBeNull();
      expect(manager.getSnapshot().keys[0]).not.toHaveProperty('rawKey');
      expect(JSON.stringify(manager.getSnapshot())).not.toContain(diarySecret);
      expect(JSON.stringify(owner.stored())).not.toContain(diarySecret);

      expect(await manager.create('Agent writer', 'AGENT_WRITE')).toBe(true);
      const agentKey = manager.getSnapshot().keys[0]!;
      const agentSecret = manager.getSnapshot().oneTimeSecret!;
      const agentWrite = (date: string) => owner.transport(`${baseUrl}/api/agent/diaries`, {
        method: 'POST', headers: { 'x-api-key': agentSecret, 'content-type': 'application/json' },
        body: JSON.stringify({ date, title: 'Agent key acceptance', content: 'Synthetic external content' }),
      });
      expect((await agentWrite('2026-09-27')).status).toBe(201);
      expect(await manager.revoke(diaryKey.id)).toBe(true);
      expect((await owner.transport(`${baseUrl}/api/agent/diaries`, {
        method: 'POST', headers: { 'x-api-key': diarySecret, 'content-type': 'application/json' },
        body: JSON.stringify({ date: '2026-09-28', title: 'Revoked key', content: 'Must be denied' }),
      })).status).toBe(401);
      expect((await agentWrite('2026-09-29')).status).toBe(201);

      await manager.refresh();
      expect(manager.getSnapshot().keys).toHaveLength(2);
      expect(manager.getSnapshot().keys.find(key => key.id === diaryKey.id)?.revokedAt).not.toBeNull();
      expect(manager.getSnapshot().keys.find(key => key.id === agentKey.id)?.revokedAt).toBeNull();
      expect((await other.service.listApiKeys()).keys).toEqual([]);
    } finally {
      manager.dispose();
      await owner.native.logout().catch(() => {});
      await other.native.logout().catch(() => {});
    }
  });
});

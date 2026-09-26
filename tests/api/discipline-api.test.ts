import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { disciplineService } from '../../src/discipline/service';

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
  const credentials = { email: `discipline-${label}-${scenario}@example.test`, password: 'SyntheticDiscipline2026' };
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
  return { native, service: disciplineService(api, { isCurrent: () => true }) };
}

describe.runIf(enabled)('F2 disposable Discipline API acceptance', () => {
  it('keeps a long collection reachable and consistent through edit, random, concurrent reorder/delete and owner isolation', async () => {
    const owner = await createOwner('owner');
    const other = await createOwner('other');
    try {
      expect(await owner.service.read()).toEqual([]);
      expect(await other.service.read()).toEqual([]);

      const created = await Promise.all(Array.from({ length: 128 }, (_, index) =>
        owner.service.create({ content: `Native long-list principle ${index}` })));
      const ids = new Set(created.map(row => row.id));
      expect(ids.size).toBe(128);
      expect(await owner.service.read()).toHaveLength(128);
      expect(await other.service.read()).toEqual([]);

      const edited = await owner.service.update(created[0]!.id, { content: 'Edited from native service' });
      expect(edited.content).toBe('Edited from native service');
      const drawn = await owner.service.random();
      expect(drawn.isCustom).toBe(true);
      expect(created.some(row => row.content === drawn.content)).toBe(true);

      const beforeRace = await owner.service.read();
      const victim = beforeRace[64]!;
      const reorder = owner.service.reorder(beforeRace.map((row, index) => ({ id: row.id, order: beforeRace.length - index - 1 })));
      const remove = owner.service.remove(victim.id);
      const [reordered, removed] = await Promise.allSettled([reorder, remove]);
      expect(removed.status).toBe('fulfilled');

      const afterRace = await owner.service.read();
      expect(afterRace).toHaveLength(127);
      expect(new Set(afterRace.map(row => row.id)).size).toBe(127);
      expect(afterRace.some(row => row.id === victim.id)).toBe(false);
      if (reordered.status === 'rejected') {
        expect(afterRace.map(row => row.id)).toEqual(beforeRace.filter(row => row.id !== victim.id).map(row => row.id));
      } else {
        expect(reordered.value).toHaveLength(128);
      }
      expect(await other.service.read()).toEqual([]);

      await Promise.all(afterRace.map(row => owner.service.remove(row.id)));
      expect(await owner.service.read()).toEqual([]);
    } finally {
      await owner.native.logout().catch(() => {});
      await other.native.logout().catch(() => {});
    }
  }, 60_000);
});

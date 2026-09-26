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
  const credentials = { email: `discipline-transfer-${label}-${scenario}@example.test`, password: 'SyntheticDiscipline2026' };
  const registered = await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
  expect(registered.status).toBe(200);
  let stored: Awaited<ReturnType<ReturnType<typeof createNativeSession>['login']>> | null = null;
  const native = createNativeSession({ baseUrl: baseUrl!, fetch: transport, storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } } });
  await native.login(credentials);
  return { native, service: disciplineService(createApiClient({ baseUrl: baseUrl!, fetch: native.fetch }), { isCurrent: () => true }) };
}

describe.runIf(enabled)('F6 disposable Discipline transfer API acceptance', () => {
  it('exports with explicit attribution opt-in and imports append/replace atomically within the target owner', async () => {
    const source = await createOwner('source');
    const target = await createOwner('target');
    const other = await createOwner('other');
    try {
      await source.service.create({ content: 'Protect downside.' });
      await source.service.create({ content: 'Take the planned exit.' });
      const exported = await source.service.exportShare({ title: 'Risk rules', description: 'A deliberate sample', includeAuthor: false });
      expect(exported.data.title).toBe('Risk rules');
      expect(exported.data.author).toBe('Anonymous');
      expect(exported.data.disciplines.map(row => row.content)).toEqual(['Protect downside.', 'Take the planned exit.']);
      expect(JSON.parse(exported.json)).toMatchObject({ type: 'trading-disciplines', count: 2, title: 'Risk rules' });

      const preexisting = await target.service.create({ content: 'Keep my existing rule.' });
      expect((await target.service.importShare(exported.json, false)).imported).toBe(2);
      const appended = await target.service.read();
      expect(appended.map(row => [row.content, row.order])).toEqual([
        ['Keep my existing rule.', 0], ['Protect downside.', 1], ['Take the planned exit.', 2],
      ]);
      expect(await other.service.read()).toEqual([]);

      expect((await target.service.importShare(exported.json, true)).imported).toBe(2);
      const replaced = await target.service.read();
      expect(replaced.map(row => [row.content, row.order])).toEqual([['Protect downside.', 0], ['Take the planned exit.', 1]]);
      expect(replaced.some(row => row.id === preexisting.id)).toBe(false);
      expect(await other.service.read()).toEqual([]);
    } finally {
      await source.native.logout().catch(() => {});
      await target.native.logout().catch(() => {});
      await other.native.logout().catch(() => {});
    }
  }, 60_000);
});

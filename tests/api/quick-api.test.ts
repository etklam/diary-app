import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { describe, expect, it, vi } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { diaryByDateResponseSchema, diaryResponseSchema, type NativeSession } from '@diary/contracts';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createQuickApi } from '../../src/quick/api';
import { createQuickController } from '../../src/quick/controller';
import { openDraftRepository, type DraftDatabase } from '../../src/quick/repository';

const enabled = process.env.DIARY_DISPOSABLE_TEST_ENV === '1';
describe.runIf(enabled)('P1B real API acceptance', () => {
  it('creates, appends, isolates owners and reconciles committed response loss without duplicate writes', async () => {
    const baseUrl = process.env.DIARY_API_BASE_URL!;
    expect(['localhost', '127.0.0.1', '[::1]']).toContain(new URL(baseUrl).hostname);
    const registered: { email: string; password: string }[] = [];
    const clients: ReturnType<typeof createNativeSession>[] = [];
    const cleanupIds = new Set<string>();
    const scenario = randomUUID();
    const clientId = scenario.replaceAll('-', '');
    const testClientIp = `fd00:${clientId.slice(0, 4)}:${clientId.slice(4, 8)}:${clientId.slice(8, 12)}::1`;
    let loseResponse = false;
    let postCount = 0;
    const transport: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      request.headers.set('x-e2e-test-id', scenario);
      request.headers.set('x-forwarded-for', testClientIp);
      const write = request.method === 'POST' && new URL(request.url).pathname === '/api/diaries';
      if (write) postCount++;
      const response = await fetch(request);
      if (write && loseResponse && response.ok) {
        loseResponse = false;
        const committed = diaryResponseSchema.parse(await response.json());
        cleanupIds.add(committed.id);
        throw new TypeError('Synthetic response loss after real server commit');
      }
      return response;
    };
    const register = async (label: string) => {
      const credentials = { email: `p1b-${label}-${randomUUID().slice(0, 8)}@example.test`, password: 'SyntheticP1b2026' };
      const response = await fetch(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-e2e-test-id': scenario, 'x-forwarded-for': testClientIp }, body: JSON.stringify(credentials) });
      expect(response.status).toBe(200); registered.push(credentials);
      let stored: NativeSession | null = null;
      const storage = { get: () => stored, set: (value: NativeSession) => { stored = value; }, clear: () => { stored = null; } };
      const native = createNativeSession({ baseUrl, storage, fetch: transport }); clients.push(native);
      const login = await native.login(credentials);
      const api = createApiClient({ baseUrl, fetch: native.fetch });
      const lifecycle = createAuthLifecycle({ storage, runtime: { login: native.login, logout: native.logout, verifyCurrentUser: async () => ({ ok: true, user: login.user }) } });
      await lifecycle.bootstrap();
      const changed = vi.fn();
      const quick = createQuickApi(api, { ownerId: login.user.id, isCurrent: () => true, changed }, lifecycle);
      return { api, quick, changed, ownerId: login.user.id };
    };
    const a = await register('a'); const b = await register('b');
    const db = new DatabaseSync(':memory:');
    const adapter: DraftDatabase = { execAsync: async query => { db.exec(query); }, runAsync: async (query, ...params) => db.prepare(query).run(...params),
      getFirstAsync: async <T>(query: string, ...params: (string | number | null)[]) => (db.prepare(query).get(...params) as T | undefined) ?? null };
    const repo = await openDraftRepository(adapter);
    const controller = () => createQuickController({ scope: baseUrl, timezone: 'Asia/Taipei', api: a.quick, repository: Promise.resolve(repo), attemptId: randomUUID });
    const body = { title: 'Synthetic quick title', content: 'Synthetic original\nExact second line  ', date: '2020-02-01', tags: ['first'], stockSymbols: ['SYN'] };
    try {
      expect(await a.quick.byDate(body.date)).toBeNull();
      const created = await a.api.POST('/api/diaries', { body: { ...body, transactions: [
        { symbol: 'SYN', type: 'BUY', quantity: '0.25', price: '10.1', tradeDate: '2020-02-01T12:00:00.000Z' },
      ] } });
      expect(created.response.status).toBe(201);
      const original = diaryResponseSchema.parse(created.data); cleanupIds.add(original.id);
      expect(typeof original.id).toBe('string'); expect(original).toMatchObject(body);
      expect(original.transactions).toHaveLength(1);
      expect((await a.quick.byDate(body.date))?.id).toBe(original.id);
      const appended = await a.api.POST('/api/diaries', { body: { ...body, title: 'Ignored append title', content: 'Synthetic append', tags: ['second', 'first'], stockSymbols: ['NEW', 'SYN'], appendToToday: true } });
      expect(appended.response.status).toBe(201);
      const result = diaryResponseSchema.parse(appended.data);
      expect(result.id).toBe(original.id); expect(result.title).toBe(body.title);
      expect(result.content).toBe(`${body.content}\n\n---\n\nSynthetic append`);
      expect(result.transactions).toEqual(original.transactions);
      expect(result.tags).toEqual(['first', 'second']); expect([...result.stockSymbols].sort()).toEqual(['NEW', 'SYN']);

      const concurrent = await Promise.all((['A', 'B'] as const).map(suffix => a.api.POST('/api/diaries', { body: {
        ...body, title: `Ignored concurrent title ${suffix}`, content: `Concurrent append ${suffix}`,
        tags: [`concurrent-${suffix.toLowerCase()}`], stockSymbols: [`SYM${suffix}`], appendToToday: true,
      } })));
      expect(concurrent.map(item => item.response.status)).toEqual([201, 201]);
      expect(concurrent.map(item => diaryResponseSchema.parse(item.data).id)).toEqual([original.id, original.id]);
      const concurrentRead = await a.quick.byDate(body.date);
      expect(concurrentRead?.content).toContain('Synthetic original');
      expect(concurrentRead?.content).toContain('Synthetic append');
      expect(concurrentRead?.content).toContain('Concurrent append A');
      expect(concurrentRead?.content).toContain('Concurrent append B');
      expect(concurrentRead?.tags).toEqual(expect.arrayContaining(['first', 'second', 'concurrent-a', 'concurrent-b']));
      expect(concurrentRead?.stockSymbols).toEqual(expect.arrayContaining(['SYN', 'NEW', 'SYMA', 'SYMB']));
      expect(concurrentRead?.transactions).toEqual(original.transactions);

      for (const [type, daysAgo, price] of [['BUY', 3, '10.1'], ['SELL', 2, '20.2']] as const) {
        const tradeDate = new Date(Date.now() - daysAgo * 86_400_000).toISOString();
        const response = await a.api.POST('/api/diaries', { body: {
          date: tradeDate.slice(0, 10), title: `Synthetic ${type} source`, content: 'Controlled transaction.',
          transactions: [{ symbol: 'SYN', type, quantity: '0.1', price, tradeDate }],
        } });
        expect(response.response.status).toBe(201);
        cleanupIds.add(diaryResponseSchema.parse(response.data).id);
      }
      expect(await a.quick.recentClosedTrades()).toEqual(expect.arrayContaining([
        expect.objectContaining({ symbol: 'SYN', sellQuantity: '0.1', realizedPnL: '1.01', realizedPnLPct: '100' }),
      ]));

      const conflict = await a.quick.write(body);
      expect(conflict).toMatchObject({ ok: false, status: 409, code: 'DIARY_ALREADY_EXISTS' });
      const other = await b.api.GET('/api/diaries/by-date', { params: { query: { date: body.date } } });
      expect(diaryByDateResponseSchema.parse(other.data)).toBeNull();

      for (const mode of ['create', 'append'] as const) {
        const model = controller(); await model.start();
        const date = mode === 'create' ? '2020-02-02' : body.date;
        model.edit({ date, mode, content: `Synthetic lost ${mode} response`, title: 'Synthetic recovered title', tags: 'recovered', stockSymbols: 'RCV' });
        const before = postCount; loseResponse = true;
        await model.save();
        expect(model.getSnapshot().draft.writeState).toBe('uncertain');
        expect(postCount - before).toBe(1);
        await model.save(); expect(postCount - before).toBe(1);
        // Reopen from the persisted uncertain record with the actual controller.
        model.invalidate();
        const restored = controller(); await restored.start();
        expect(postCount - before).toBe(1);
        await restored.checkResult();
        expect(restored.getSnapshot().recovery).toBe('applied');
        expect(postCount - before).toBe(1);
        expect(await repo.load(baseUrl, a.ownerId)).toBeNull();
        const latest = await a.quick.byDate(date);
        expect(latest?.content?.split(`Synthetic lost ${mode} response`)).toHaveLength(2);
        if (mode === 'append') expect(latest?.id).toBe(original.id);
        restored.invalidate();
      }
      expect(a.changed).toHaveBeenCalledTimes(2);
      if (process.env.DIARY_FAULT_PROXY === '1') {
        const control = async (mode?: string) => (await fetch(`http://127.0.0.1:3102/${mode ? `?mode=${mode}` : ''}`)).json();
        for (const mode of ['committed502', 'committed503', 'committed504', 'delayed']) {
          await control('normal');
          const model = controller(); await model.start();
          model.edit({ date: body.date, mode: 'append', content: `Synthetic gate ${mode}` });
          const before = await control(mode);
          await model.save();
          expect(model.getSnapshot().draft.writeState).toBe('uncertain');
          expect((await repo.load(baseUrl, a.ownerId))?.attempt).not.toBeNull();
          await model.save();
          if (mode === 'delayed') {
            await model.checkResult(); expect(model.getSnapshot().recovery).toBe('pending');
            await model.save(); expect((await control()).posts).toBe(before.posts + 1);
            await control('release');
            await vi.waitFor(async () => expect((await control()).commits).toBe(before.commits + 1));
          }
          await model.checkResult(); expect(model.getSnapshot().recovery).toBe('applied');
          const after = await control(); expect(after.posts).toBe(before.posts + 1); expect(after.commits).toBe(before.commits + 1);
          expect((await a.quick.byDate(body.date))?.content?.split(`Synthetic gate ${mode}`)).toHaveLength(2);
          model.invalidate();
        }
        await control('normal');
        console.log('P1C safety gate: committed non-JSON 502/503/504 and delayed commit after unchanged reconciliation; one POST each: PASS');
      }
      if (process.env.DIARY_KEEP_VM_ACCOUNTS === '1') {
        await mkdir('.expo', { recursive: true });
        await writeFile('.expo/p1b-fixtures.json', JSON.stringify({ a: registered[0], b: registered[1], ownerA: a.ownerId, ownerB: b.ownerId }));
      }
      console.log('P1B API: create, sequential/concurrent append with transaction/tag/symbol preservation, recent closed trade, owner isolation, response-loss reconciliation and zero duplicate POST: PASS');
    } finally {
      // Remove later sales before their buys so the ledger remains valid at each delete.
      for (const id of [...cleanupIds].reverse()) expect((await a.api.DELETE('/api/diaries/{id}', { params: { path: { id } } })).response.ok).toBe(true);
      for (const native of clients) await native.logout(); db.close();
    }
  }, 30000);
});

import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { diaryResponseSchema, type DiaryResponse } from '@diary/contracts';
import { createApiClient } from '@diary/api-client';
import { createEmptyQuickNoteTemplateData, generateTemplateDraft, mergeQuickTemplate } from '@diary/domain';
import { createAuthLifecycle } from '../../src/auth/lifecycle';
import { createAuthRuntime } from '../../src/auth/runtime';
import { createDiaryAccess } from '../../src/diaries/access';
import { createQuickApi, type QuickApi } from '../../src/quick/api';
import { createQuickController, type QuickController } from '../../src/quick/controller';
import { createQuickManager } from '../../src/quick/manager';
import { draftSchema, newDraft, payloadFor, reconcile, type QuickDraft, type WriteAttempt } from '../../src/quick/model';
import { DraftStorageError, openDraftRepository, unlockDraftDatabase, type DraftDatabase } from '../../src/quick/repository';
import { deferred, session, user } from './fixtures';

const id = '9223372036854775806';
const controllers: QuickController[] = [];
afterEach(() => { controllers.forEach(controller => controller.invalidate()); controllers.length = 0; vi.useRealTimers(); });
function diary(overrides: Partial<DiaryResponse> = {}): DiaryResponse {
  return diaryResponseSchema.parse({ id, userId: '1', title: 'Synthetic title', content: 'Synthetic content', date: '2026-01-01',
    tags: ['one'], tagsString: 'one', stockSymbols: ['SYN'], createdVia: 'WEB', createdByLabel: null,
    createdAt: '2026-01-01T01:00:00.000Z', updatedAt: '2026-01-01T01:00:00.000Z', ...overrides });
}
function draft() {
  return { ...newDraft('development:https://example.test', '1', 'Asia/Taipei', new Date('2025-12-31T23:00:00Z')),
    title: 'Synthetic title', content: 'Synthetic content', tags: 'one', stockSymbols: 'syn' };
}
function sql(db: DatabaseSync): DraftDatabase {
  return { execAsync: async query => { db.exec(query); },
    runAsync: async (query, ...params) => db.prepare(query).run(...params),
    getFirstAsync: async <T>(query: string, ...params: (string | number | null)[]) => (db.prepare(query).get(...params) as T | undefined) ?? null };
}
async function setup(overrides: Partial<QuickApi> = {}, saved?: QuickDraft, pristine = false) {
  const db = new DatabaseSync(':memory:');
  const repo = await openDraftRepository(sql(db));
  if (saved) await repo.save(saved);
  const api: QuickApi = { ownerId: '1', isCurrent: () => true, byDate: vi.fn(async () => null),
    recentClosedTrades: vi.fn(async () => []), spxSession: vi.fn(async () => ({ symbol: 'SPX' as const, sourceSymbol: '^GSPC', condition: 'rangeBound' as const,
      price: 100, previousClose: 100, open: 100, high: null, low: null, change: 0, changePercent: 0, intradayMovePercent: 0, openGapPercent: 0, asOf: '2026-09-26T00:00:00.000Z' })),
    write: vi.fn(async () => ({ ok: true as const, diary: diary() })), recoverSession: vi.fn(async () => {}), changed: vi.fn(), ...overrides };
  const model = createQuickController({ scope: draft().scope, timezone: 'Asia/Taipei', api, repository: Promise.resolve(repo),
    now: () => new Date('2025-12-31T23:00:00Z'), attemptId: () => 'local-attempt' });
  controllers.push(model); await model.start();
  if (!saved && !pristine) model.edit({ title: 'Synthetic title', content: 'Synthetic content', tags: 'one', stockSymbols: 'syn' });
  return { db, repo, api, model };
}

describe('durable scoped repository', () => {
  it('round trips exact fields, civil date and string IDs across a real SQLite reopen', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'quick-synthetic-'));
    const filename = join(directory, 'draft.db');
    let db = new DatabaseSync(filename);
    try {
      const record = { ...draft(), content: 'Synthetic\n\nexact spaces  \r\n文字', mode: 'append' as const, modeChosen: true };
      await (await openDraftRepository(sql(db))).save(record); db.close(); db = new DatabaseSync(filename);
      const repo = await openDraftRepository(sql(db));
      expect(await repo.load(record.scope, '1')).toEqual(record);
      expect(await repo.load(record.scope, '2')).toBeNull();
      expect(await repo.load('production:https://example.test', '1')).toBeNull();
      expect(await repo.load(record.scope, "1' OR 1=1 --")).toBeNull();
      await repo.remove(record.scope, '2'); expect(await repo.load(record.scope, '1')).toEqual(record);
      await repo.remove(record.scope, '1'); expect(await repo.load(record.scope, '1')).toBeNull();
    } finally { db.close(); rmSync(directory, { recursive: true }); }
  });
  it('fails closed on malformed records without removing them', async () => {
    const db = new DatabaseSync(':memory:'); const repo = await openDraftRepository(sql(db));
    db.prepare('INSERT INTO quick_drafts VALUES (?, ?, ?)').run('scope', '1', '{bad json');
    await expect(repo.load('scope', '1')).rejects.toBeInstanceOf(DraftStorageError);
    expect(db.prepare('SELECT count(*) AS count FROM quick_drafts').get()?.count).toBe(1);
    db.close();
  });
  it('validates the row owner and pending-attempt identity', async () => {
    const db = new DatabaseSync(':memory:'); const repo = await openDraftRepository(sql(db));
    db.prepare('INSERT INTO quick_drafts VALUES (?, ?, ?)').run(draft().scope, '2', JSON.stringify(draft()));
    await expect(repo.load(draft().scope, '2')).rejects.toBeInstanceOf(DraftStorageError);
    await expect(repo.save({ ...draft(), writeState: 'saving', attempt: null })).rejects.toBeInstanceOf(DraftStorageError);
    db.close();
  });
  it('uses ordered parameterized writes so discard wins over earlier autosave', async () => {
    const db = new DatabaseSync(':memory:'); const repo = await openDraftRepository(sql(db));
    const saved = repo.save({ ...draft(), content: "synthetic '); DROP TABLE quick_drafts; --" });
    const deleted = repo.remove(draft().scope, '1'); await Promise.all([saved, deleted]);
    expect(await repo.load(draft().scope, '1')).toBeNull(); db.close();
  });
  it('migrates earlier free-writing drafts to non-destructive template defaults', async () => {
    const db = new DatabaseSync(':memory:'); const repo = await openDraftRepository(sql(db));
    const current = draft();
    const { templateKind: _kind, templateData: _data, appliedTemplate: _applied, titleTouched: _titleTouched, ...legacy } = current;
    db.prepare('INSERT INTO quick_drafts(scope, owner_id, record) VALUES (?, ?, ?)').run(current.scope, current.ownerId, JSON.stringify(legacy));
    const restored = await repo.load(current.scope, current.ownerId);
    expect(restored).toMatchObject({ date: current.date, title: current.title, content: current.content, stockSymbols: current.stockSymbols,
      templateKind: 'blank', appliedTemplate: '', titleTouched: false, templateData: { rating: 0, relatedTrades: [] } });
    db.close();
  });
  it('keeps encrypted snippets and recent tags private to their scope and owner', async () => {
    const db = new DatabaseSync(':memory:'); const repo = await openDraftRepository(sql(db));
    const snippets = [{ id: 'custom-one', name: 'Private prompt', content: 'Synthetic private snippet' }];
    await repo.saveSnippets('scope-a', '1', snippets);
    expect(await repo.loadSnippets('scope-a', '1')).toEqual(snippets);
    expect(await repo.loadSnippets('scope-a', '2')).toEqual([]);
    expect(await repo.loadSnippets('scope-b', '1')).toEqual([]);
    expect(await repo.rememberRecentTags('scope-a', '1', [' one ', 'two'])).toEqual(['one', 'two']);
    expect(await repo.rememberRecentTags('scope-a', '1', ['two', 'three'])).toEqual(['two', 'three', 'one']);
    expect(await repo.loadRecentTags('scope-a', '2')).toEqual([]);
    expect(await repo.loadRecentTags('scope-b', '1')).toEqual([]);
    const eight = await repo.rememberRecentTags('scope-a', '1', ['four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']);
    expect(eight).toHaveLength(8); expect(eight[0]).toBe('four');
    db.close();
  });
});

describe('Quick templates and context', () => {
  it('merges localized templates without losing free writing, selected date or symbols', () => {
    const templateData: QuickDraft['templateData'] = { ...createEmptyQuickNoteTemplateData(), rating: 0, noRashTrading: false, relatedTrades: [],
      tradingType: 'buy', symbols: 'MSFT', marketMood: 'bullish', note: 'Watch the open.' };
    const suggested = generateTemplateDraft({ templateKind: 'trading', date: '2026-09-26', locale: 'zh-TW', templateData });
    const original = { ...draft(), date: '2026-09-26', title: 'My own title', content: 'My original reasoning.', stockSymbols: 'AAPL' };
    const merged = mergeQuickTemplate(original.content, suggested.content, original.appliedTemplate);
    const payload = payloadFor({ ...original, content: merged, templateKind: 'trading', templateData });
    expect(suggested.content).toContain('今日操作');
    expect(merged).toContain('My original reasoning.'); expect(merged).toContain('今日操作');
    expect(payload).toMatchObject({ date: '2026-09-26', title: 'My own title', stockSymbols: ['AAPL'], content: merged });
  });
  it('retains exact decimal trade context in an encrypted reflection draft', () => {
    const trade = { id: '77', symbol: 'SYN', sellDate: '2026-09-25T16:00:00.000Z', sellQuantity: '0.0001', realizedPnL: '-0.00001', realizedPnLPct: '-0.01' };
    const record = { ...draft(), templateKind: 'reflection' as const, templateData: { ...createEmptyQuickNoteTemplateData(), rating: 0, noRashTrading: false, relatedTrades: [
      trade,
    ] } };
    const parsed = draftSchema.parse(record);
    expect(parsed.templateData.relatedTrades[0]).toEqual(trade);
  });
});

describe('Quick context API', () => {
  it('loads only validated recent closed trades and preserves decimal strings', async () => {
    const requests: Request[] = [];
    const trade = { id: '77', symbol: 'SYN', sellDate: '2026-09-25T16:00:00.000Z', sellQuantity: '0.0001', realizedPnL: '-0.00001', realizedPnLPct: '-0.01' };
    const client = createApiClient({ baseUrl: 'https://synthetic.example', fetch: async (input, init) => {
      requests.push(new Request(input, init)); return Response.json({ trades: [trade] });
    } });
    let current = true;
    const api = createQuickApi(client, { ownerId: '101', isCurrent: () => current, changed: vi.fn() }, {} as ReturnType<typeof createAuthLifecycle>);
    expect(await api.recentClosedTrades()).toEqual([trade]);
    expect(requests).toHaveLength(1); expect(requests[0]!.url).toBe('https://synthetic.example/api/stats/recent-trades');
    current = false;
    await expect(api.recentClosedTrades()).rejects.toThrow();
    expect(requests).toHaveLength(1);
  });
  it('loads validated SPX context and feeds its source condition into the localized reflection template', async () => {
    const requests: Request[] = [];
    const summary = { symbol: 'SPX' as const, sourceSymbol: '^GSPC', condition: 'strongUp' as const,
      price: 101.5, previousClose: 100, open: 100, high: 102, low: 99, change: 1.5,
      changePercent: 1.5, intradayMovePercent: 1.5, openGapPercent: 0, asOf: '2026-09-26T12:00:00.000Z' };
    const client = createApiClient({ baseUrl: 'https://synthetic.example', fetch: async (input, init) => {
      requests.push(new Request(input, init)); return Response.json(summary);
    } });
    const api = createQuickApi(client, { ownerId: '101', isCurrent: () => true, changed: vi.fn() }, {} as ReturnType<typeof createAuthLifecycle>);
    const context = await api.spxSession();
    expect(context).toEqual(summary);
    expect(requests[0]!.url).toBe('https://synthetic.example/api/market/spx-session');
    const reflection = generateTemplateDraft({ templateKind: 'reflection', date: '2026-09-26', locale: 'en',
      templateData: { ...createEmptyQuickNoteTemplateData(), rating: 0, noRashTrading: false, relatedTrades: [], marketCondition: context.condition } });
    expect(reflection.content).toContain('Strong rally');
  });
});

describe('encryption initialization fails closed', () => {
  function options() {
    const execAsync = vi.fn(async (_query: string) => {});
    return { exists: vi.fn(() => false), getKey: vi.fn(async (): Promise<string | null> => null), setKey: vi.fn(async () => {}),
      randomBytes: vi.fn(async () => new Uint8Array(32).fill(7)),
      open: vi.fn(async (): Promise<DraftDatabase> => ({ execAsync, runAsync: vi.fn(), getFirstAsync: async <T>(query: string) => (query === 'PRAGMA cipher_version' ? { cipher_version: '4.16.0' } : { count: 0 }) as T })), execAsync };
  }
  it('persists one random key, keys before reading tables, and reuses that key', async () => {
    const opts = options(); await unlockDraftDatabase(opts);
    expect(opts.setKey).toHaveBeenCalledOnce(); expect(opts.randomBytes).toHaveBeenCalledOnce();
    expect(opts.execAsync.mock.calls[0][0]).toContain('PRAGMA key');
    opts.getKey.mockResolvedValue('07'.repeat(32)); await unlockDraftDatabase(opts);
    expect(opts.setKey).toHaveBeenCalledOnce(); expect(opts.randomBytes).toHaveBeenCalledOnce();
  });
  it('never generates a replacement key for an existing database', async () => {
    const opts = options(); opts.exists.mockReturnValue(true);
    await expect(unlockDraftDatabase(opts)).rejects.toBeInstanceOf(DraftStorageError);
    expect(opts.setKey).not.toHaveBeenCalled(); expect(opts.open).not.toHaveBeenCalled();
  });
  it('rejects arbitrary key input and secure storage failures before opening', async () => {
    const opts = options(); opts.getKey.mockResolvedValue("'; DROP TABLE x;--");
    await expect(unlockDraftDatabase(opts)).rejects.toBeInstanceOf(DraftStorageError);
    expect(opts.open).not.toHaveBeenCalled();
    opts.getKey.mockRejectedValue(new Error('locked'));
    await expect(unlockDraftDatabase(opts)).rejects.toBeInstanceOf(DraftStorageError);
  });
  it('rejects ordinary SQLite and wrong-key reads without deleting or recreating', async () => {
    const opts = options(); opts.open.mockImplementation(async () => ({ execAsync: opts.execAsync, runAsync: vi.fn(), getFirstAsync: vi.fn(async () => null) }));
    await expect(unlockDraftDatabase(opts)).rejects.toBeInstanceOf(DraftStorageError);
    opts.open.mockImplementation(async () => ({ execAsync: opts.execAsync, runAsync: vi.fn(), getFirstAsync: vi.fn(async () => { throw new Error('not a database'); }) }));
    await expect(unlockDraftDatabase(opts)).rejects.toBeInstanceOf(DraftStorageError);
  });
});

describe('Quick Diary write state machine', () => {
  it('initializes only a pristine new draft from Calendar, never a restored draft or attempt', async () => {
    const { model } = await setup();
    expect(model.initializeDate('2024-02-29')).toBe(false);
    model.edit({ title: '', content: '', tags: '', stockSymbols: '' });
    expect(model.initializeDate('2024-02-29')).toBe(false);
    const fresh = await setup({}, undefined, true);
    expect(fresh.model.initializeDate('2024-02-29')).toBe(true);
    expect(fresh.model.getSnapshot().draft.date).toBe('2024-02-29');
    const restored = await setup({}, newDraft(draft().scope, '1', 'Asia/Taipei'));
    expect(restored.model.initializeDate('2024-02-29')).toBe(false);
    model.edit({ content: 'Synthetic' }); await model.save();
    expect(model.initializeDate('2024-03-01')).toBe(false);
  });
  it.each([502, 503, 504])('retains the attempt when a committed append receives HTTP %i', async status => {
    let server = diary();
    const { model, api, repo } = await setup({ byDate: vi.fn(async () => server), write: vi.fn(async () => {
      server = diary({ content: 'Synthetic content\n\n---\n\nSynthetic content' });
      return { ok: false as const, status, code: null };
    }) });
    model.edit({ mode: 'append' }); await model.save();
    expect((await repo.load(draft().scope, '1'))?.attempt).not.toBeNull();
    await model.save(); expect(api.write).toHaveBeenCalledOnce();
    await model.checkResult(); expect(model.getSnapshot().recovery).toBe('applied');
  });
  it('an unchanged read cannot unlock an append that commits later', async () => {
    let server = diary();
    const { model, api, repo } = await setup({ byDate: vi.fn(async () => server), write: vi.fn(async () => { throw new Error('timeout'); }) });
    model.edit({ mode: 'append' }); await model.save(); await model.checkResult();
    expect((await repo.load(draft().scope, '1'))?.attempt).not.toBeNull();
    await model.save(); expect(api.write).toHaveBeenCalledOnce();
    server = diary({ content: 'Synthetic content\n\n---\n\nSynthetic content' });
    await model.checkResult(); expect(model.getSnapshot().recovery).toBe('applied');
  });
  it('uses account timezone for today and shared title/canonical input helpers', () => {
    const instant = new Date('2026-01-01T01:00:00Z');
    expect(newDraft('scope', '1', 'America/Los_Angeles', instant).date).toBe('2025-12-31');
    expect(newDraft('scope', '1', 'Asia/Taipei', instant).date).toBe('2026-01-01');
    expect(payloadFor({ ...draft(), title: '', content: '# Synthetic heading\nnext', stockSymbols: 'syn, SYN', tags: ' one,one ' })).toMatchObject({ title: 'Synthetic heading — 2026-01-01', date: '2026-01-01', stockSymbols: ['SYN'], tags: ['one'] });
  });
  it('records recent tags only after the server confirms the diary save', async () => {
    const { model, repo } = await setup();
    expect(await repo.loadRecentTags(draft().scope, '1')).toEqual([]);
    await model.save();
    expect(model.getSnapshot().confirmedId).toBe(id);
    expect(await repo.loadRecentTags(draft().scope, '1')).toEqual(['one']);
  });
  it('debounces autosave, flushes exact edits, and restores them after reopening the controller', async () => {
    vi.useFakeTimers(); const { model, repo } = await setup();
    model.edit({ content: 'synthetic one' }); model.edit({ content: 'synthetic two\nlast  ', mode: 'append' });
    expect(await repo.load(draft().scope, '1')).toBeNull();
    await vi.advanceTimersByTimeAsync(499); expect(await repo.load(draft().scope, '1')).toBeNull();
    await vi.advanceTimersByTimeAsync(1);
    expect(await repo.load(draft().scope, '1')).toMatchObject({ content: 'synthetic two\nlast  ', mode: 'append' });
    model.edit({ title: 'last edit' }); await model.flush();
    const saved = await repo.load(draft().scope, '1');
    const restored = await setup({}, saved!);
    expect(restored.model.getSnapshot().draft).toEqual(saved);
    expect(restored.api.write).not.toHaveBeenCalled();
  });
  it('records attempt before one POST even for same-frame double Save, then clears without resurrection', async () => {
    const pending = deferred<{ ok: true; diary: DiaryResponse }>();
    const { model, api, repo } = await setup({ write: vi.fn(() => pending.promise) });
    const save = model.save(); const duplicate = model.save();
    await vi.waitFor(() => expect(api.write).toHaveBeenCalledOnce());
    expect(await repo.load(draft().scope, '1')).toMatchObject({ writeState: 'saving', attempt: { id: 'local-attempt', baseline: null, payload: payloadFor(draft()) } });
    pending.resolve({ ok: true, diary: diary() }); await Promise.all([save, duplicate]);
    expect(model.getSnapshot().confirmedId).toBe(id); expect(typeof model.getSnapshot().confirmedId).toBe('string');
    expect(await repo.load(draft().scope, '1')).toBeNull(); expect(api.changed).toHaveBeenCalledOnce();
    await model.flush(); await model.save();
    expect(await repo.load(draft().scope, '1')).toBeNull(); expect(api.write).toHaveBeenCalledOnce();
  });
  // P1B's status-only assumption was unsafe: only these documented rejection codes unlock editing.
  it.each([401, 409])('documented application rejection %i retains an editable draft without replay', async status => {
    const { model, api, repo } = await setup({ write: vi.fn(async () => ({ ok: false as const, status, code: status === 409 ? 'DIARY_ALREADY_EXISTS' : 'AUTH_UNAUTHORIZED' })) });
    await model.save();
    expect(api.write).toHaveBeenCalledOnce();
    expect(await repo.load(draft().scope, '1')).toMatchObject({ writeState: 'definitive-error', content: draft().content, attempt: null });
    if (status === 401) expect(api.recoverSession).toHaveBeenCalledOnce();
    if (status === 409) {
      expect(model.getSnapshot().issue).toBe('conflict'); model.edit({ mode: 'append' }); expect(model.getSnapshot().draft.mode).toBe('append');
    }
    expect(api.changed).not.toHaveBeenCalled();
  });
  it('does not send without content or if baseline read fails', async () => {
    const { model, api } = await setup({ byDate: vi.fn(async () => { throw new TypeError('offline'); }) });
    model.edit({ content: '' }); await model.save(); expect(model.getSnapshot().issue).toBe('validation');
    model.edit({ content: 'synthetic' }); await model.save(); expect(api.write).not.toHaveBeenCalled();
    expect(model.getSnapshot().draft.attempt).toBeNull();
  });
  it('blocks POST when durable attempt storage fails', async () => {
    const { model, api, repo } = await setup();
    const original = repo.save;
    vi.spyOn(repo, 'save').mockImplementation(record => record.attempt ? Promise.reject(new Error('disk full')) : original(record));
    await model.save(); expect(api.write).not.toHaveBeenCalled(); expect(model.getSnapshot().issue).toBe('storage');
  });
  it.each([false, true])('transport loss with create committed=%s reconciles via reads, never auto-replays', async committed => {
    let server: DiaryResponse | null = null;
    const { model, api, repo } = await setup({ byDate: vi.fn(async () => server), write: vi.fn(async () => { if (committed) server = diary(); throw new TypeError('response lost'); }) });
    await model.save(); expect(model.getSnapshot().draft.writeState).toBe('uncertain');
    await model.save(); expect(api.write).toHaveBeenCalledOnce();
    await model.checkResult(); expect(api.write).toHaveBeenCalledOnce();
    expect(model.getSnapshot().recovery).toBe(committed ? 'applied' : 'pending');
    if (committed) expect(await repo.load(draft().scope, '1')).toBeNull();
    else expect(await repo.load(draft().scope, '1')).toMatchObject({ writeState: 'uncertain' });
  });
  it.each([false, true])('append committed=%s uses exact baseline/separator/tag/symbol union', async committed => {
    const baseline = diary({ content: 'Synthetic original', tags: ['old'], tagsString: 'old', stockSymbols: ['OLD'] });
    let server = baseline;
    const { model, api } = await setup({ byDate: vi.fn(async () => server), write: vi.fn(async () => {
      if (committed) server = diary({ content: 'Synthetic original\n\n---\n\nSynthetic content', tags: ['old', 'one'], tagsString: 'old,one', stockSymbols: ['OLD', 'SYN'], updatedAt: '2026-01-01T02:00:00.000Z' });
      throw new TypeError('lost');
    }) });
    await model.lookup(); expect(model.getSnapshot().draft.mode).toBe('append');
    await model.save(); await model.checkResult();
    expect(model.getSnapshot().recovery).toBe(committed ? 'applied' : 'pending'); expect(api.write).toHaveBeenCalledOnce();
  });
  it('concurrent edits and duplicate-looking text stay ambiguous without resend', async () => {
    const baseline = diary({ content: 'Synthetic original' }); let server = baseline;
    const { model, api, repo } = await setup({ byDate: vi.fn(async () => server), write: vi.fn(async () => {
      server = diary({ content: 'Synthetic original\n\n---\n\nSynthetic content\n\n---\n\nConcurrent text' }); throw new TypeError('lost');
    }) });
    model.edit({ mode: 'append' }); await model.save(); await model.checkResult(); await model.save();
    expect(model.getSnapshot().recovery).toBe('ambiguous'); expect(api.write).toHaveBeenCalledOnce();
    expect((await repo.load(draft().scope, '1'))?.attempt).not.toBeNull();
  });
  it('restart with a persisted saving attempt restores uncertain without POST', async () => {
    const saved: QuickDraft = { ...draft(), writeState: 'saving', attempt: { id: 'local', at: '2026-01-01', payload: payloadFor(draft()), baseline: null } };
    const { model, api, repo } = await setup({}, saved);
    expect(model.getSnapshot().draft.writeState).toBe('uncertain'); expect(api.write).not.toHaveBeenCalled();
    expect((await repo.load(draft().scope, '1'))?.writeState).toBe('uncertain');
    await model.save(); expect(api.write).not.toHaveBeenCalled();
  });
  it('ignores late write and reconciliation after owner invalidation while retaining A attempt', async () => {
    let current = true; const pending = deferred<{ ok: true; diary: DiaryResponse }>();
    const { model, api, repo } = await setup({ isCurrent: () => current, write: vi.fn(() => pending.promise) });
    const saving = model.save(); await vi.waitFor(() => expect(api.write).toHaveBeenCalledOnce());
    current = false; model.invalidate(); pending.resolve({ ok: true, diary: diary() }); await saving;
    expect(api.changed).not.toHaveBeenCalled(); expect((await repo.load(draft().scope, '1'))?.attempt).not.toBeNull();
    expect(await repo.load(draft().scope, '2')).toBeNull();
  });
  it('does not use a substring as proof for create or append', () => {
    const attempt: WriteAttempt = { id: 'local', at: 'now', baseline: null, payload: payloadFor(draft()) };
    expect(reconcile(attempt, diary({ content: 'Synthetic content plus other content' }))).toBe('ambiguous');
    expect(reconcile({ ...attempt, baseline: diary(), payload: { ...attempt.payload, appendToToday: true } }, diary({ content: 'Synthetic content\n\n---\n\nSynthetic content\n\n---\n\nSynthetic content' }))).toBe('ambiguous');
  });
  it('uses the durable save baseline as the inspection target even before initial lookup completes', async () => {
    const { model } = await setup({ byDate: vi.fn(async () => diary()), write: vi.fn(async () => { throw new TypeError('lost'); }) });
    model.edit({ mode: 'append' });
    await model.save();
    expect(model.getSnapshot()).toMatchObject({ existingId: id, lookup: 'exists', draft: { writeState: 'uncertain' } });
  });
  it('late reconciliation cannot clear A or invalidate B after owner change', async () => {
    let current = true;
    const pending = deferred<DiaryResponse | null>();
    const { model, api, repo } = await setup({ isCurrent: () => current,
      write: vi.fn(async () => { throw new TypeError('lost'); }) });
    await model.save();
    vi.mocked(api.byDate).mockImplementation(() => pending.promise);
    const checking = model.checkResult();
    current = false; model.invalidate(); pending.resolve(diary()); await checking;
    expect(api.changed).not.toHaveBeenCalled(); expect(api.write).toHaveBeenCalledOnce();
    expect((await repo.load(draft().scope, '1'))?.writeState).toBe('uncertain');
    expect(await repo.load(draft().scope, '2')).toBeNull();
  });
  it('restores confirmed cleanup after process death without another write', async () => {
    const saved: QuickDraft = { ...draft(), writeState: 'confirmed', confirmedId: id,
      attempt: { id: 'local', at: 'now', baseline: null, payload: payloadFor(draft()) } };
    const { model, api, repo } = await setup({}, saved);
    expect(model.getSnapshot().confirmedId).toBe(id); expect(model.hasUnsent()).toBe(false);
    await model.flush(); expect(await repo.load(draft().scope, '1')).toBeNull();
    expect(api.write).not.toHaveBeenCalled(); expect(api.changed).toHaveBeenCalledOnce();
  });
  it('ignores a prior date lookup and preserves explicitly chosen create mode', async () => {
    const old = deferred<DiaryResponse | null>();
    const { model, api } = await setup({ byDate: vi.fn(date => date === '2026-01-01' ? old.promise : Promise.resolve(null)) });
    const lookup = model.lookup(); model.edit({ date: '2026-01-02', mode: 'create' });
    await vi.waitFor(() => expect(model.getSnapshot().lookup).toBe('none'));
    old.resolve(diary()); await lookup;
    expect(model.getSnapshot().draft).toMatchObject({ date: '2026-01-02', mode: 'create' });
    expect(model.getSnapshot().existingId).toBeNull(); expect(api.write).not.toHaveBeenCalled();
  });
});

describe('native write transport and owner lifecycle', () => {
  it.each([400, 401, 403, 409, 500, 502, 503, 504])('unrecognized non-JSON HTTP %i stays uncertain through the actual generated client', async status => {
    const lifecycle = {} as ReturnType<typeof createAuthLifecycle>;
    const client = createApiClient({ baseUrl: 'http://localhost', fetch: async () => new Response('Synthetic gateway failure', { status }) });
    const quick = createQuickApi(client, { ownerId: '1', isCurrent: () => true, changed: vi.fn() }, lifecycle);
    const { model, repo } = await setup({ write: quick.write }); await model.save();
    expect(model.getSnapshot().draft.writeState).toBe('uncertain');
    expect((await repo.load(draft().scope, '1'))?.attempt).not.toBeNull();
  });
  it('mutation 401 sends one POST with bearer, omit and no automatic refresh/replay', async () => {
    let stored: ReturnType<typeof session> | null = session(); const requests: Request[] = [];
    const runtime = createAuthRuntime({ appEnvironment: 'development', baseUrl: 'http://localhost:3101', sessionStorageKey: 'test' },
      { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } },
      async (input, init) => { requests.push(new Request(input, init)); return Response.json({ statusCode: 401, statusMessage: 'Unauthorized', data: { code: 'AUTH_UNAUTHORIZED', details: null, requestId: 'test' } }, { status: 401 }); });
    const lifecycle = createAuthLifecycle({ storage: { get: () => stored, set: () => {}, clear: () => {} }, runtime });
    const api = createQuickApi(runtime.api, { ownerId: '1', isCurrent: () => true, changed: () => {} }, lifecycle);
    expect(await api.write(payloadFor(draft()))).toEqual({ ok: false, status: 401, code: 'AUTH_UNAUTHORIZED' });
    expect(requests).toHaveLength(1); expect(requests[0].method).toBe('POST');
    expect(requests[0].headers.get('x-diary-no-automatic-session-retry')).toBe('1');
    expect(requests[0].headers.get('authorization')).toBe('Bearer access-a'); expect(requests[0].credentials).toBe('omit');
    expect(stored).not.toBeNull();
  });
  it('logout Cancel keeps the draft, confirmation deletes before logout, and B cannot see A', async () => {
    const db = new DatabaseSync(':memory:'); const repo = await openDraftRepository(sql(db));
    let stored = session();
    const runtime = { login: vi.fn(async () => { stored = session('2', 'b'); return stored; }),
      logout: vi.fn(async () => { expect(await repo.load('scope', '1')).toBeNull(); }),
      verifyCurrentUser: vi.fn(async () => ({ ok: true as const, user: user(stored.user.id) })) };
    const lifecycle = createAuthLifecycle({ storage: { get: () => stored, set: () => {}, clear: () => {} }, runtime });
    const api = createApiClient({ baseUrl: 'http://localhost', fetch: async () => Response.json(null) });
    const diaries = createDiaryAccess(api, lifecycle);
    const manager = createQuickManager({ api, lifecycle, diaries, scope: 'scope', repository: () => Promise.resolve(repo), attemptId: () => 'local' });
    await lifecycle.bootstrap(); await vi.waitFor(() => expect(manager.getSnapshot()?.getSnapshot().ready).toBe(true));
    const a = manager.getSnapshot()!; a.edit({ content: 'Synthetic A private draft' }); await a.flush();
    await manager.logout(async () => false); expect(runtime.logout).not.toHaveBeenCalled(); expect(await repo.load('scope', '1')).not.toBeNull();
    await manager.logout(async () => true); expect(runtime.logout).toHaveBeenCalledOnce(); expect(manager.getSnapshot()).toBeNull();
    await lifecycle.login({ email: 'b@example.test', password: 'synthetic' });
    expect(manager.getSnapshot()?.getSnapshot().draft.ownerId).toBe('2'); expect(manager.getSnapshot()?.getSnapshot().draft.content).toBe('');
    manager.getSnapshot()?.invalidate();
  });
  it('involuntary session invalidation preserves A draft for later restoration', async () => {
    const { model, repo } = await setup(); await model.flush(); model.invalidate();
    const saved = await repo.load(draft().scope, '1'); expect(saved?.content).toBe(draft().content);
    const b = await setup({ ownerId: '2' }); expect(b.model.getSnapshot().draft.ownerId).toBe('2');
    const restored = await setup({}, saved!); expect(restored.model.getSnapshot().draft.content).toBe(draft().content);
  });
});

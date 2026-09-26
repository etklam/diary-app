import type { AuthoringDraftIdentity, AuthoringDraftRepository } from '../drafts/repository';
import { baselineFor, editorDraftSchema, fieldsFor, payloadFor, reconcile, sameBaseline,
  type EditorBaseline, type EditorDraft, type EditorFields } from './model';
import type { DiaryEditorApi, LedgerRejection } from './api';
import type { Holding, LedgerTransactionResponse } from '@diary/contracts/ledger';
import type { RecentClosedTrade } from '@diary/domain';

type Issue = 'storage' | 'read' | 'validation' | 'rejected' | 'conflict' | 'unknown' | null;
type State = { draft: EditorDraft; ready: boolean; restored: boolean; busy: boolean; persistence: 'saved' | 'pending' | 'error';
  issue: Issue; conflict: boolean; existingId: string | null; confirmedId: string | null; refreshIssue: boolean;
  ledgerRejection: LedgerRejection | null;
  recovery: 'matches' | 'pending' | 'ambiguous' | null;
  ledgerReadback: { transactions: LedgerTransactionResponse[]; holdings: Holding[] | null;
    realizedTrades: RecentClosedTrade[] | null } | null;
  ledgerReadbackIssue: boolean };

export type DiaryEditorController = ReturnType<typeof createDiaryEditorController>;
export function createDiaryEditorController(options: { scope: string; identity: AuthoringDraftIdentity; diaryId: string | null;
  initialDate: string; api: DiaryEditorApi; repository: Promise<AuthoringDraftRepository>; attemptId(): string;
  now?: () => Date; debounceMs?: number; onDiscard?(): void }) {
  const { api, identity } = options;
  const now = options.now ?? (() => new Date());
  const blank = (): EditorDraft => ({ schema: 1, scope: identity.scope, ownerId: identity.ownerId, revision: 0,
    fields: { date: options.initialDate, title: '', content: '', tags: '', stockSymbols: '', thesis: '', risk: '', execution: '', transactions: [], reminders: { rows: [], original: [] } },
    baseline: null, attempt: null, confirmedId: null });
  let state: State = { draft: blank(), ready: false, restored: false, busy: false, persistence: 'saved',
    issue: null, conflict: false, existingId: null, confirmedId: null, refreshIssue: false, recovery: null,
    ledgerRejection: null, ledgerReadback: null, ledgerReadbackIssue: false };
  let closed = false, busy = false, revision = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const current = () => !closed && api.isCurrent();
  const emit = (patch: Partial<State>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const removeSaved = async () => (await options.repository).remove(identity);
  const persist = (draft: EditorDraft) => {
    const snapshot = JSON.parse(JSON.stringify(editorDraftSchema.parse(draft))) as EditorDraft;
    const result = writes.then(async () => (await options.repository).save({ ...identity, schemaVersion: 1,
      revision: Math.max(1, snapshot.revision), updatedAt: now().toISOString(), data: snapshot }, editorDraftSchema));
    writes = result.catch(() => {}); return result;
  };
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = undefined; };
  const flush = async () => {
    clearTimer();
    if (!state.ready || closed || state.confirmedId || (state.draft.revision === 0 && !state.draft.attempt)) return;
    const expected = revision;
    try {
      await persist(state.draft);
      if (current() && expected === revision) emit({ persistence: 'saved' });
    } catch { if (current()) emit({ persistence: 'error', issue: 'storage' }); throw new Error('Encrypted diary draft unavailable'); }
  };
  const schedule = () => { emit({ persistence: 'pending' }); clearTimer(); timer = setTimeout(() => { void flush().catch(() => {}); }, options.debounceMs ?? 400); };
  const latestFor = async (id: string | null, date: string) => id ? api.read(id) : api.byDate(date);
  const readLedgerBack = async (id: string) => {
    if (!current()) return;
    try {
      const diary = await api.read(id);
      if (!current()) return;
      const transactions = diary.transactions ?? [];
      emit({ ledgerReadback: { transactions, holdings: null, realizedTrades: null } });
      const [holdingResult, realizedResult] = await Promise.allSettled([api.holdings(), api.recentClosedTrades()]);
      if (current()) emit({ ledgerReadback: { transactions,
        holdings: holdingResult.status === 'fulfilled' ? holdingResult.value : null,
        realizedTrades: realizedResult.status === 'fulfilled' ? realizedResult.value : null },
      ledgerReadbackIssue: holdingResult.status === 'rejected' || realizedResult.status === 'rejected' });
    } catch {
      if (current()) emit({ ledgerReadbackIssue: true });
    }
  };
  const cleanupConfirmed = async (id: string, readLedger = false) => {
    if (!current()) return;
    try { await removeSaved(); }
    catch { if (current()) emit({ persistence: 'error', issue: 'storage', confirmedId: id }); return; }
    if (!current()) return;
    emit({ persistence: 'saved', issue: null, confirmedId: id, ledgerReadbackIssue: false });
    if (readLedger) {
      try { await api.read(id); if (current()) emit({ refreshIssue: false }); }
      catch { if (current()) emit({ refreshIssue: true, ledgerReadbackIssue: true }); return; }
      await readLedgerBack(id);
    } else {
      try { await api.read(id); if (current()) emit({ refreshIssue: false }); }
      catch { if (current()) emit({ refreshIssue: true }); }
    }
  };
  const confirm = async (id: string) => {
    if (!current()) return;
    revision += 1;
    const draft = editorDraftSchema.parse({ ...state.draft, revision, confirmedId: id, attempt: state.draft.attempt });
    emit({ draft, confirmedId: id, issue: null, ledgerRejection: null, conflict: false, persistence: 'pending' });
    api.changed();
    try { await persist(draft); }
    catch { if (current()) { emit({ persistence: 'error', issue: 'storage' }); return; } }
    if (!current()) return;
    await cleanupConfirmed(id, !!state.draft.attempt?.payload.transactions?.length);
  };
  const start = async () => {
    try {
      const saved = await (await options.repository).load(identity, { schemaVersion: 1, schema: editorDraftSchema });
      if (!current()) return;
      revision = saved?.revision ?? 0;
      const draft = saved?.data ?? blank();
      emit({ draft: { ...draft, revision }, restored: !!saved, ready: false, persistence: 'saved',
        confirmedId: draft.confirmedId, existingId: null, issue: null });
      if (draft.confirmedId) { emit({ ready: true }); api.changed(); await cleanupConfirmed(draft.confirmedId, !!draft.attempt?.payload.transactions?.length); return; }
      if (draft.attempt) { emit({ issue: 'unknown', ready: true }); return; }
      try {
        const latest = await latestFor(options.diaryId, draft.fields.date);
        if (!current()) return;
        const baseline: EditorBaseline | null = latest ? baselineFor(latest) : null;
        if (!saved) {
          const initial = latest && options.diaryId ? fieldsFor(baseline!) : blank().fields;
          const next: EditorDraft = { ...draft, fields: initial, baseline: options.diaryId ? baseline : null };
          emit({ draft: next, existingId: !options.diaryId ? latest?.id ?? null : null,
            conflict: !!latest && !options.diaryId, ready: true });
        } else {
          const conflict = options.diaryId ? !sameBaseline(draft.baseline, baseline)
            : !!latest;
          emit({ existingId: !options.diaryId ? latest?.id ?? null : null, conflict, ready: true });
        }
      } catch {
        if (current()) emit({ issue: 'read', ready: true });
      }
    } catch { if (current()) emit({ issue: 'storage', persistence: 'error' }); }
  };
  const checkResult = async () => {
    if (!current() || busy || !state.draft.attempt) return;
    busy = true; emit({ busy: true, issue: null });
    try {
      const attempt = state.draft.attempt;
      const latest = await latestFor(attempt.diaryId, attempt.payload.date);
      if (!current()) return;
      const recovery = reconcile(attempt, latest, api.ownerId);
      emit({ recovery, existingId: attempt.mode === 'create' ? latest?.id ?? null : attempt.diaryId });
      // A read is not a fence against the original request still committing. Even an
      // exact field match remains an unconfirmed attempt until the write response arrives.
      if (recovery === 'pending' || recovery === 'matches') emit({ issue: 'unknown' });
      else emit({ issue: 'conflict' });
    } catch { if (current()) emit({ issue: 'read' }); }
    finally { busy = false; if (current()) emit({ busy: false }); }
  };
  const save = async () => {
    if (!current() || !state.ready || busy || state.draft.attempt || state.confirmedId || state.conflict) return;
    busy = true; clearTimer(); emit({ busy: true, issue: null, ledgerRejection: null, recovery: null, refreshIssue: false });
    let dispatched = false;
    try {
      let payload;
      try { payload = payloadFor(state.draft.fields); }
      catch { emit({ issue: 'validation' }); return; }
      await flush(); if (!current()) return;
      const latest = await latestFor(options.diaryId, payload.date);
      if (!current()) return;
      const latestBaseline = latest ? baselineFor(latest) : null;
      if (options.diaryId) {
        if (!latest || latest.id !== options.diaryId || !sameBaseline(state.draft.baseline, latestBaseline)) {
          emit({ issue: 'conflict', conflict: true, existingId: latest && latest.id !== options.diaryId ? latest.id : null }); return;
        }
      } else if (latest) {
        emit({ issue: 'conflict', conflict: true, existingId: latest.id }); return;
      }
      const target = payload.date === (state.draft.baseline?.date ?? options.initialDate)
        ? null : await api.byDate(payload.date);
      if (!current()) return;
      if (target && target.id !== options.diaryId) { emit({ issue: 'conflict', conflict: true, existingId: target.id }); return; }
      const attempt = { id: options.attemptId(), mode: options.diaryId ? 'update' as const : 'create' as const,
        diaryId: options.diaryId, payload, baseline: state.draft.baseline };
      revision += 1;
      const pending: EditorDraft = { ...state.draft, revision, attempt };
      await persist(pending);
      if (!current()) return;
      emit({ draft: pending, persistence: 'saved' }); dispatched = true;
      const result = await api.write(attempt.mode, attempt.diaryId, attempt.payload);
      if (!current()) return;
      if (result.ok) { await confirm(result.diary.id); return; }
      const rejected = (result.status === 400 && result.code === 'SYS_VALIDATION_ERROR')
        || (result.status === 401 && result.code === 'AUTH_UNAUTHORIZED')
        || (result.status === 404 && result.code === 'DIARY_NOT_FOUND')
        || (attempt.mode === 'create' && result.status === 409 && result.code === 'DIARY_ALREADY_EXISTS');
      if (rejected) {
        revision += 1;
        const failed = { ...pending, revision, attempt: null };
        await persist(failed);
        let existingId: string | null = null;
        if (result.code === 'DIARY_ALREADY_EXISTS') {
          try { existingId = (await api.byDate(payload.date))?.id ?? null; } catch { /* The 409 remains definitive even if this optional read fails. */ }
        }
        if (current()) emit({ draft: failed, issue: result.code === 'DIARY_ALREADY_EXISTS' ? 'conflict' : 'rejected',
          ledgerRejection: result.ledgerRejection, conflict: result.code === 'DIARY_ALREADY_EXISTS', existingId });
        return;
      }
      emit({ issue: 'unknown' });
    } catch {
      if (current()) emit({ issue: dispatched ? 'unknown' : state.persistence === 'error' ? 'storage' : 'read' });
    } finally { busy = false; if (current()) emit({ busy: false }); }
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start, flush, save, checkResult,
    edit(patch: Partial<EditorFields>) {
      if (!current() || !state.ready || busy || state.draft.attempt || state.confirmedId) return;
      revision += 1;
      const dateChanged = patch.date !== undefined && patch.date !== state.draft.fields.date;
      emit({ draft: { ...state.draft, fields: { ...state.draft.fields, ...patch }, revision, baseline: state.draft.baseline },
        issue: null, ledgerRejection: null, recovery: null, conflict: dateChanged ? false : state.conflict,
        existingId: dateChanged ? null : state.existingId });
      schedule();
    },
    async adoptLatest() {
      if (!current() || busy || !options.diaryId || state.draft.attempt) return;
      busy = true; emit({ busy: true });
      try {
        const latest = await api.read(options.diaryId);
        if (!current()) return;
        revision += 1;
        const baseline = baselineFor(latest);
        const localBuys = state.draft.fields.transactions.filter(transaction => !transaction.id);
        const draft = { ...state.draft, baseline,
          fields: { ...state.draft.fields, transactions: [...fieldsFor(baseline).transactions, ...localBuys] }, revision };
        emit({ draft, conflict: false, issue: null, persistence: 'pending' });
        await persist(draft); if (current()) emit({ persistence: 'saved' });
      } catch { if (current()) emit({ issue: 'read' }); }
      finally { busy = false; if (current()) emit({ busy: false }); }
    },
    async discard() {
      if (!current() || busy || state.draft.attempt || state.confirmedId) throw new Error('Diary editor is busy');
      clearTimer(); closed = true; await writes;
      try { await removeSaved(); }
      catch { closed = false; emit({ issue: 'storage', persistence: 'error' }); throw new Error('Diary draft could not be discarded'); }
      options.onDiscard?.();
    },
    async retryCleanup() {
      if (!state.confirmedId || !current()) return;
      try { await removeSaved(); emit({ persistence: 'saved' }); }
      catch { emit({ persistence: 'error', issue: 'storage' }); return; }
      if (state.draft.attempt?.payload.transactions?.length) {
        try { await api.read(state.confirmedId); emit({ refreshIssue: false }); }
        catch { emit({ refreshIssue: true, ledgerReadbackIssue: true }); return; }
        await readLedgerBack(state.confirmedId);
      } else {
        try { await api.read(state.confirmedId); emit({ refreshIssue: false }); }
        catch { emit({ refreshIssue: true }); }
      }
    },
    async retryRefresh() {
      if (!state.confirmedId || !current()) return;
      try { await api.read(state.confirmedId); if (current()) emit({ refreshIssue: false }); }
      catch { if (current()) emit({ refreshIssue: true, ledgerReadbackIssue: !!state.draft.attempt?.payload.transactions?.length }); return; }
      if (state.draft.attempt?.payload.transactions?.length) await readLedgerBack(state.confirmedId);
    },
    invalidate() {
      clearTimer();
      if (state.ready && !state.confirmedId && state.persistence === 'pending') void persist(state.draft).catch(() => {});
      closed = true;
    },
  };
}

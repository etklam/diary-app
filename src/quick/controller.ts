import { calendarDateSchema } from '@diary/contracts';
import type { QuickApi } from './api';
import { hasDraft, newDraft, payloadFor, reconcile, type QuickDraft } from './model';
import type { DraftRepository } from './repository';

type Issue = 'storage' | 'validation' | 'connection' | 'conflict' | 'session' | 'server' | null;
export type QuickState = {
  draft: QuickDraft; ready: boolean; busy: boolean; persistence: 'saved' | 'pending' | 'error';
  lookup: 'checking' | 'exists' | 'none' | 'error'; existingId: string | null;
  issue: Issue; recovery: 'applied' | 'pending' | 'ambiguous' | null; restored: boolean;
  confirmedId: string | null;
};
export type QuickController = ReturnType<typeof createQuickController>;
export function createQuickController(options: {
  scope: string; timezone: string; api: QuickApi; repository: Promise<DraftRepository>;
  attemptId(): string; now?: () => Date; debounceMs?: number;
}) {
  const { api } = options;
  const now = options.now ?? (() => new Date());
  let state: QuickState = { draft: newDraft(options.scope, api.ownerId, options.timezone, now()), ready: false,
    busy: false, persistence: 'saved', lookup: 'checking', existingId: null, issue: null, recovery: null, restored: false, confirmedId: null };
  let closed = false;
  let busy = false;
  let revision = 0;
  let lookupVersion = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const current = () => !closed && api.isCurrent();
  const emit = (patch: Partial<QuickState>) => { state = { ...state, ...patch }; listeners.forEach(listener => listener()); };
  const persist = (draft: QuickDraft) => {
    // Snapshot at scheduling time, not after another UI edit.
    const snapshot = structuredCloneDraft(draft);
    const result = writes.then(async () => (await options.repository).save(snapshot));
    writes = result.catch(() => {});
    return result;
  };
  const clearTimer = () => { if (timer) clearTimeout(timer); timer = undefined; };
  const flush = async () => {
    clearTimer();
    if (!state.ready || closed || state.confirmedId || state.draft.writeState === 'confirmed') return;
    const expected = revision;
    try {
      await persist(state.draft);
      if (expected === revision && current()) emit({ persistence: 'saved', issue: state.issue === 'storage' ? null : state.issue });
    } catch {
      if (current()) emit({ persistence: 'error', issue: 'storage' });
      throw new Error('Draft storage unavailable');
    }
  };
  const schedule = () => {
    clearTimer();
    emit({ persistence: 'pending' });
    timer = setTimeout(() => { void flush().catch(() => {}); }, options.debounceMs ?? 500);
  };
  const lookup = async () => {
    if (!current() || !state.ready || state.draft.attempt || busy) return;
    const expected = ++lookupVersion;
    const date = state.draft.date;
    if (!calendarDateSchema.safeParse(date).success) { emit({ lookup: 'error' }); return; }
    emit({ lookup: 'checking' });
    try {
      const diary = await api.byDate(date);
      if (!current() || expected !== lookupVersion || date !== state.draft.date || busy) return;
      emit({ lookup: diary ? 'exists' : 'none', existingId: diary?.id ?? null });
      if (!state.draft.modeChosen) {
        emit({ draft: { ...state.draft, mode: diary ? 'append' : 'create' } });
        ++revision; schedule();
      }
    } catch { if (current() && expected === lookupVersion) emit({ lookup: 'error' }); }
  };
  const finish = async (id: string) => {
    if (!current()) return;
    clearTimer();
    const draft: QuickDraft = { ...state.draft, writeState: 'confirmed', confirmedId: id };
    emit({ draft });
    await persist(draft);
    if (!current()) return;
    await (await options.repository).remove(draft.scope, draft.ownerId);
    if (!current()) return;
    if (state.confirmedId !== id) api.changed();
    emit({ confirmedId: id, recovery: 'applied', persistence: 'saved', issue: null });
  };
  const start = async () => {
    try {
      const saved = await (await options.repository).load(options.scope, api.ownerId);
      if (!current()) return;
      const draft = saved ?? state.draft;
      if (draft.writeState === 'saving') draft.writeState = 'uncertain';
      emit({ ready: true, draft, restored: !!saved, lookup: draft.attempt ? 'error' : 'checking', issue: null });
      if (draft.writeState === 'confirmed' && draft.confirmedId) { await finish(draft.confirmedId); return; }
      if (draft.attempt) await persist(draft);
    } catch { if (current()) emit({ issue: 'storage', persistence: 'error' }); }
  };
  const save = async () => {
    // This latch is set synchronously, before validation, storage or network awaits.
    if (!current() || !state.ready || busy || state.draft.attempt || state.confirmedId) return;
    busy = true; ++lookupVersion; clearTimer();
    emit({ busy: true, issue: null, recovery: null });
    let recorded = false;
    try {
      let payload;
      try { payload = payloadFor(state.draft); } catch { emit({ issue: 'validation' }); return; }
      await flush();
      if (!current()) return;
      const baseline = await api.byDate(state.draft.date);
      if (!current()) return;
      emit({ lookup: baseline ? 'exists' : 'none', existingId: baseline?.id ?? null });
      const attempt = { id: options.attemptId(), at: now().toISOString(), payload, baseline };
      const draft: QuickDraft = { ...state.draft, writeState: 'saving', attempt };
      try { await persist(draft); }
      catch { emit({ persistence: 'error', issue: 'storage' }); throw new Error('Attempt could not be persisted'); }
      recorded = true;
      emit({ draft, persistence: 'saved' });
      if (!current()) return;
      const result = await api.write(payload);
      if (!current()) return;
      if (result.ok) { await finish(result.diary.id); return; }
      // Only documented pre-mutation application rejections prove non-application.
      if (!((result.status === 409 && result.code === 'DIARY_ALREADY_EXISTS')
        || (result.status === 401 && result.code === 'AUTH_UNAUTHORIZED'))) throw new Error('Unknown write outcome');
      const failed: QuickDraft = { ...state.draft, writeState: 'definitive-error', attempt: null };
      // Retain a durable error before an auth transition can unmount the composer.
      await persist(failed);
      if (!current()) return;
      emit({ draft: failed, issue: result.code === 'DIARY_ALREADY_EXISTS' ? 'conflict' : 'session' });
      if (result.status === 401) await api.recoverSession();
    } catch {
      if (!current()) return;
      if (state.draft.writeState === 'confirmed') { emit({ issue: 'storage', persistence: 'error' }); return; }
      if (recorded) {
        const draft: QuickDraft = { ...state.draft, writeState: 'uncertain' };
        emit({ draft, issue: 'connection' });
        try { await persist(draft); } catch { emit({ issue: 'storage', persistence: 'error' }); }
      } else if (state.persistence !== 'error') emit({ issue: 'connection' });
    } finally { busy = false; if (current()) emit({ busy: false }); }
  };
  const checkResult = async () => {
    if (!current() || busy || !state.draft.attempt) return;
    busy = true; emit({ busy: true, issue: null });
    try {
      if (state.draft.writeState === 'confirmed' && state.draft.confirmedId) { await finish(state.draft.confirmedId); return; }
      const latest = await api.byDate(state.draft.date);
      if (!current()) return;
      const recovery = reconcile(state.draft.attempt!, latest);
      emit({ recovery, existingId: latest?.id ?? null });
      if (recovery === 'applied' && latest) await finish(latest.id);
    } catch { if (current()) emit({ issue: 'connection' }); }
    finally { busy = false; if (current()) emit({ busy: false }); }
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    start, flush, save, checkResult, lookup,
    initializeDate(date: string) {
      // Calendar intent may initialize only a pristine, newly created draft.
      if (!current() || !state.ready || state.restored || revision !== 0 || busy || hasDraft(state.draft) || state.confirmedId) return false;
      if (!calendarDateSchema.safeParse(date).success) return false;
      ++revision; ++lookupVersion;
      emit({ draft: { ...state.draft, date, modeChosen: false }, existingId: null });
      schedule(); void lookup(); return true;
    },
    edit(patch: Partial<Pick<QuickDraft, 'date' | 'mode' | 'title' | 'content' | 'tags' | 'stockSymbols'>>) {
      if (!current() || !state.ready || busy || state.draft.attempt || state.confirmedId) return;
      ++revision;
      const dateChanged = patch.date !== undefined && patch.date !== state.draft.date;
      emit({ draft: { ...state.draft, ...patch, modeChosen: patch.mode !== undefined ? true : dateChanged ? false : state.draft.modeChosen,
        writeState: 'editing', updatedAt: now().toISOString() }, issue: null, recovery: null,
        ...(dateChanged ? { existingId: null } : {}) });
      schedule();
      if (dateChanged) void lookup();
    },
    hasUnsent: () => !state.confirmedId && hasDraft(state.draft),
    async discard() {
      clearTimer(); closed = true; ++lookupVersion;
      await writes;
      try { await (await options.repository).remove(options.scope, api.ownerId); }
      catch { closed = false; emit({ issue: 'storage', persistence: 'error' }); throw new Error('Draft could not be discarded'); }
    },
    invalidate() {
      clearTimer(); ++lookupVersion;
      // Preserve the last edit on involuntary expiry. Never delete another owner.
      if (state.ready && state.persistence === 'pending') void persist(state.draft).catch(() => {});
      closed = true;
    },
  };
}
function structuredCloneDraft(draft: QuickDraft): QuickDraft { return JSON.parse(JSON.stringify(draft)); }

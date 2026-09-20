import { baselineFor, fieldsFor, payloadFor, sameBaseline, type ReviewDraft, type ReviewFields, type ServerReview } from './model';
import type { ReviewApi } from './api';
import type { ReviewRepository } from './repository';

type State = { draft: ReviewDraft | null; server: ServerReview | null; ready: boolean; restored: boolean; busy: boolean;
  persistence: 'saved' | 'pending' | 'error'; issue: string | null; conflict: boolean; confirmed: boolean; inspected: boolean };
export type ReviewController = ReturnType<typeof createReviewController>;
export function createReviewController(options: { scope: string; diaryId: string; api: ReviewApi; repository: Promise<ReviewRepository>; attemptId(): string }) {
  const { api } = options;
  let state: State = { draft: null, server: null, ready: false, restored: false, busy: false, persistence: 'saved', issue: null, conflict: false, confirmed: false, inspected: false };
  let closed = false, busy = false, dirty = false;
  let generation = 0;
  let readAbort: AbortController | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let writes: Promise<unknown> = Promise.resolve();
  const listeners = new Set<() => void>();
  const current = () => !closed && api.isCurrent();
  const readServer = () => { readAbort?.abort(); readAbort = new AbortController(); return api.read(readAbort.signal); };
  const emit = (patch: Partial<State>) => { if (current()) { state = { ...state, ...patch }; listeners.forEach(listener => listener()); } };
  const persist = (draft: ReviewDraft) => {
    const result = writes.then(async () => { await (await options.repository).save(draft); });
    writes = result.catch(() => {}); return result;
  };
  const flush = async () => {
    clearTimeout(timer);
    if (!dirty || !state.draft || closed) { await writes; return; }
    const draft = state.draft;
    try { await persist(draft); if (current() && state.draft === draft) { dirty = false; emit({ persistence: 'saved' }); } }
    catch { emit({ persistence: 'error', issue: 'Local draft could not be saved. Stay here and retry saving on device.' }); throw new Error('Review draft storage unavailable'); }
  };
  const inspect = async () => {
    const expected = ++generation;
    const review = await readServer();
    if (!current() || expected !== generation) return;
    emit({ server: review, inspected: true, conflict: !!state.draft && !sameBaseline(state.draft.baseline, baselineFor(review)) });
  };
  const finish = async (review: ServerReview) => {
    if (!state.draft || !current() || state.confirmed) return;
    const draft = { ...state.draft, confirmed: baselineFor(review) };
    emit({ draft, server: review });
    await persist(draft);
    if (!current()) return;
    await (await options.repository).remove(options.scope, api.ownerId, options.diaryId);
    if (!current()) return;
    dirty = false; emit({ confirmed: true, persistence: 'saved', issue: null }); api.changed();
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async start() {
      const expected = ++generation;
      try {
        const draft = await (await options.repository).load(options.scope, api.ownerId, options.diaryId);
        if (!current() || expected !== generation) return;
        if (draft?.confirmed) {
          await (await options.repository).remove(options.scope, api.ownerId, options.diaryId);
          if (current()) { emit({ ready: true, confirmed: true }); api.changed(); } return;
        }
        if (draft) emit({ draft, restored: true, ready: true });
        const review = await readServer();
        if (!current() || expected !== generation) return;
        if (draft) emit({ server: review, conflict: !sameBaseline(draft.baseline, baselineFor(review)) });
        else emit({ ready: true, server: review, draft: { schema: 1, scope: options.scope, ownerId: api.ownerId, diaryId: options.diaryId,
          revision: 0, fields: fieldsFor(review), baseline: baselineFor(review), attempt: null, confirmed: null } });
      } catch { if (expected === generation) emit({ issue: 'Could not open the server review or encrypted draft. Existing drafts are retained.' }); }
    },
    edit(patch: Partial<ReviewFields>) {
      if (!current() || !state.ready || !state.draft || busy || state.draft.attempt || state.confirmed) return;
      dirty = true;
      emit({ draft: { ...state.draft, fields: { ...state.draft.fields, ...patch }, revision: state.draft.revision + 1 }, persistence: 'pending', issue: null });
      clearTimeout(timer); timer = setTimeout(() => { void flush().catch(() => {}); }, 400);
    },
    flush,
    async adoptServerBaseline() {
      if (!current() || busy || !state.server || !state.draft || state.draft.attempt) return;
      dirty = true; emit({ draft: { ...state.draft, baseline: baselineFor(state.server), revision: state.draft.revision + 1 }, conflict: false, persistence: 'pending' });
      await flush();
    },
    async check() {
      if (!current() || busy || state.confirmed) return;
      busy = true; emit({ busy: true, issue: null });
      try {
        if (state.draft?.confirmed && state.server) await finish(state.server);
        else await inspect();
      }
      catch { emit({ issue: 'Server state could not be read. Your local edits and attempt are retained.' }); }
      finally { busy = false; emit({ busy: false }); }
      // Reads cannot prove termination of an outstanding PATCH, even if text matches.
    },
    async submit() {
      if (!current() || busy || !state.ready || !state.draft || state.draft.attempt || state.confirmed) return;
      busy = true; emit({ busy: true, issue: null });
      let dispatched = false;
      try {
        const parsed = payloadFor(state.draft.fields);
        await flush(); if (!current()) return;
        await inspect(); if (!current() || state.conflict) return;
        const attempt = { id: options.attemptId(), payload: parsed, baseline: state.draft.baseline };
        const draft = { ...state.draft, attempt };
        await persist(draft); if (!current()) return;
        emit({ draft }); dispatched = true;
        const result = await api.write(attempt.payload);
        if (!current()) return;
        if (result.ok) { await finish(result.review); return; }
        // These route-specific responses occur before update, or identify no owned row.
        const rejected = (result.status === 400 && result.code === 'SYS_VALIDATION_ERROR')
          || (result.status === 401 && result.code === 'AUTH_UNAUTHORIZED')
          || (result.status === 404 && result.code === 'DIARY_NOT_FOUND');
        if (rejected) {
          const retained = { ...draft, attempt: null }; await persist(retained);
          emit({ draft: retained, issue: 'The service rejected this review without applying it. Your local draft is retained.' });
        } else emit({ issue: 'Submission is unconfirmed. It may still complete. Only read-only checking is available.' });
      } catch (error) {
        emit({ issue: state.draft?.confirmed ? 'Review saved. Local cleanup failed; retry cleanup without submitting again.' : dispatched ? 'Submission is unconfirmed. It may still complete. Your exact attempt is retained.'
          : error instanceof Error && error.name === 'ZodError' ? 'Choose an outcome and enter at least one reflection. Each reflection must be at most 10,000 characters.'
          : 'Review was not dispatched. Check your connection and local draft storage, then try again.' });
      } finally { busy = false; emit({ busy: false }); }
    },
    async discard() {
      if (!current() || busy) throw new Error('Review is busy');
      closed = true; ++generation; readAbort?.abort(); clearTimeout(timer); await writes;
      try { await (await options.repository).remove(options.scope, api.ownerId, options.diaryId); }
      catch { closed = false; throw new Error('Could not discard review draft'); }
    },
    invalidate() { closed = true; ++generation; readAbort?.abort(); clearTimeout(timer); },
  };
}

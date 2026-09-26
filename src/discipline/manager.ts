import type { DisciplineResponse } from '@diary/contracts/discipline';
import { DisciplineFailure, type DisciplineService } from './service';

export type DisciplineState = {
  rows: DisciplineResponse[] | null;
  drawn: { content: string; isCustom: boolean } | null;
  loading: boolean;
  busy: boolean;
  saved: boolean;
  error: DisciplineFailure | null;
  mutationUncertain: boolean;
};

const empty: DisciplineState = { rows: null, drawn: null, loading: false, busy: false, saved: false, error: null, mutationUncertain: false };
const ordered = (rows: DisciplineResponse[]) => [...rows].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));

export function createDisciplineManager(service: DisciplineService, isCurrent: () => boolean) {
  let state = empty;
  let disposed = false;
  let readSequence = 0;
  let readController: AbortController | null = null;
  let mutationController: AbortController | null = null;
  const listeners = new Set<() => void>();
  const update = (next: Partial<DisciplineState>) => {
    if (disposed || !isCurrent()) return;
    state = { ...state, ...next };
    listeners.forEach(listener => listener());
  };
  const current = () => !disposed && isCurrent();
  const stale = () => { if (!current()) throw new DisciplineFailure('stale'); };

  const manager = {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    async refresh() {
      disposed = false;
      const sequence = ++readSequence;
      readController?.abort();
      const controller = new AbortController(); readController = controller;
      update({ loading: true, error: null });
      try {
        const rows = await service.read(controller.signal);
        stale();
        if (sequence === readSequence && !controller.signal.aborted) update({ rows: ordered(rows), loading: false, error: null, mutationUncertain: false });
      } catch (error) {
        if (sequence === readSequence && !controller.signal.aborted && current()) update({ loading: false, error: error instanceof DisciplineFailure ? error : new DisciplineFailure('uncertain') });
      } finally { if (readController === controller) readController = null; }
    },
    async draw() {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session') return false;
      return readAction(async signal => service.random(signal), drawn => update({ drawn, error: null }));
    },
    async save(rawContent: string, id?: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session' || !state.rows) return false;
      const content = rawContent.trim();
      if (!content || content.length > 255) { update({ error: new DisciplineFailure('rejected', 'SYS_VALIDATION_ERROR'), saved: false }); return false; }
      const before = state.rows;
      if (id) {
        const result = await mutate(
          () => service.update(id, { content }),
          async () => {
            const rows = await service.read();
            const updated = rows.find(row => row.id === id);
            update({ rows: ordered(rows) });
            return updated?.content === content;
          },
          result => update({ rows: ordered(before.map(row => row.id === id ? result : row)), drawn: null, saved: true }),
        );
        if (result) void manager.refresh();
        return result;
      }
      const appendOrder = before.length ? Math.max(...before.map(row => row.order)) + 1 : 0;
      const beforeIds = new Set(before.map(row => row.id));
      const result = await mutate(
        () => service.create({ content }),
        async () => {
          const rows = await service.read();
          const appended = rows.slice(before.length);
          const prefixMatches = before.every((row, index) => rows[index]?.id === row.id && rows[index]?.content === row.content && rows[index]?.order === row.order);
          const committed = rows.length === before.length + 1 && prefixMatches && appended[0] !== undefined
            && !beforeIds.has(appended[0].id) && appended[0].content === content && appended[0].order === appendOrder;
          update({ rows: ordered(rows) });
          return committed;
        },
        created => update({ rows: ordered([...before, created]), drawn: null, saved: true }),
      );
      if (result) void manager.refresh();
      return result;
    },
    async remove(id: string) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session' || !state.rows) return false;
      const before = state.rows;
      const result = await mutate(
        async () => { await service.remove(id); return id; },
        async () => {
          const rows = await service.read(); update({ rows: ordered(rows) }); return !rows.some(row => row.id === id);
        },
        () => update({ rows: before.filter(row => row.id !== id), drawn: null, saved: true }),
      );
      if (result) void manager.refresh();
      return result;
    },
    async move(id: string, offset: -1 | 1) {
      if (state.busy || state.mutationUncertain || state.error?.kind === 'session' || !state.rows) return false;
      const from = state.rows.findIndex(row => row.id === id), to = from + offset;
      if (from < 0 || to < 0 || to >= state.rows.length) return false;
      const target = [...state.rows];
      [target[from], target[to]] = [target[to]!, target[from]!];
      const desired = target.map((row, order) => ({ id: row.id, order }));
      const result = await mutate(
        () => service.reorder(desired),
        async () => {
          const rows = await service.read(); update({ rows: ordered(rows) });
          return desired.every(value => rows.find(row => row.id === value.id)?.order === value.order) && rows.length === desired.length;
        },
        rows => {
          const ids = new Set(rows.map(row => row.id));
          if (rows.length !== desired.length || ids.size !== desired.length || desired.some(value => !ids.has(value.id))) throw new DisciplineFailure('uncertain');
          update({ rows: ordered(rows), drawn: null, saved: true });
        },
      );
      if (result) void manager.refresh();
      return result;
    },
    dispose() {
      disposed = true; readSequence++; readController?.abort(); mutationController?.abort(); listeners.clear();
    },
  };
  return manager;

  async function readAction<T>(request: (signal: AbortSignal) => Promise<T>, accept: (value: T) => void) {
    const controller = new AbortController(); mutationController = controller; update({ busy: true, error: null });
    try { const value = await request(controller.signal); stale(); accept(value); return true; }
    catch (error) { if (current()) update({ error: error instanceof DisciplineFailure ? error : new DisciplineFailure('uncertain') }); return false; }
    finally { if (mutationController === controller) mutationController = null; if (current()) update({ busy: false }); }
  }

  async function mutate<T>(request: () => Promise<T>, reconcile: () => Promise<boolean>, accept: (value: T) => void) {
    const controller = new AbortController(); mutationController = controller; update({ busy: true, error: null, saved: false });
    try {
      const value = await request(); stale(); accept(value); return true;
    } catch (error) {
      const failure = error instanceof DisciplineFailure ? error : new DisciplineFailure('uncertain');
      if (failure.kind === 'uncertain' || failure.code === 'DISCIPLINE_NOT_FOUND') {
        try {
          const committed = await reconcile(); stale();
          if (committed) { update({ error: null, mutationUncertain: false, drawn: null, saved: true }); return true; }
          update({ error: failure, mutationUncertain: failure.kind === 'uncertain' });
        } catch (reconcileError) {
          if (current()) update({ error: reconcileError instanceof DisciplineFailure ? reconcileError : failure, mutationUncertain: true });
        }
      } else if (current()) update({ error: failure, mutationUncertain: false });
      return false;
    } finally { if (mutationController === controller) mutationController = null; if (current()) update({ busy: false }); }
  }
}

import { draftSchema, type QuickDraft } from './model';

export class DraftStorageError extends Error {
  constructor() { super('Encrypted draft storage is unavailable. Your saved data has not been deleted.'); }
}
export type DraftRepository = {
  load(scope: string, ownerId: string): Promise<QuickDraft | null>;
  save(draft: QuickDraft): Promise<void>;
  remove(scope: string, ownerId: string): Promise<void>;
};
export type DraftDatabase = {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: (string | number | null)[]): Promise<unknown>;
  getFirstAsync<T>(sql: string, ...params: (string | number | null)[]): Promise<T | null>;
};

export async function openDraftRepository(db: DraftDatabase): Promise<DraftRepository> {
  await db.execAsync('CREATE TABLE IF NOT EXISTS quick_drafts (scope TEXT NOT NULL, owner_id TEXT NOT NULL, record TEXT NOT NULL, PRIMARY KEY(scope, owner_id))');
  // Serialize all operations, including deletion, so an earlier autosave cannot
  // resurrect a draft after explicit discard or confirmed save.
  let queue: Promise<unknown> = Promise.resolve();
  const run = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation).catch(() => { throw new DraftStorageError(); });
    queue = result.catch(() => {});
    return result;
  };
  return {
    load: (scope, ownerId) => run(async () => {
      const row = await db.getFirstAsync<{ record: string }>('SELECT record FROM quick_drafts WHERE scope = ? AND owner_id = ?', scope, ownerId);
      if (!row) return null;
      const draft = draftSchema.parse(JSON.parse(row.record));
      if (draft.scope !== scope || draft.ownerId !== ownerId) throw new DraftStorageError();
      return draft;
    }),
    save: draft => run(async () => {
      const record = JSON.stringify(draftSchema.parse(draft));
      await db.runAsync('INSERT INTO quick_drafts(scope, owner_id, record) VALUES (?, ?, ?) ON CONFLICT(scope, owner_id) DO UPDATE SET record = excluded.record', draft.scope, draft.ownerId, record);
    }),
    remove: (scope, ownerId) => run(async () => { await db.runAsync('DELETE FROM quick_drafts WHERE scope = ? AND owner_id = ?', scope, ownerId); }),
  };
}

export async function unlockDraftDatabase(options: {
  exists(): boolean;
  getKey(): Promise<string | null>;
  setKey(key: string): Promise<void>;
  randomBytes(): Promise<Uint8Array>;
  open(): Promise<DraftDatabase>;
}): Promise<DraftDatabase> {
  try {
    let key = await options.getKey();
    if (!key) {
      if (options.exists()) throw new DraftStorageError();
      const bytes = await options.randomBytes();
      if (bytes.length !== 32) throw new DraftStorageError();
      key = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
      await options.setKey(key);
    }
    if (!/^[0-9a-f]{64}$/.test(key)) throw new DraftStorageError();
    const db = await options.open();
    // PRAGMA does not support bound parameters. Only validated random hex enters
    // this statement; no user input or session material can reach it.
    await db.execAsync(`PRAGMA key = "x'${key}'"`);
    const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
    if (!cipher?.cipher_version) throw new DraftStorageError();
    await db.getFirstAsync('SELECT count(*) FROM sqlite_master');
    await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA synchronous = FULL; PRAGMA secure_delete = ON');
    return db;
  } catch { throw new DraftStorageError(); }
}

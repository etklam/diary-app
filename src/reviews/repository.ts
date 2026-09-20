import { DraftStorageError, type DraftDatabase } from '../quick/repository';
import { reviewDraftSchema, type ReviewDraft } from './model';

export type ReviewRepository = Awaited<ReturnType<typeof openReviewRepository>>;
export async function openReviewRepository(db: DraftDatabase) {
  await db.execAsync('CREATE TABLE IF NOT EXISTS review_drafts (scope TEXT NOT NULL, owner_id TEXT NOT NULL, diary_id TEXT NOT NULL, record TEXT NOT NULL, PRIMARY KEY(scope, owner_id, diary_id))');
  let queue: Promise<unknown> = Promise.resolve();
  const run = <T>(operation: () => Promise<T>) => {
    const result = queue.then(operation).catch(() => { throw new DraftStorageError(); });
    queue = result.catch(() => {}); return result;
  };
  return {
    load: (scope: string, ownerId: string, diaryId: string) => run(async () => {
      const row = await db.getFirstAsync<{ record: string }>('SELECT record FROM review_drafts WHERE scope = ? AND owner_id = ? AND diary_id = ?', scope, ownerId, diaryId);
      if (!row) return null;
      const draft = reviewDraftSchema.parse(JSON.parse(row.record));
      if (draft.scope !== scope || draft.ownerId !== ownerId || draft.diaryId !== diaryId) throw new DraftStorageError();
      return draft;
    }),
    save: (draft: ReviewDraft) => run(async () => {
      const record = JSON.stringify(reviewDraftSchema.parse(draft));
      await db.runAsync('INSERT INTO review_drafts VALUES (?, ?, ?, ?) ON CONFLICT(scope, owner_id, diary_id) DO UPDATE SET record = excluded.record', draft.scope, draft.ownerId, draft.diaryId, record);
    }),
    hasAny: (scope: string, ownerId: string) => run(async () => {
      const row = await db.getFirstAsync<{ count: number }>('SELECT count(*) AS count FROM review_drafts WHERE scope = ? AND owner_id = ?', scope, ownerId);
      return !!row?.count;
    }),
    remove: (scope: string, ownerId: string, diaryId: string) => run(async () => {
      await db.runAsync('DELETE FROM review_drafts WHERE scope = ? AND owner_id = ? AND diary_id = ?', scope, ownerId, diaryId);
    }),
    removeOwner: (scope: string, ownerId: string) => run(async () => {
      await db.runAsync('DELETE FROM review_drafts WHERE scope = ? AND owner_id = ?', scope, ownerId);
    }),
  };
}

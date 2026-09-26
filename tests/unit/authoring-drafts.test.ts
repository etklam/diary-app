import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { openAuthoringDraftRepository, type AuthoringDraftIdentity } from '../../src/drafts/repository';
import { openReviewRepository } from '../../src/reviews/repository';
import { baselineFor, fieldsFor } from '../../src/reviews/model';
import { DraftStorageError, openDraftRepository, type DraftDatabase } from '../../src/quick/repository';
import { newDraft } from '../../src/quick/model';
import { diaryReviewResponseSchema } from '@diary/contracts/review';

const reviewId = '9223372036854775806';
const payloadSchema = z.object({ title: z.string(), content: z.string() }).strict();
const identity: AuthoringDraftIdentity = {
  scope: '["development","https://synthetic.example"]', ownerId: '101', entityType: 'diary', entityId: 'new:2026-09-26',
};

function sql(db: DatabaseSync): DraftDatabase {
  return {
    execAsync: async query => { db.exec(query); },
    runAsync: async (query, ...params) => db.prepare(query).run(...params),
    getFirstAsync: async <T>(query: string, ...params: (string | number | null)[]) => (db.prepare(query).get(...params) as T | undefined) ?? null,
  };
}

function reviewDraft(scope: string, ownerId: string, diaryId: string) {
  const server = diaryReviewResponseSchema.parse({
    id: diaryId, title: 'Synthetic diary', date: '2026-09-26', content: 'Synthetic content', tags: [], thesis: null, risk: null,
    execution: null, reviewDueAt: null, reviewStatus: 'none', reviewedAt: null, reviewOutcome: null,
    reviewSummary: null, reviewLearning: null, reviewAdjustment: null, transactions: [], tradePlans: [],
  });
  return {
    schema: 1 as const, scope, ownerId, diaryId, revision: 1, fields: fieldsFor(server), baseline: baselineFor(server), attempt: null, confirmed: null,
  };
}

describe('encrypted authoring draft storage adapter', () => {
  it('coexists with Quick and multiple Review drafts and reopens every namespace', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'authoring-drafts-'));
    const filename = join(directory, 'draft.db');
    let db = new DatabaseSync(filename);
    try {
      const database = sql(db);
      const quick = await openDraftRepository(database);
      const reviews = await openReviewRepository(database);
      const authoring = await openAuthoringDraftRepository(database);
      const quickRecord = newDraft(identity.scope, identity.ownerId, 'Asia/Taipei', new Date('2026-09-26T05:00:00.000Z'));
      const firstReview = reviewDraft(identity.scope, identity.ownerId, reviewId);
      const secondReview = reviewDraft(identity.scope, identity.ownerId, '42');

      expect(await authoring.hasAny(identity.scope, identity.ownerId)).toBe(false);
      await quick.save(quickRecord);
      await reviews.save(firstReview);
      await reviews.save(secondReview);
      expect(await authoring.save({ ...identity, schemaVersion: 1, revision: 1, updatedAt: '2026-09-26T05:00:00.000Z', data: { title: 'Synthetic', content: 'Draft' } }, payloadSchema)).toBe(true);

      db.close();
      db = new DatabaseSync(filename);
      const reopened = sql(db);
      expect(await (await openDraftRepository(reopened)).load(identity.scope, identity.ownerId)).toEqual(quickRecord);
      expect(await (await openReviewRepository(reopened)).load(identity.scope, identity.ownerId, reviewId)).toEqual(firstReview);
      expect(await (await openReviewRepository(reopened)).load(identity.scope, identity.ownerId, '42')).toEqual(secondReview);
      expect(await (await openAuthoringDraftRepository(reopened)).load(identity, { schemaVersion: 1, schema: payloadSchema }))
        .toMatchObject({ revision: 1, data: { title: 'Synthetic', content: 'Draft' } });
    } finally {
      db.close();
      rmSync(directory, { recursive: true });
    }
  });

  it('does not create a row on read and rejects stale revisions without replacing newer edits', async () => {
    const db = new DatabaseSync(':memory:');
    try {
      const repository = await openAuthoringDraftRepository(sql(db));
      expect(await repository.load(identity, { schemaVersion: 1, schema: payloadSchema })).toBeNull();
      const save = (revision: number, content: string) => repository.save({ ...identity, schemaVersion: 1, revision,
        updatedAt: `2026-09-26T05:00:0${revision}.000Z`, data: { title: 'Synthetic', content } }, payloadSchema);
      expect(await save(1, 'First')).toBe(true);
      expect(await save(3, 'Latest')).toBe(true);
      expect(await save(2, 'Late older write')).toBe(false);
      expect((await repository.load(identity, { schemaVersion: 1, schema: payloadSchema }))?.data.content).toBe('Latest');
    } finally { db.close(); }
  });

  it('migrates in memory, refuses unavailable or forward migrations, and retains invalid rows', async () => {
    const db = new DatabaseSync(':memory:');
    try {
      const database = sql(db);
      const repository = await openAuthoringDraftRepository(database);
      await repository.save({ ...identity, schemaVersion: 1, revision: 1, updatedAt: '2026-09-26T05:00:00.000Z',
        data: { title: 'Synthetic', content: 'Draft' } }, payloadSchema);
      const currentSchema = z.object({ title: z.string(), body: z.string() }).strict();
      await expect(repository.load(identity, { schemaVersion: 2, schema: currentSchema })).rejects.toThrow();
      const migrated = await repository.load(identity, { schemaVersion: 2, schema: currentSchema, migrations: {
        1: value => { const parsed = payloadSchema.parse(value); return { title: parsed.title, body: parsed.content }; },
      } });
      expect(migrated?.data).toEqual({ title: 'Synthetic', body: 'Draft' });
      expect(db.prepare('SELECT schema_version FROM authoring_drafts').get()?.schema_version).toBe(1);
      db.prepare('UPDATE authoring_drafts SET payload = ?').run('{broken');
      await expect(repository.load(identity, { schemaVersion: 1, schema: payloadSchema })).rejects.toThrow();
      expect(db.prepare('SELECT count(*) AS n FROM authoring_drafts').get()?.n).toBe(1);
    } finally { db.close(); }
  });

  it('rejects sensitive fields and removes only the confirmed environment and owner', async () => {
    const db = new DatabaseSync(':memory:');
    try {
      const repository = await openAuthoringDraftRepository(sql(db));
      await expect(repository.save({ ...identity, schemaVersion: 1, revision: 1, updatedAt: '2026-09-26T05:00:00.000Z',
        data: { title: 'Synthetic', content: 'Draft', accessToken: 'never-store' } }, z.object({ title: z.string(), content: z.string(), accessToken: z.string() })))
        .rejects.toThrow();
      const otherOwner = { ...identity, ownerId: '202', entityId: 'other-owner' };
      const otherEnvironment = { ...identity, scope: 'preview:https://synthetic.example', entityId: 'other-environment' };
      for (const key of [identity, otherOwner, otherEnvironment]) {
        expect(await repository.save({ ...key, schemaVersion: 1, revision: 1, updatedAt: '2026-09-26T05:00:00.000Z',
          data: { title: 'Synthetic', content: key.entityId } }, payloadSchema)).toBe(true);
      }
      await repository.removeOwner(identity.scope, identity.ownerId);
      expect(await repository.hasAny(identity.scope, identity.ownerId)).toBe(false);
      expect(await repository.hasAny(identity.scope, otherOwner.ownerId)).toBe(true);
      expect(await repository.hasAny(otherEnvironment.scope, identity.ownerId)).toBe(true);
    } finally { db.close(); }
  });

  it('fails closed on storage errors without exposing SQLite details', async () => {
    const db = new DatabaseSync(':memory:');
    try {
      const database = sql(db);
      const repository = await openAuthoringDraftRepository({ ...database, runAsync: async () => { throw new Error('synthetic sqlite detail'); } });
      await expect(repository.save({ ...identity, schemaVersion: 1, revision: 1, updatedAt: '2026-09-26T05:00:00.000Z',
        data: { title: 'Synthetic', content: 'Draft' } }, payloadSchema)).rejects.toBeInstanceOf(DraftStorageError);
    } finally { db.close(); }
  });
});

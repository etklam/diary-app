import { z, type ZodType } from 'zod';
import { DraftStorageError, type DraftDatabase } from '../quick/repository';

const identitySchema = z.object({
  scope: z.string().min(1).max(2048),
  ownerId: z.string().min(1).max(256),
  entityType: z.string().min(1).max(100),
  entityId: z.string().min(1).max(256),
}).strict();

const rowSchema = z.object({
  scope: z.string(), owner_id: z.string(), entity_type: z.string(), entity_id: z.string(),
  schema_version: z.number().int(), revision: z.number().int(), updated_at: z.string(), payload: z.string(),
}).strict();

const sensitiveField = /password|token|secret|credential|authorization|api.?key/i;

export type AuthoringDraftIdentity = z.infer<typeof identitySchema>;
export type AuthoringDraft<T> = AuthoringDraftIdentity & {
  schemaVersion: number;
  revision: number;
  updatedAt: string;
  data: T;
};
export type AuthoringDraftRepository = ReturnType<typeof openAuthoringDraftRepository> extends Promise<infer R> ? R : never;
export type AuthoringDraftMigrations = Readonly<Record<number, (data: unknown) => unknown>>;

export async function openAuthoringDraftRepository(db: DraftDatabase) {
  await db.execAsync(`CREATE TABLE IF NOT EXISTS authoring_drafts (
    scope TEXT NOT NULL,
    owner_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    schema_version INTEGER NOT NULL,
    revision INTEGER NOT NULL,
    updated_at TEXT NOT NULL,
    payload TEXT NOT NULL,
    PRIMARY KEY (scope, owner_id, entity_type, entity_id)
  )`);

  // A single queue also makes explicit deletion a fence against older scheduled saves.
  let queue: Promise<unknown> = Promise.resolve();
  const run = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.then(operation).catch(() => { throw new DraftStorageError(); });
    queue = result.catch(() => {});
    return result;
  };

  return {
    load<T>(identity: AuthoringDraftIdentity, options: {
      schemaVersion: number;
      schema: ZodType<T>;
      migrations?: AuthoringDraftMigrations;
    }): Promise<AuthoringDraft<T> | null> {
      return run(async () => {
        const key = identitySchema.parse(identity);
        const targetVersion = positiveVersion(options.schemaVersion);
        const row = await db.getFirstAsync<unknown>(
          'SELECT scope, owner_id, entity_type, entity_id, schema_version, revision, updated_at, payload FROM authoring_drafts WHERE scope = ? AND owner_id = ? AND entity_type = ? AND entity_id = ?',
          key.scope, key.ownerId, key.entityType, key.entityId,
        );
        if (!row) return null;
        const stored = rowSchema.parse(row);
        if (stored.scope !== key.scope || stored.owner_id !== key.ownerId
          || stored.entity_type !== key.entityType || stored.entity_id !== key.entityId
          || !Number.isSafeInteger(stored.revision) || stored.revision < 1
          || !Number.isSafeInteger(stored.schema_version) || stored.schema_version < 1
          || !z.iso.datetime().safeParse(stored.updated_at).success) throw new DraftStorageError();
        if (stored.schema_version > targetVersion) throw new DraftStorageError();

        let data: unknown = JSON.parse(stored.payload);
        assertNoSensitiveFields(data);
        for (let version = stored.schema_version; version < targetVersion; version += 1) {
          const migrate = options.migrations?.[version];
          if (!migrate) throw new DraftStorageError();
          data = migrate(data);
          assertNoSensitiveFields(data);
        }
        return {
          ...key,
          schemaVersion: targetVersion,
          revision: stored.revision,
          updatedAt: stored.updated_at,
          data: options.schema.parse(data),
        };
      });
    },

    save<T>(draft: AuthoringDraft<T>, schema: ZodType<T>): Promise<boolean> {
      return run(async () => {
        const key = identitySchema.parse({ scope: draft.scope, ownerId: draft.ownerId,
          entityType: draft.entityType, entityId: draft.entityId });
        const version = positiveVersion(draft.schemaVersion);
        if (!Number.isSafeInteger(draft.revision) || draft.revision < 1
          || !z.iso.datetime().safeParse(draft.updatedAt).success) throw new DraftStorageError();
        const data = schema.parse(draft.data);
        assertNoSensitiveFields(data);
        const payload = JSON.stringify(data);
        if (payload === undefined) throw new DraftStorageError();
        const result = await db.runAsync(
          'INSERT INTO authoring_drafts(scope, owner_id, entity_type, entity_id, schema_version, revision, updated_at, payload) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(scope, owner_id, entity_type, entity_id) DO UPDATE SET schema_version = excluded.schema_version, revision = excluded.revision, updated_at = excluded.updated_at, payload = excluded.payload WHERE excluded.revision > authoring_drafts.revision',
          key.scope, key.ownerId, key.entityType, key.entityId, version, draft.revision, draft.updatedAt, payload,
        ) as { changes?: unknown };
        return typeof result?.changes === 'number' && result.changes > 0;
      });
    },

    remove(identity: AuthoringDraftIdentity): Promise<void> {
      return run(async () => {
        const key = identitySchema.parse(identity);
        await db.runAsync(
          'DELETE FROM authoring_drafts WHERE scope = ? AND owner_id = ? AND entity_type = ? AND entity_id = ?',
          key.scope, key.ownerId, key.entityType, key.entityId,
        );
      });
    },

    hasAny(scope: string, ownerId: string): Promise<boolean> {
      return run(async () => {
        const row = await db.getFirstAsync<{ entity_id: string }>(
          'SELECT entity_id FROM authoring_drafts WHERE scope = ? AND owner_id = ? LIMIT 1', scope, ownerId,
        );
        return row !== null;
      });
    },

    removeOwner(scope: string, ownerId: string): Promise<void> {
      return run(async () => {
        if (!scope || !ownerId) throw new DraftStorageError();
        await db.runAsync('DELETE FROM authoring_drafts WHERE scope = ? AND owner_id = ?', scope, ownerId);
      });
    },
  };
}

function positiveVersion(value: number) {
  if (!Number.isSafeInteger(value) || value < 1) throw new DraftStorageError();
  return value;
}

function assertNoSensitiveFields(value: unknown) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (sensitiveField.test(key)) throw new DraftStorageError();
    assertNoSensitiveFields(child);
  }
}

import * as SQLite from 'expo-sqlite';
import * as SecureStore from 'expo-secure-store';
import { getRandomBytesAsync } from 'expo-crypto';
import { File } from 'expo-file-system';
import { openAuthoringDraftRepository, type AuthoringDraftRepository } from '../drafts/repository';
import { openReviewRepository, type ReviewRepository } from '../reviews/repository';
import { openDraftRepository, unlockDraftDatabase, type DraftRepository } from './repository';

let database: ReturnType<typeof unlockDraftDatabase> | undefined;
let repository: Promise<DraftRepository> | undefined;
let reviews: Promise<ReviewRepository> | undefined;
let authoring: Promise<AuthoringDraftRepository> | undefined;
export function nativeDraftRepository() { return repository ??= nativeDraftDatabase().then(openDraftRepository); }
export function nativeReviewRepository() { return reviews ??= nativeDraftDatabase().then(openReviewRepository); }
export function nativeAuthoringDraftRepository() { return authoring ??= nativeDraftDatabase().then(openAuthoringDraftRepository); }
export function nativeDraftDatabase() {
  if (!database) database = (async () => {
    const name = 'quick-drafts-v1.db';
    const keyName = 'diary.drafts.sqlcipher.v1';
    // SQLite returns an absolute Android path; File requires a file URI.
    const directory = SQLite.defaultDatabaseDirectory;
    const directoryUri = directory.startsWith('file://') ? directory : `file://${directory}`;
    const db = await unlockDraftDatabase({
      exists: () => new File(directoryUri, name).exists,
      getKey: () => SecureStore.getItemAsync(keyName),
      setKey: key => SecureStore.setItemAsync(keyName, key, { keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
      randomBytes: () => getRandomBytesAsync(32),
      open: () => SQLite.openDatabaseAsync(name),
    });
    if (__DEV__) {
      const cipher = await db.getFirstAsync<{ cipher_version: string }>('PRAGMA cipher_version');
      // Non-secret native build evidence only. Never log keys, rows or SQL errors.
      console.info(`Encrypted draft storage ready (SQLCipher ${cipher?.cipher_version})`);
    }
    return db;
  })();
  return database;
}

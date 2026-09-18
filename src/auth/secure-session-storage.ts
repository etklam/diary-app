import { nativeTokenPairSchema, type NativeSession } from '@diary/contracts';
import type { NativeSessionStorage } from '@diary/api-client';

export type SecureStoreBackend = {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
};

export class SessionStorageError extends Error {
  constructor(readonly operation: 'read' | 'write' | 'clear', options?: ErrorOptions) {
    super(`Secure session storage ${operation} failed.`, options);
    this.name = 'SessionStorageError';
  }
}

export function createSecureSessionStorage(
  backend: SecureStoreBackend,
  key: string,
): NativeSessionStorage {
  return {
    async get() {
      let stored: string | null;
      try {
        stored = await backend.getItemAsync(key);
      } catch (cause) {
        throw new SessionStorageError('read', { cause });
      }
      if (stored === null) return null;

      try {
        return nativeTokenPairSchema.parse(JSON.parse(stored));
      } catch {
        try {
          await backend.deleteItemAsync(key);
        } catch (clearCause) {
          throw new SessionStorageError('clear', { cause: clearCause });
        }
        return null;
      }
    },
    async set(session: NativeSession) {
      const validated = nativeTokenPairSchema.parse(session);
      try {
        await backend.setItemAsync(key, JSON.stringify(validated));
      } catch (cause) {
        try {
          await backend.deleteItemAsync(key);
        } catch {
          // The original write error remains the actionable failure.
        }
        throw new SessionStorageError('write', { cause });
      }
    },
    async clear() {
      try {
        await backend.deleteItemAsync(key);
      } catch (cause) {
        throw new SessionStorageError('clear', { cause });
      }
    },
  };
}

import { describe, expect, it, vi } from 'vitest';

import { createSecureSessionStorage } from '../../src/auth/secure-session-storage';
import { session } from './fixtures';

function backend(value: string | null = null) {
  let stored = value;
  return {
    api: {
      getItemAsync: vi.fn(async () => stored),
      setItemAsync: vi.fn(async (_key: string, next: string) => { stored = next; }),
      deleteItemAsync: vi.fn(async () => { stored = null; }),
    },
    read: () => stored,
  };
}

describe('SecureStore session adapter', () => {
  it('stores the complete validated pair as one JSON value', async () => {
    const memory = backend();
    const storage = createSecureSessionStorage(memory.api, 'session-key');
    await storage.set(session());
    expect(memory.api.setItemAsync).toHaveBeenCalledTimes(1);
    expect(await storage.get()).toEqual(session());
  });

  it('clears malformed stored data instead of returning a partial session', async () => {
    const memory = backend(JSON.stringify({ accessToken: 'only-one-token' }));
    const storage = createSecureSessionStorage(memory.api, 'session-key');
    await expect(storage.get()).resolves.toBeNull();
    expect(memory.api.deleteItemAsync).toHaveBeenCalledWith('session-key');
  });

  it('fails closed and attempts cleanup when a secure write fails', async () => {
    const memory = backend();
    memory.api.setItemAsync.mockRejectedValueOnce(new Error('keystore unavailable'));
    const storage = createSecureSessionStorage(memory.api, 'session-key');
    await expect(storage.set(session())).rejects.toMatchObject({
      name: 'SessionStorageError',
      operation: 'write',
    });
    expect(memory.api.deleteItemAsync).toHaveBeenCalledWith('session-key');
  });

  it('surfaces read and cleanup errors without inventing a signed-out state', async () => {
    const memory = backend('{broken');
    memory.api.deleteItemAsync.mockRejectedValueOnce(new Error('keystore unavailable'));
    await expect(createSecureSessionStorage(memory.api, 'session-key').get())
      .rejects.toMatchObject({ name: 'SessionStorageError', operation: 'clear' });
  });
});

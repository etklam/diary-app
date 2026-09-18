import { NativeSessionError, type NativeSessionStorage } from '@diary/api-client';
import { describe, expect, it, vi } from 'vitest';

import { createAuthLifecycle } from '../../src/auth/lifecycle';
import type { AuthRuntime } from '../../src/auth/runtime';
import { SessionStorageError } from '../../src/auth/secure-session-storage';
import { deferred, session, user } from './fixtures';

function memoryStorage(initial: ReturnType<typeof session> | null = session()): NativeSessionStorage & { current: ReturnType<typeof session> | null } {
  return {
    current: initial,
    get() { return this.current; },
    set(next) { this.current = next; },
    clear() { this.current = null; },
  };
}

describe('auth lifecycle', () => {
  it('bootstraps through GET /api/auth/me and preserves storage on a normal network failure', async () => {
    const storage = memoryStorage();
    const runtime: AuthRuntime = {
      login: vi.fn(), logout: vi.fn(),
      verifyCurrentUser: vi.fn().mockRejectedValueOnce(new TypeError('offline')).mockResolvedValueOnce({ ok: true, user: user() }),
    };
    const lifecycle = createAuthLifecycle({ storage, runtime });
    await lifecycle.bootstrap();
    expect(lifecycle.getState()).toEqual({ status: 'recoverable-error', issue: 'network', user: null });
    expect(storage.current).not.toBeNull();
    await lifecycle.retryVerification();
    expect(lifecycle.getState()).toEqual({ status: 'signed-in', user: user() });
  });

  it('maps invalid credentials and secure storage failures explicitly', async () => {
    const storage = memoryStorage(null);
    const runtime: AuthRuntime = {
      login: vi.fn().mockRejectedValueOnce(new NativeSessionError(401, 'AUTH_LOGIN_INVALID_CREDENTIALS', null))
        .mockRejectedValueOnce(new SessionStorageError('write')),
      logout: vi.fn(), verifyCurrentUser: vi.fn(),
    };
    const lifecycle = createAuthLifecycle({ storage, runtime });
    await lifecycle.login({ email: 'a@example.test', password: 'wrong-password' });
    expect(lifecycle.getState()).toMatchObject({ status: 'signed-out', issue: 'invalid-credentials' });
    await lifecycle.login({ email: 'a@example.test', password: 'valid-password' });
    expect(lifecycle.getState()).toEqual({ status: 'session-invalid', issue: 'storage' });
  });

  it('invalidates locally before remote logout and ignores a late verification response', async () => {
    const pending = deferred<{ ok: true; user: ReturnType<typeof user> }>();
    const storage = memoryStorage();
    const remoteLogout = deferred<void>();
    const owners: Array<[string | null, string | null]> = [];
    const runtime: AuthRuntime = {
      login: vi.fn(),
      logout: vi.fn(() => remoteLogout.promise),
      verifyCurrentUser: vi.fn(() => pending.promise),
    };
    const lifecycle = createAuthLifecycle({ storage, runtime, onOwnerChange: (...change) => owners.push(change) });
    const bootstrap = lifecycle.bootstrap();
    const logout = lifecycle.logout();
    expect(lifecycle.getState()).toEqual({ status: 'signed-out', revocationConfirmed: false });
    pending.resolve({ ok: true, user: user() });
    await bootstrap;
    expect(lifecycle.getState().status).toBe('signed-out');
    remoteLogout.reject(new TypeError('offline'));
    await logout;
    expect(lifecycle.getState()).toEqual({ status: 'signed-out', issue: 'logout-unconfirmed', revocationConfirmed: false });
    expect(owners).not.toContainEqual([null, 'user-a']);
  });

  it('clears owner-bound state before switching accounts and rejects identity mismatches', async () => {
    const storage = memoryStorage(null);
    const accountB = session('2', 'b');
    const owners: Array<[string | null, string | null]> = [];
    const runtime: AuthRuntime = {
      login: vi.fn(async () => accountB), logout: vi.fn(async () => {}),
      verifyCurrentUser: vi.fn(async () => ({ ok: true as const, user: user('1', 'a@example.test') })),
    };
    const lifecycle = createAuthLifecycle({ storage, runtime, onOwnerChange: (...change) => owners.push(change) });
    await lifecycle.login({ email: 'b@example.test', password: 'password' });
    expect(lifecycle.getState()).toEqual({ status: 'session-invalid', issue: 'session-invalid' });
    expect(owners).not.toContainEqual([null, '2']);
    expect(runtime.logout).toHaveBeenCalledOnce();
  });
});

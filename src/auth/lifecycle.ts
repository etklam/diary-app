import { NativeSessionError, type NativeSessionStorage } from '@diary/api-client';
import type { AuthUser, LoginRequest, NativeSession } from '@diary/contracts';

import type { AuthRuntime } from './runtime';
import { SessionStorageError } from './secure-session-storage';

export type AuthIssue =
  | 'invalid-credentials'
  | 'network'
  | 'server'
  | 'session-invalid'
  | 'storage'
  | 'logout-unconfirmed';

export type AuthState =
  | { status: 'bootstrapping' }
  | { status: 'signed-out'; issue?: 'invalid-credentials' | 'logout-unconfirmed'; revocationConfirmed?: boolean }
  | { status: 'signed-in'; user: AuthUser }
  | { status: 'recoverable-error'; issue: 'network' | 'server'; user: AuthUser | null }
  | { status: 'session-invalid'; issue: 'session-invalid' | 'storage' };

type Listener = (state: AuthState) => void;

export type AuthLifecycle = ReturnType<typeof createAuthLifecycle>;

function isNetworkError(error: unknown) {
  return error instanceof TypeError || (error instanceof Error && error.name === 'AbortError');
}

export function createAuthLifecycle(options: {
  storage: NativeSessionStorage;
  runtime: AuthRuntime;
  onOwnerChange?: (previousOwnerId: string | null, nextOwnerId: string | null) => void;
}) {
  let state: AuthState = { status: 'bootstrapping' };
  let operation = 0;
  let ownerId: string | null = null;
  const listeners = new Set<Listener>();

  const emit = (next: AuthState) => {
    state = next;
    for (const listener of listeners) listener(next);
  };
  const setOwner = (nextOwnerId: string | null) => {
    if (ownerId === nextOwnerId) return;
    const previousOwnerId = ownerId;
    ownerId = nextOwnerId;
    options.onOwnerChange?.(previousOwnerId, nextOwnerId);
  };
  const commitVerified = (expected: number, stored: NativeSession, user: AuthUser) => {
    if (expected !== operation) return false;
    if (stored.user.id !== user.id) {
      void Promise.resolve(options.runtime.logout()).catch(() => {});
      setOwner(null);
      emit({ status: 'session-invalid', issue: 'session-invalid' });
      return false;
    }
    setOwner(user.id);
    emit({ status: 'signed-in', user });
    return true;
  };
  const handleVerificationFailure = async (
    expected: number,
    result: { status: number },
    previousUser: AuthUser | null,
  ) => {
    if (expected !== operation) return;
    if (result.status === 401 || result.status === 403) {
      try {
        await options.storage.clear();
      } catch {
        if (expected === operation) emit({ status: 'session-invalid', issue: 'storage' });
        return;
      }
      if (expected === operation) {
        setOwner(null);
        emit({ status: 'session-invalid', issue: 'session-invalid' });
      }
      return;
    }
    emit({ status: 'recoverable-error', issue: 'server', user: previousUser });
  };
  const verify = async (expected: number, stored: NativeSession, previousUser: AuthUser | null) => {
    try {
      const result = await options.runtime.verifyCurrentUser();
      if (result.ok) commitVerified(expected, stored, result.user);
      else await handleVerificationFailure(expected, result, previousUser);
    } catch (error) {
      if (expected !== operation) return;
      emit({
        status: 'recoverable-error',
        issue: isNetworkError(error) ? 'network' : 'server',
        user: previousUser,
      });
    }
  };

  return {
    getState: () => state,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async bootstrap() {
      const expected = ++operation;
      emit({ status: 'bootstrapping' });
      let stored: NativeSession | null;
      try {
        stored = await options.storage.get();
      } catch {
        if (expected === operation) {
          setOwner(null);
          emit({ status: 'session-invalid', issue: 'storage' });
        }
        return;
      }
      if (expected !== operation) return;
      if (!stored) {
        setOwner(null);
        emit({ status: 'signed-out' });
        return;
      }
      await verify(expected, stored, null);
    },
    async retryVerification() {
      const previousUser = state.status === 'signed-in'
        ? state.user
        : state.status === 'recoverable-error' ? state.user : null;
      const expected = ++operation;
      let stored: NativeSession | null;
      try {
        stored = await options.storage.get();
      } catch {
        if (expected === operation) emit({ status: 'session-invalid', issue: 'storage' });
        return;
      }
      if (!stored) {
        if (expected === operation) {
          setOwner(null);
          emit(previousUser
            ? { status: 'session-invalid', issue: 'session-invalid' }
            : { status: 'signed-out' });
        }
        return;
      }
      if (!previousUser) emit({ status: 'bootstrapping' });
      await verify(expected, stored, previousUser);
    },
    async login(credentials: LoginRequest) {
      const expected = ++operation;
      emit({ status: 'bootstrapping' });
      let stored: NativeSession;
      try {
        stored = await options.runtime.login(credentials);
      } catch (error) {
        if (expected !== operation) return;
        setOwner(null);
        if (error instanceof SessionStorageError) {
          emit({ status: 'session-invalid', issue: 'storage' });
          return;
        }
        emit({
          status: 'signed-out',
          ...(error instanceof NativeSessionError && error.code === 'AUTH_LOGIN_INVALID_CREDENTIALS'
            ? { issue: 'invalid-credentials' as const }
            : {}),
        });
        return;
      }
      await verify(expected, stored, null);
    },
    async logout() {
      const expected = ++operation;
      setOwner(null);
      emit({ status: 'signed-out', revocationConfirmed: false });
      try {
        await options.runtime.logout();
        if (expected === operation) emit({ status: 'signed-out', revocationConfirmed: true });
      } catch {
        if (expected === operation) {
          emit({ status: 'signed-out', issue: 'logout-unconfirmed', revocationConfirmed: false });
        }
      }
    },
  };
}

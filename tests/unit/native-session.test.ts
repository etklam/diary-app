import {
  createNativeSession,
  NativeSessionError,
  NO_AUTOMATIC_SESSION_RETRY_HEADER,
  type NativeSessionStorage,
} from '@diary/api-client';
import type { NativeSession } from '@diary/contracts';
import { describe, expect, it, vi } from 'vitest';

import { deferred, session } from './fixtures';

const baseUrl = 'https://diary.test';
const sessionResponse = (suffix: string) => Response.json({ ok: true, data: session('1', suffix) });
const apiError = (status: number, code: string) => Response.json({
  statusCode: status,
  statusMessage: 'Response text is not the client error key',
  data: { code, details: null, requestId: 'request-test' },
}, { status });

function storage(initial: NativeSession | null = session()) {
  let value = initial;
  return {
    get: vi.fn(() => value),
    set: vi.fn((next: NativeSession) => { value = next; }),
    clear: vi.fn(() => { value = null; }),
  } satisfies NativeSessionStorage;
}

describe('vendored native session transport', () => {
  it('maps invalid credentials to the stable contract code', async () => {
    const store = storage(null);
    const client = createNativeSession({
      baseUrl,
      storage: store,
      fetch: async () => apiError(401, 'AUTH_LOGIN_INVALID_CREDENTIALS'),
    });
    await expect(client.login({ email: 'a@example.test', password: 'incorrect' })).rejects.toMatchObject({
      name: 'NativeSessionError', status: 401, code: 'AUTH_LOGIN_INVALID_CREDENTIALS',
    });
    expect(store.get()).toBeNull();
  });

  it('coalesces concurrent 401 refreshes and replays each request once', async () => {
    const store = storage();
    const refresh = deferred<Response>();
    const refreshStarted = deferred<void>();
    let refreshCount = 0;
    const client = createNativeSession({ baseUrl, storage: store, fetch: async (input) => {
      const request = new Request(input);
      expect(request.credentials).toBe('omit');
      expect(request.headers.has('cookie')).toBe(false);
      if (request.url.endsWith('/refresh')) {
        refreshCount++;
        refreshStarted.resolve();
        return refresh.promise;
      }
      return new Response(null, {
        status: request.headers.get('authorization') === 'Bearer access-b' ? 200 : 401,
      });
    } });
    const requests = [1, 2, 3].map(() => client.fetch(`${baseUrl}/api/auth/me`, {
      headers: { cookie: 'web-session=must-not-cross' },
    }));
    await refreshStarted.promise;
    refresh.resolve(sessionResponse('b'));
    expect((await Promise.all(requests)).map(({ status }) => status)).toEqual([200, 200, 200]);
    expect(refreshCount).toBe(1);
    expect(store.get()).toEqual(session('1', 'b'));
  });

  it.each(['rejected', 'lost-response', 'invalid-json'])('clears on %s refresh without retrying the old token', async (mode) => {
    const store = storage();
    let refreshCount = 0;
    let protectedCount = 0;
    const client = createNativeSession({ baseUrl, storage: store, fetch: async (input) => {
      if (new Request(input).url.endsWith('/refresh')) {
        refreshCount++;
        if (mode === 'lost-response') throw new TypeError('Network response lost');
        return mode === 'invalid-json' ? Response.json({}) : apiError(401, 'AUTH_TOKEN_EXPIRED');
      }
      protectedCount++;
      return new Response(null, { status: 401 });
    } });
    expect((await client.fetch(`${baseUrl}/api/auth/me`)).status).toBe(401);
    expect(store.get()).toBeNull();
    await client.fetch(`${baseUrl}/api/auth/me`);
    expect({ refreshCount, protectedCount }).toEqual({ refreshCount: 1, protectedCount: 2 });
  });

  it('uses an already rotated token for a late 401', async () => {
    const late = deferred<Response>();
    let refreshCount = 0;
    const client = createNativeSession({ baseUrl, storage: storage(), fetch: async (input) => {
      const request = new Request(input);
      if (request.url.endsWith('/refresh')) { refreshCount++; return sessionResponse('b'); }
      if (request.headers.get('authorization') === 'Bearer access-b') return new Response(null, { status: 200 });
      return request.url.endsWith('/late') ? late.promise : new Response(null, { status: 401 });
    } });
    const pending = client.fetch(`${baseUrl}/api/late`);
    expect((await client.fetch(`${baseUrl}/api/fast`)).status).toBe(200);
    late.resolve(new Response(null, { status: 401 }));
    expect((await pending).status).toBe(200);
    expect(refreshCount).toBe(1);
  });

  it('does not resurrect a session when logout wins an in-flight refresh', async () => {
    const store = storage();
    const response = deferred<Response>();
    const started = deferred<void>();
    const client = createNativeSession({ baseUrl, storage: store, fetch: async (input) => {
      if (new Request(input).url.endsWith('/refresh')) { started.resolve(); return response.promise; }
      return new Response(null, { status: 204 });
    } });
    const refresh = client.refresh();
    await started.promise;
    await client.logout();
    response.resolve(sessionResponse('b'));
    await expect(refresh).rejects.toThrow('changed');
    expect(store.get()).toBeNull();
  });

  it('does not replay a request marked as uncertain', async () => {
    const store = storage();
    const transport = vi.fn(async () => new Response(null, { status: 401 }));
    const client = createNativeSession({ baseUrl, storage: store, fetch: transport });
    const response = await client.fetch(`${baseUrl}/api/diaries`, {
      method: 'POST',
      headers: { [NO_AUTOMATIC_SESSION_RETRY_HEADER]: '1' },
      body: '{"content":"one copy"}',
    });
    expect(response.status).toBe(401);
    expect(transport).toHaveBeenCalledOnce();
    expect(store.get()).toEqual(session());
  });

  it('clears local state before an offline remote logout completes', async () => {
    const store = storage();
    const client = createNativeSession({ baseUrl, storage: store, fetch: async () => {
      throw new TypeError('Offline');
    } });
    await expect(client.logout()).rejects.toThrow('Offline');
    expect(store.get()).toBeNull();
  });

  it('never sends credentials to another origin', async () => {
    const transport = vi.fn();
    const client = createNativeSession({ baseUrl, storage: storage(), fetch: transport });
    await expect(client.fetch('https://foreign.test/api/auth/me')).rejects.toThrow('another origin');
    expect(transport).not.toHaveBeenCalled();
  });

  it('retains NativeSessionError identity for invalid refresh', async () => {
    const client = createNativeSession({ baseUrl, storage: storage(), fetch: async () => apiError(401, 'AUTH_TOKEN_EXPIRED') });
    await expect(client.refresh()).rejects.toBeInstanceOf(NativeSessionError);
  });
});

import { describe, expect, it, vi } from 'vitest';

import { createTimeoutFetch } from '../../src/auth/runtime';

describe('API request timeout', () => {
  it('forwards cancellation carried by a generated Request', async () => {
    const abort = new AbortController();
    const transport: typeof fetch = async (_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    });
    const request = createTimeoutFetch(transport)(new Request('https://diary.test/api/diaries/summary', { signal: abort.signal }));
    const assertion = expect(request).rejects.toMatchObject({ name: 'AbortError' });
    abort.abort(); await assertion;
  });
  it('aborts an unresponsive transport', async () => {
    vi.useFakeTimers();
    const transport = vi.fn((_input: RequestInfo | URL, init?: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    })) as typeof fetch;
    const assertion = expect(createTimeoutFetch(transport, 50)('https://diary.test/api/auth/me'))
      .rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(50);
    await assertion;
    vi.useRealTimers();
  });
});

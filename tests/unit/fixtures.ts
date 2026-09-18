import type { AuthUser, NativeSession } from '@diary/contracts';

export function user(id = '1', email = 'a@example.test'): AuthUser {
  return {
    id,
    email,
    name: null,
    role: 'USER',
    expectedMonthlyTrades: 4,
    expectedProfit: '8.00',
    expectedAvgHolding: '14 days',
    timezone: 'Asia/Taipei',
  };
}

export function session(id = '1', suffix = 'a'): NativeSession {
  return {
    accessToken: `access-${suffix}`,
    refreshToken: `refresh-${suffix}`,
    accessTokenExpiresAt: '2026-09-19T01:00:00.000Z',
    refreshTokenExpiresAt: '2026-10-19T01:00:00.000Z',
    user: user(id, `${id}@example.test`),
  };
}

export function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

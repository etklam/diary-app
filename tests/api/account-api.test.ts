import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { accountService, registerAccount } from '../../src/account/service';
import { userSettingsResponseSchema } from '@diary/contracts/settings';

const baseUrl = process.env.DIARY_API_BASE_URL;
const enabled = process.env.DIARY_DISPOSABLE_TEST_ENV === '1' && !!baseUrl;
describe.skipIf(!enabled)('F1 disposable account/security/preferences acceptance', () => {
  it('registers, round-trips exact settings, isolates owners and revokes native/Web sessions', async () => {
    if (!baseUrl || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname)) throw new Error('Local disposable API required');
    const scenario = randomUUID();
    let rateScenario = scenario;
    const transport: typeof fetch = (input, init) => {
      const request = new Request(input, init);
      const clientId = rateScenario.replaceAll('-', '');
      request.headers.set('x-e2e-test-id', rateScenario);
      request.headers.set('x-forwarded-for', `fd00:${clientId.slice(0, 4)}:${clientId.slice(4, 8)}:${clientId.slice(8, 12)}::1`);
      return fetch(request);
    };
    const publicApi = createApiClient({ baseUrl, fetch: transport });
    const credentials = { email: `f1-${scenario}@example.test`, password: 'SyntheticF1Original' };
    await registerAccount(publicApi, credentials);
    await expect(registerAccount(publicApi, credentials)).rejects.toMatchObject({ kind: 'rejected' });
    function client() {
      let stored: Awaited<ReturnType<ReturnType<typeof createNativeSession>['login']>> | null = null;
      const native = createNativeSession({ baseUrl: baseUrl!, fetch: transport, storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } } });
      return { native, api: createApiClient({ baseUrl: baseUrl!, fetch: native.fetch }) };
    }
    const first = client(), second = client();
    const firstPair = await first.native.login(credentials); const secondPair = await second.native.login(credentials);
    const web = await transport(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) });
    expect(web.status).toBe(200);
    const cookie = web.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    expect((await transport(`${baseUrl}/api/auth/me`, { headers: { cookie } })).status).toBe(200);
    const service = accountService(first.api, { isCurrent: () => true });
    const saved = await service.save({ name: 'Synthetic F1', timezone: 'Pacific/Kiritimati', locale: 'zh-TW', defaultWorkspacePage: 'calendar', expectedMonthlyTrades: 0, expectedProfit: '9999999999999.99', expectedAvgHolding: '0', excludeHolidaysInStats: true });
    expect(saved).toMatchObject({ expectedMonthlyTrades: 0, expectedProfit: '9999999999999.99', expectedAvgHolding: '0.00', timezone: 'Pacific/Kiritimati', locale: 'zh-TW', defaultWorkspacePage: 'calendar', excludeHolidaysInStats: true });
    expect(userSettingsResponseSchema.parse((await second.api.GET('/api/user/settings')).data).settings).toEqual(saved);
    await expect(service.password({ currentPassword: 'wrong-password', newPassword: 'SyntheticF1Changed' })).rejects.toMatchObject({ kind: 'rejected', code: 'AUTH_LOGIN_INVALID_CREDENTIALS' });
    expect((await second.api.GET('/api/auth/me')).response.ok).toBe(true);
    await service.password({ currentPassword: credentials.password, newPassword: 'SyntheticF1Changed' });
    for (const pair of [firstPair, secondPair]) {
      expect((await transport(`${baseUrl}/api/auth/me`, { headers: { authorization: `Bearer ${pair.accessToken}` } })).status).toBe(401);
      expect((await transport(`${baseUrl}/api/auth/native/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: pair.refreshToken }) })).status).toBe(401);
    }
    expect((await transport(`${baseUrl}/api/auth/me`, { headers: { cookie } })).status).toBe(401);
    await expect(first.native.login(credentials)).rejects.toMatchObject({ code: 'AUTH_LOGIN_INVALID_CREDENTIALS' });
    rateScenario = randomUUID(); // Separate the reauthentication phase from the fixture's deliberate five-login limit.
    const nextCredentials = { ...credentials, password: 'SyntheticF1Changed' };
    await first.native.login(nextCredentials); const latest = await second.native.login(nextCredentials);
    const nextWeb = await transport(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(nextCredentials) });
    expect(nextWeb.status).toBe(200);
    const nextCookie = nextWeb.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    expect(await service.read()).toEqual(saved);
    await service.logoutAll();
    expect((await transport(`${baseUrl}/api/auth/me`, { headers: { cookie: nextCookie } })).status).toBe(401);
    expect((await transport(`${baseUrl}/api/auth/me`, { headers: { authorization: `Bearer ${latest.accessToken}` } })).status).toBe(401);
    expect((await transport(`${baseUrl}/api/auth/native/refresh`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ refreshToken: latest.refreshToken }) })).status).toBe(401);
    // Different-owner settings never inherit the first owner's preference values.
    const otherCredentials = { email: `other-${scenario}@example.test`, password: 'SyntheticF1Other' };
    await registerAccount(publicApi, otherCredentials); await first.native.login(otherCredentials);
    expect((await service.read()).name).not.toBe('Synthetic F1');
    await first.native.logout(); await second.native.logout().catch(() => {});
    await mkdir('docs/evidence/f1', { recursive: true });
    await writeFile('docs/evidence/f1/api.json', JSON.stringify({ result: 'PASS', checks: ['registration and duplicate rejection', 'exact money and zero settings', 'locale/timezone/workspace/holiday round trip', 'wrong password preserves sessions', 'password change revokes two native access/refresh pairs and Web cookie', 'old password denied', 'logout-all revokes other device and fresh Web cookie', 'different-owner settings isolation'] }, null, 2) + '\n');
  }, 60_000);
});

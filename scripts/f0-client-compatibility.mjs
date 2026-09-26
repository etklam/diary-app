import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { createApiClient, createNativeSession } from '@diary/api-client';

const baseUrl = process.env.DIARY_API_BASE_URL;
if (process.env.DIARY_DISPOSABLE_TEST_ENV !== '1' || !baseUrl || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname)) {
  throw new Error('Requires explicitly enabled local disposable API');
}
const results = [];
const scenario = randomUUID();
const testClientAddress = (id) => {
  const clientId = id.replaceAll('-', '');
  return `fd00:${clientId.slice(0, 4)}:${clientId.slice(4, 8)}:${clientId.slice(8, 12)}::1`;
};
const transport = (input, init) => {
  const request = new Request(input, init);
  request.headers.set('x-e2e-test-id', scenario);
  request.headers.set('x-forwarded-for', testClientAddress(scenario));
  return fetch(request);
};
for (const [label, packageRoot] of [['current', '.'], ['previous', 'tests/compatibility']]) {
  const require = createRequire(resolve(packageRoot, 'package.json'));
  const { createNativeSession, createApiClient } = await import(pathToFileURL(require.resolve('@diary/api-client')).href);
  const { diaryResponseSchema, authUserResponseSchema } = await import(pathToFileURL(require.resolve('@diary/contracts')).href);
  const { diaryReviewResponseSchema } = await import(pathToFileURL(require.resolve('@diary/contracts/review')).href);
  const credentials = { email: `f0-${label}-${randomUUID()}@example.test`, password: 'SyntheticF02026' };
  assert.equal((await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) })).status, 200);
  let stored = null;
  const storage = { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } };
  const first = createNativeSession({ baseUrl, storage, fetch: transport });
  const signedIn = await first.login(credentials);
  const native = createNativeSession({ baseUrl, storage, fetch: transport });
  const api = createApiClient({ baseUrl, fetch: native.fetch });
  assert.equal(authUserResponseSchema.parse((await api.GET('/api/auth/me')).data).data.id, signedIn.user.id);
  let id;
  try {
    const body = { date: '2024-02-29', title: 'Synthetic compatibility', content: 'Original', tags: [], stockSymbols: [] };
    const created = await api.POST('/api/diaries', { body });
    assert.equal(created.response.status, 201);
    id = diaryResponseSchema.parse(created.data).id;
    assert.equal(typeof id, 'string');
    const appended = await api.POST('/api/diaries', { body: { ...body, content: 'Append', appendToToday: true } });
    assert.equal(diaryResponseSchema.parse(appended.data).content, 'Original\n\n---\n\nAppend');
    const params = { path: { id } };
    const reviewed = await api.PATCH('/api/diaries/{id}/review', { params, body: {
      reviewOutcome: 'PARTIAL', reviewSummary: 'Synthetic review', reviewLearning: 'Synthetic learning', reviewAdjustment: 'Synthetic adjustment',
    } });
    assert.equal(reviewed.response.status, 200);
    assert.equal(diaryReviewResponseSchema.parse(reviewed.data).reviewStatus, 'reviewed');
    assert.equal(diaryResponseSchema.parse((await api.GET('/api/diaries/{id}', { params })).data).date, body.date);
    assert.equal((await api.GET('/api/admin/users')).response.status, 403);
    const latencies = [];
    for (let index = 0; index < 20; index++) {
      const start = performance.now();
      assert.equal((await api.GET('/api/diaries/summary', { params: { query: { page: 1, limit: 20, sortBy: 'date-desc' } } })).response.status, 200);
      latencies.push(performance.now() - start);
    }
    latencies.sort((a, b) => a - b);
    results.push({ client: label, result: 'PASS', checks: ['login', 'session restore', 'create', 'append', 'review', 'detail', 'USER admin denial'],
      listTiming: { samples: 20, records: 1, p50Ms: latencies[9], p95Ms: latencies[18], environment: 'local synthetic API; warm one-record smoke, not a load benchmark' } });
  } finally {
    if (id) assert.equal((await api.DELETE('/api/diaries/{id}', { params: { path: { id } } })).response.ok, true);
    await native.logout();
    assert.equal(stored, null);
  }
}
const clients = [];
async function fixtureAccount(label, admin = false) {
  const fixtureScenario = randomUUID();
  const transport = (input, init) => {
    const request = new Request(input, init);
    request.headers.set('x-e2e-test-id', fixtureScenario);
    request.headers.set('x-forwarded-for', testClientAddress(fixtureScenario));
    return fetch(request);
  };
  const credentials = admin ? { email: 'etf-admin@example.test', password: 'synthetic-etf-admin-password' } :
    { email: `f0-${label}-${randomUUID()}@example.test`, password: 'SyntheticF02026' };
  if (!admin) assert.equal((await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) })).status, 200);
  let stored = null;
  const native = createNativeSession({ baseUrl, fetch: transport, storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } } });
  await native.login(credentials); clients.push(native);
  return { email: credentials.email, api: createApiClient({ baseUrl, fetch: native.fetch }) };
}
try {
  const admin = await fixtureAccount('admin', true);
  const a = await fixtureAccount('partner-a');
  const b = await fixtureAccount('partner-b');
  assert.equal((await admin.api.GET('/api/admin/users')).response.status, 200);
  const invited = await a.api.POST('/api/partners', { body: { partnerEmail: b.email } });
  assert.equal(invited.response.status, 200);
  const params = { path: { id: invited.data.link.id } };
  assert.equal((await a.api.POST('/api/partners/{id}/accept', { params })).response.status, 403);
  assert.equal((await b.api.POST('/api/partners/{id}/accept', { params })).response.status, 200);
  assert.equal((await b.api.PUT('/api/partners/{id}/sharing', { params, body: { shareDiaries: true } })).response.status, 200);
  const links = (await a.api.GET('/api/partners')).data.links;
  assert.equal(links[0].partnerSharesDiaries, true);
  assert.equal(links[0].selfSharesDiaries, false);
  assert.equal((await a.api.DELETE('/api/partners/{id}', { params })).response.status, 200);
  const quote = await transport(`${baseUrl}/api/market/quote/SYN`);
  assert.equal(quote.status, 200);
  results.push({ client: 'current synthetic roles/providers', result: 'PASS', checks: ['ADMIN allow', 'Partner invite', 'wrong-side accept denied', 'accept', 'directional sharing', 'unlink', 'public synthetic quote'] });
} finally { for (const client of clients) await client.logout(); }
await mkdir('docs/evidence/f0', { recursive: true });
await writeFile('docs/evidence/f0/client-compatibility.json', JSON.stringify(results, null, 2) + '\n');
console.log(JSON.stringify(results, null, 2));

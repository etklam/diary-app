import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { diaryResponseSchema } from '@diary/contracts';
import { diarySummaryListResponseSchema } from '@diary/contracts/diary-summary';
import { diaryActivityResponseSchema } from '@diary/contracts/diary-activity';
import { reviewGroupsResponseSchema } from '@diary/contracts/review-queue';

const baseUrl = process.env.DIARY_API_BASE_URL;
const databaseUrl = process.env.DIARY_TEST_DATABASE_URL;
const local = value => ['localhost', '127.0.0.1', '[::1]'].includes(new URL(value).hostname);
if (process.env.DIARY_DISPOSABLE_TEST_ENV !== '1' || !baseUrl || !databaseUrl || !local(baseUrl) || !local(databaseUrl)
  || !/^\/diary_v3_e2e_[a-f0-9]{32}$/.test(new URL(databaseUrl).pathname)) {
  throw new Error('Requires local disposable API and its uniquely provisioned DIARY_TEST_DATABASE_URL; never use a persistent database.');
}
// The existing diary-v3 fixture toolchain supplies pg, not a production app dependency.
const fixtureRequire = createRequire(resolve(process.env.DIARY_V3_DIR ?? '../diary-v3', 'package.json'));
const { Pool } = fixtureRequire('pg');
const db = new Pool({ connectionString: databaseUrl });
const keep = process.argv.includes('--keep-fixtures');
const run = randomUUID().slice(0, 8);
const scenario = randomUUID();
const transport = (input, init) => {
  const request = new Request(input, init);
  // Existing disposable harness isolates rate-limit state per test scenario.
  request.headers.set('x-e2e-test-id', scenario);
  return fetch(request);
};
const accounts = [], fixtures = [];
const buckets = ['overdue', 'today', 'upcoming', 'unscheduled', 'completed'];
let passed = false;
async function account(label) {
  const credentials = { email: `p1c-${label}-${run}@example.test`, password: 'SyntheticP1c2026' };
  assert.equal((await transport(`${baseUrl}/api/auth/register`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials) })).status, 200);
  let stored = null;
  const native = createNativeSession({ baseUrl, fetch: transport, storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } } });
  const login = await native.login(credentials);
  const result = { credentials, native, owner: login.user.id, api: createApiClient({ baseUrl, fetch: native.fetch }) }; accounts.push(result);
  // Assert this API and the named disposable database are the same fixture environment.
  assert.equal((await db.query('select email from users where id=$1', [result.owner])).rows[0]?.email, credentials.email);
  await db.query("update users set timezone='Asia/Taipei' where id=$1", [result.owner]);
  return result;
}
try {
  const a = await account('a'), b = await account('b');
  // 25 overdue rows exercise a second page; four other buckets and three months.
  for (let index = 0; index < 33; index++) {
    const date = index < 25 ? `2024-02-${String(index + 1).padStart(2, '0')}` : index < 30 ? `2024-03-${String(index - 24).padStart(2, '0')}` : `2026-09-${String(index - 29).padStart(2, '0')}`;
    const created = await a.api.POST('/api/diaries', { body: { date, title: `Synthetic ${index % 2 ? 'Orchid' : 'Cobalt'} ${index}`, content: `Synthetic discovery marker ${index}`, stockSymbols: [index % 2 ? 'ORC' : 'SYN'] } });
    assert.equal(created.response.status, 201);
    const diary = diaryResponseSchema.parse(created.data); fixtures.push(diary);
    const bucket = index < 25 ? 'overdue' : buckets[(index - 25) % 4 + 1];
    // Established disposable SQL fixtures enable pending-without-date, which the
    // public authoring API cannot currently create. Bind IDs and verify ownership.
    await db.query(`update diaries set review_status=$1, review_due_at=case $2::text
      when 'overdue' then now()-interval '7 days' when 'today' then now()
      when 'upcoming' then now()+interval '7 days' else null end,
      reviewed_at=case when $2::text='completed' then now() else null end
      where id=$3 and user_id=$4`, [bucket === 'completed' ? 'reviewed' : 'pending', bucket, diary.id, a.owner]);
  }
  const summary = async (api, query = {}) => {
    const response = await api.GET('/api/diaries/summary', { params: { query: { page: 1, limit: 20, sortBy: 'date-desc', ...query } } });
    assert.equal(response.response.status, 200); return diarySummaryListResponseSchema.parse(response.data);
  };
  const first = await summary(a.api), second = await summary(a.api, { page: 2 });
  assert.equal(first.pagination.total, 33); assert.equal(first.data.length, 20); assert.equal(second.data.length, 13);
  assert.equal(new Set([...first.data, ...second.data].map(row => row.id)).size, 33);
  assert(first.data.every(row => !('content' in row)));
  const search = await summary(a.api, { search: 'Orchid', symbol: 'ORC', dateFrom: '2024-02-01', dateTo: '2024-02-29', sortBy: 'date-asc', reviewStatus: 'pending' });
  assert.equal(search.pagination.total, 12); assert.equal(search.data[0].date, '2024-02-02');
  assert(search.data.every(row => row.title.includes('Orchid') && row.stockSymbols.includes('ORC')));
  assert.equal((await summary(a.api, { reviewStatus: 'reviewed' })).pagination.total, 2);
  assert.equal((await summary(a.api, { search: 'does-not-exist' })).pagination.total, 0);
  const activity = async api => {
    const response = await api.GET('/api/diaries/activity', { params: { query: { dateFrom: '2024-02-01', dateTo: '2024-02-29' } } });
    assert.equal(response.response.status, 200); return diaryActivityResponseSchema.parse(response.data);
  };
  const month = await activity(a.api); assert.equal(month.data.length, 25); assert.equal(month.dateTo, '2024-02-29');
  assert(month.data.every(day => typeof day.diaryId === 'string' && day.date.startsWith('2024-02')));
  const reviews = async (api, page) => {
    const response = await api.GET('/api/reviews', { params: { query: { target: 'diary', page, limit: 20 } } });
    assert.equal(response.response.status, 200); return reviewGroupsResponseSchema.parse(response.data);
  };
  const queue = await reviews(a.api, 1), later = await reviews(a.api, 2);
  assert.deepEqual(queue.counts, { overdue: 25, today: 2, upcoming: 2, unscheduled: 2, completed: 2 });
  assert.equal(queue.overdue.length, 20); assert.equal(later.overdue.length, 5); assert.equal(later.today.length, 0);
  assert.deepEqual(later.counts, queue.counts);
  assert(buckets.every(bucket => queue[bucket].every(row => row.targetType === 'diary')));
  assert.equal((await summary(b.api)).pagination.total, 0); assert.equal((await activity(b.api)).data.length, 0);
  assert(buckets.every(bucket => queue.counts[bucket] > 0));
  assert.deepEqual((await reviews(b.api, 1)).counts, Object.fromEntries(buckets.map(bucket => [bucket, 0])));
  assert.equal((await b.api.GET('/api/diaries/{id}', { params: { path: { id: fixtures[0].id } } })).response.status, 404);
  passed = true;
  if (keep) {
    await mkdir('.expo', { recursive: true });
    await writeFile('.expo/p1c-fixtures.json', JSON.stringify({ a: a.credentials, b: b.credentials, ownerA: a.owner, ownerB: b.owner }));
  }
  console.log('P1C API PASS: 33 fixtures, three months, search/symbol/range/status/sort, two summary pages, leap-month activity, five review buckets, shared per-bucket page slices, A/B isolation.');
} finally {
  if (!keep || !passed) for (const diary of fixtures) assert.equal((await accounts[0].api.DELETE('/api/diaries/{id}', { params: { path: { id: diary.id } } })).response.ok, true);
  for (const account of accounts) await account.native.logout();
  await db.end();
}

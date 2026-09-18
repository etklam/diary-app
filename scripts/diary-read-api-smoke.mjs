import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createApiClient, createNativeSession } from '@diary/api-client';
import { apiErrorResponseSchema, diaryResponseSchema } from '@diary/contracts';
import { diarySummaryListResponseSchema } from '@diary/contracts/diary-summary';

const baseUrl = process.env.DIARY_API_BASE_URL;
if (!baseUrl || process.env.DIARY_DISPOSABLE_TEST_ENV !== '1'
  || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(baseUrl).hostname)) {
  throw new Error('Set DIARY_API_BASE_URL to the local disposable API and DIARY_DISPOSABLE_TEST_ENV=1.');
}
const keep = process.argv.includes('--keep-fixtures');
const run = randomUUID().slice(0, 8);
const accounts = [];
const fixtures = [];
let passed = false;
async function account(label) {
  const credentials = { email: `p1a-${label}-${run}@example.test`, password: 'SyntheticP1a2026' };
  const registered = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(credentials),
  });
  assert.equal(registered.status, 200, 'Synthetic registration');
  let stored = null;
  const native = createNativeSession({ baseUrl, storage: { get: () => stored, set: value => { stored = value; }, clear: () => { stored = null; } } });
  await native.login(credentials);
  const result = { credentials, native, api: createApiClient({ baseUrl, fetch: native.fetch }) };
  accounts.push(result);
  return result;
}
try {
  const a = await account('a');
  const b = await account('b');
  const empty = await b.api.GET('/api/diaries/summary', { params: { query: { page: 1, limit: 20, sortBy: 'date-desc' } } });
  assert.deepEqual(diarySummaryListResponseSchema.parse(empty.data).data, []);
  for (let day = 1; day <= 25; day++) {
    const body = { title: `Synthetic A journal ${String(day).padStart(2, '0')}`, date: `2026-01-${String(day).padStart(2, '0')}`,
      content: `# Synthetic read acceptance\n\nJournal ${day}: a calm review of the trading day.\nSecond line remains readable.\n\n${'Synthetic body text. '.repeat(40)}\nBODY_END_ONLY`,
      tags: ['acceptance', 'synthetic'], stockSymbols: ['SYN'] };
    const created = await a.api.POST('/api/diaries', { body });
    assert.equal(created.response.ok, true, 'Create disposable fixture');
    const diary = diaryResponseSchema.parse(created.data);
    assert.equal(typeof diary.id, 'string'); assert.equal(diary.date, body.date);
    fixtures.push(diary);
  }
  const summary = async page => {
    const response = await a.api.GET('/api/diaries/summary', { params: { query: { page, limit: 20, sortBy: 'date-desc' } } });
    assert.equal(response.response.status, 200);
    return diarySummaryListResponseSchema.parse(response.data);
  };
  const first = await summary(1); const second = await summary(2);
  assert.equal(first.data.length, 20); assert.equal(second.data.length, 5);
  assert.equal(first.pagination.totalPages, 2);
  const ids = [...first.data, ...second.data].map(row => row.id);
  assert.deepEqual(ids, fixtures.toReversed().map(row => row.id));
  assert.equal(new Set(ids).size, 25);
  assert.deepEqual((await summary(1)).data.map(row => row.id), first.data.map(row => row.id));
  assert.equal((await summary(3)).data.length, 0);
  for (const row of first.data) {
    assert.equal(typeof row.id, 'string');
    assert.equal('content' in row, false);
    assert.equal('transactions' in row, false);
    assert.equal(row.excerpt.includes('BODY_END_ONLY'), false);
  }
  const expected = fixtures.at(-1);
  const response = await a.api.GET('/api/diaries/{id}', { params: { path: { id: expected.id } } });
  assert.equal(response.response.status, 200);
  const actual = diaryResponseSchema.parse(response.data);
  assert.equal(actual.id, expected.id); assert.equal(typeof actual.id, 'string');
  assert.equal(actual.date, '2026-01-25'); assert.equal(actual.content, expected.content);
  const forbidden = await b.api.GET('/api/diaries/{id}', { params: { path: { id: expected.id } } });
  assert.equal(forbidden.response.status, 404);
  assert.equal(apiErrorResponseSchema.parse(forbidden.error).data.code, 'DIARY_NOT_FOUND');
  passed = true;
  if (keep) {
    await mkdir('.expo', { recursive: true });
    await writeFile('.expo/p1a-fixtures.json', JSON.stringify({ a: a.credentials, b: b.credentials, diaryId: expected.id }));
  }
  console.log(JSON.stringify({ fixtures: 25, summaryBounded: true, detailRead: true, idString: true,
    civilDateUnchanged: true, accountIsolation: true, deterministicPagination: true, emptyAccount: true, retainedForVm: keep }));
} finally {
  if (!keep || !passed) {
    for (const diary of fixtures) {
      const response = await accounts[0].api.DELETE('/api/diaries/{id}', { params: { path: { id: diary.id } } });
      assert.equal(response.response.ok, true, 'Fixture cleanup');
    }
  }
  for (const account of accounts) await account.native.logout();
  // Synthetic accounts are removed when the disposable database is disposed.
}

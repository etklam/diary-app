# F5 ETF research and Watchlist acceptance

## Implementation

The public `/tools/etf-research` route now reads the shared ETF profile contract and presents quote, risk, valuation, relative-return and provenance fields with null values preserved. The separate private `/etf-watchlist` route uses the source create/list/remove contract, an account-owner scope guard and uncertain-write reconciliation. ETF items remain separate from stock holdings. The profile and watchlist screens include English, Traditional Chinese and Simplified Chinese labels, accessible metric names and bounded research parameters.

## Verification

- Source harness: in `diary-v3`, `npm exec tsx scripts/e2e-server.ts` provisioned a fresh disposable PostgreSQL database and listened on `127.0.0.1:3201`. It supplied the synthetic admin, ETF catalog seed and deterministic market provider. The scratch database was removed after the run.
- API acceptance: `$env:DIARY_DISPOSABLE_TEST_ENV='1'; $env:DIARY_API_BASE_URL='http://127.0.0.1:3201'; npm exec vitest run tests/api/etf-api.test.ts` — 1/1 passed. It exercised public guest research with partial metrics, source timestamps, a fully unavailable symbol response, authenticated add/list/remove, duplicate and unknown-catalog failures, owner A/B isolation and unchanged stock holdings.
- Model/service acceptance: `npx vitest run tests/unit/etf.test.ts` — 5/5 passed for contract/null preservation, stale-request fencing, retry suppression, uncertain-write refresh and owner-epoch fencing.
- `npm run verify` — latest full run passed: lint, TypeScript, 236 tests passed and 11 database-gated API tests skipped, then Android export succeeded. The ETF API test is skipped in this environment-free command and was run separately against the source harness above.
- Latest Android bundle: Expo `57.0.25`, `dist/android/_expo/static/js/android/entry-a4287ac39f0a23d5594caa3f724f8b83.hbc` (4,686,110 bytes; SHA-256 `6D0F800D889C3FA623FC155974EC88D515A1E221242A6DA854137FF0A38EF9F0`). Client workspace HEAD at verification: `471b633`; source workspace HEAD: `ce2962f`.

## Native acceptance still open

The Android 16 AVD remains available, but the installed development client currently shows Expo Dev Launcher waiting for Metro. A native route interaction, long-data layout inspection and TalkBack walkthrough could not be performed in this session. The exported bundle proves compilation only; it is not recorded as screen-level acceptance. The ticket stays in progress until the ETF research and Watchlist journeys are exercised in the installed app.

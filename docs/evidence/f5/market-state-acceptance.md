# F5 public Market State acceptance

The existing public `/tools/market-rotation` route now reads the persisted Market State snapshot and history contracts. It displays the regime, configured universe, snapshot and latest-price dates separately, coverage, score, four-percent advances/declines, 10-day ratio and 40-day breadth. Null and stale inputs remain visible as unavailable, partial or unknown/warmup states; unknown state never displays the source's nominal exposure suggestion. Snapshot and history have separate retry state, and a failed refresh keeps previously loaded data visible. This screen consumes persisted API rows only; it does not call a market provider or schedule a job.

## Verification

- `npx vitest run tests/unit/market-state.test.ts` — 5/5 passed for contract null/warmup preservation, missing snapshot recovery, independent reads, history retention after refresh error, latest-request fencing and disposal.
- `$env:DIARY_DISPOSABLE_TEST_ENV='1'; $env:DIARY_API_BASE_URL='http://127.0.0.1:3101'; npm exec vitest run tests/api/market-state-api.test.ts` — 1/1 passed against the local disposable API without an account. Snapshot no-store behavior, missing-snapshot response and newest-first history passed.
- In `diary-v3`, `npm exec vitest run tests/integration/market-state-http.test.ts` — 2/2 passed against fresh disposable PostgreSQL, including absent snapshot, stale/under-covered rows resolving to unknown, rerun upsert and history ordering.
- `npm run verify` — latest full run passed lint, typecheck, 236 tests passed and 11 database-gated API tests skipped; Android export succeeded.
- Latest Expo 57 Android JS bundle: `dist/android/_expo/static/js/android/entry-a4287ac39f0a23d5594caa3f724f8b83.hbc`, 4,686,110 bytes, SHA-256 `6D0F800D889C3FA623FC155974EC88D515A1E221242A6DA854137FF0A38EF9F0`. App workspace HEAD: `471b633`; source workspace HEAD: `ce2962f`.

## Scope and remaining native evidence

Market State's shared snapshot contract contains aggregate `SP500_NDX` breadth; it has no per-sector breakdown. The mobile view therefore does not invent sector values. Scope and sector comparisons belong to the dependent Market Rotation ticket #34. The history contract reports `unknown` but omits historical stale and coverage fields, so the app preserves that classification without guessing why a past row is unknown. Market State is public, so per-user owner isolation does not apply.

The Android AVD currently opens Expo Dev Launcher waiting for Metro, so the route, wide history layout and TalkBack labels have not been exercised on the installed app. The exported bundle is compilation evidence only. Native rendering and accessibility acceptance remains open.

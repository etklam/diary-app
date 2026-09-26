# F3 Company Hub acceptance

## Result

The native Company route now reads public quote/history data separately from the verified owner's private projection. Public responses retain server source and fetch-time headers. The UI preserves nullable quote fields, reports stale and unavailable states, uses the same displayed quote when calculating a holding's market value, and samples full history to a bounded native chart plus accessible date/value entries.

## Verification

- `npm run verify` — passed: lint, TypeScript, 222 tests; 9 disposable API tests skipped in the environment-free suite; Android Hermes export completed at `dist/android/_expo/static/js/android/entry-69d8611f5946f47eb94e141cd73b183d.hbc` (4.6 MB).
- `npx vitest run tests/unit/company-hub.test.ts` — 5 tests passed: nullable quote data/provenance, stale symbol response, range response ordering, independent history failure, guest privacy, and 12,000-row chart/accessibility sampling.
- `$env:DIARY_DISPOSABLE_TEST_ENV = '1'; $env:DIARY_API_BASE_URL = 'http://127.0.0.1:3101'; npx vitest run tests/api/company-hub-api.test.ts` — passed against the disposable PostgreSQL-backed API. The guest read returned synthetic `SYN` quote/history with source metadata; the authenticated Hub rejected guest access; two owners saw only their own same-symbol Diary.
- `adb devices -l` — `emulator-5554` is online (Android 16, x86_64). PostgreSQL remains available on `127.0.0.1:55433`; the API integration test reached `127.0.0.1:3101`.

## Native screen check still open

The updated JS was bundled but was not opened on the emulator. Interactive Expo dev-server startup was rejected by the session tool policy, so chart appearance, TalkBack traversal, and in-app guest/signed-in navigation have not been claimed as accepted. This is the remaining check for criterion 4 and keeps ticket #20 in progress.

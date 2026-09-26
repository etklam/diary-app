# F6 Discipline import, export and sharing acceptance

Date: 2026-09-26 (Asia/Taipei)

## Build and source

- App commit: `471b63381bc3b612e6bdb0ae4d127554ded30f0b` (working tree contains the implementation under review).
- Source API/contracts commit: `ce2962f597ef56dc4e4cb8966c1ca1860369e006`.
- Android static bundle: `dist/android/_expo/static/js/android/entry-eca46d8e19b8bf2460a9087d26cb3057.hbc`.
- Bundle size: 4,742,349 bytes.
- SHA-256: `C90070CE9DE693D47CBAC98204D86367C274E286ADC0F9D326B76325549115D6`.
- Read the SDK 57 versioned module documentation before implementation: [DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/), [FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), and [Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/).

## Implemented behavior

- JSON can be pasted or selected with the native document picker. Preview parsing runs before a write, counts accepted/skipped rows, preserves valid duplicate rows in source order, and rejects invalid/oversized content.
- Export selection is per principle. The API export query defaults attribution off; the resulting native JSON and app preview link contain only selected rows. The profile name is included only after the user opts in. JSON can be copied or shared as a temporary cache file; the cache file is removed after the OS share flow.
- Imports append by default. Replacement requires an explicit toggle and destructive confirmation. Public share previews do not write automatically; signed-out users pass through login with the validated share payload retained in the return route.
- Writes use the no-automatic-session-retry header. An uncertain response triggers a read and exact owner-list reconciliation; the app does not repeat the import POST. If state remains uncertain, the preview stays visible and the screen only offers a status check.
- App share continuation accepts only a bounded `import` payload validated by the shared decoder. Extra query flags and malformed links are rejected.
- This build has no canonical public web origin recorded in #05. The app currently shares its validated native preview deep link and JSON file; public web-link generation is pending the release-origin decision.

## Commands and results

- `npx vitest run tests/unit/discipline-transfer.test.ts tests/unit/discipline.test.ts tests/unit/continuation.test.ts` — 11 passed. Covers preview/skipped rows, duplicate preservation, append/replacement reconciliation, malformed links and native-login continuation validation.
- `$env:DIARY_DISPOSABLE_TEST_ENV='1'; $env:DIARY_API_BASE_URL='http://127.0.0.1:3101'; npx vitest run tests/api/discipline-transfer-api.test.ts` — 1 passed against the disposable PostgreSQL-backed API. Verified export with attribution off, append ordering, atomic replacement, and target-owner isolation.
- `npm run verify` — lint and typecheck passed; 239 tests passed, 12 API tests skipped by the default environment gate; Android export passed.
- `npm run dependencies:check` — Expo dependencies up to date.

## Still open

- Native runtime acceptance was not performed. The available AVD development client remains on its Metro-waiting screen; the static bundle is compilation evidence only. There is no physical Android device available for file picker, clipboard denial, OS share dialog, screen-reader or lifecycle checks.
- No canonical public web origin has been supplied in release inputs. Until it is available, the implementation can share/open the native deep link only when the app is installed.
- No actual native test exercised permission denial or a lost/late import response; those UI transitions are covered by code paths, pure reconciliation tests and the API round trip, not claimed as device acceptance.

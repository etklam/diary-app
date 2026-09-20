# diary-app

`diary-app` is a standalone Expo SDK 57 Android client for the existing diary-v3 API. Trade Basic includes native authentication, searchable Timeline, monthly Calendar, read-only diary Review Queue and Detail, and Quick Diary with encrypted durable drafts and explicit create/append saves.

Timeline searches bounded server summaries with symbol, date range, review status and date sorting. Calendar reads month activity independently of Timeline and can initialize a new Quick Diary for an empty day; existing drafts are offered for resumption without changing their date. Review uses server groups/counts and a shared page cursor, with no review mutations. Discovery data stays in memory and native Back preserves each screen's context.

Unknown write outcomes remain locked for read-only checking, including gateway errors and an unchanged reconciliation read. Only documented application rejections that guarantee no mutation unlock editing. Discard on explicit logout abandons the local attempt; it does not prove the server did not save it. There is no automatic replay or global exactly-once guarantee.

## Prerequisites

- Node.js 22.13 or newer; the recorded P0 build uses Node 24
- npm and a clean `npm ci`
- Android SDK, `adb`, a running Android VM, and JDK 17 (the recorded build uses Microsoft OpenJDK 17.0.20.1)
- A local, disposable, or explicitly authorized diary-v3 test API

Copy `.env.example` to `.env.local` and set the non-secret API origin. Android Studio AVDs reach a host service through `10.0.2.2`; the example expects a host service on port 3101. Keep test credentials outside Expo public environment variables.

```powershell
npm ci
npm run dependencies:check
npm run doctor
npm run android:build
```

`android:build` runs `expo run:android`, which generates the ignored native project, builds and installs the development client, starts Metro, and launches the app. P1B requires a new native binary for SQLCipher and single-attempt HTTP writes. If an older generated `android/` directory exists, regenerate it first with `$env:APP_VARIANT='development'; npx expo prebuild --platform android --no-install`. For an installed P1B binary, start Metro with `npm run start:dev-client`. Expo Go is not an acceptance target.

Run local checks with `npm run verify`.

The test-only API smoke command accepts credentials through process environment variables and never prints tokens or passwords:

```powershell
$env:DIARY_API_BASE_URL = 'http://127.0.0.1:3201'
$env:DIARY_TEST_EMAIL = '<synthetic account>'
$env:DIARY_TEST_PASSWORD = '<synthetic password>'
npm run test:api
```

See [Android development](docs/android-development.md), [shared packages](docs/shared-packages.md), [P0 acceptance](docs/acceptance.md), [P1A acceptance](docs/evidence/p1a/acceptance.md), and [P1B acceptance](docs/evidence/p1b/acceptance.md) for reproducible details.

P1C-1 implementation and fresh verification are recorded in [P1C-1 acceptance](docs/evidence/p1c-1/acceptance.md). P1C-2 review authoring/mutations and full diary editing remain planned. Historical P1B evidence is not the current write-safety contract.

The opt-in `npm run test:api:discovery` requires `DIARY_DISPOSABLE_TEST_ENV=1`, a local `DIARY_API_BASE_URL`, and `DIARY_TEST_DATABASE_URL` naming the uniquely provisioned `diary_v3_e2e_<uuid>` database from diary-v3's existing test harness. `DIARY_V3_DIR` optionally locates that checkout's fixture toolchain (default `../diary-v3`). It creates synthetic A/B accounts and 33 diaries, uses bound disposable SQL fixtures for review buckets, and cleans its diaries. Accounts are removed when the disposable database is disposed. Never use production or a persistent development database. See the evidence record for the fault-proxy regression gate and optional retained VM fixtures.

# diary-app

`diary-app` is a standalone Expo SDK 57 Android client for the existing diary-v3 API. Trade Basic includes native authentication, searchable Timeline, monthly Calendar, diary Review Queue and Detail, native Review authoring with encrypted local drafts, and Quick Diary with encrypted durable drafts and explicit create/append saves.

Timeline searches bounded server summaries with symbol, date range, review status and date sorting. Calendar reads month activity independently of Timeline and can initialize a new Quick Diary for an empty day; existing drafts are offered for resumption without changing their date. Review uses server groups/counts and a shared page cursor, with explicit completion/update available from Diary Detail. Discovery data stays in memory and native Back preserves each screen's context.

Unknown write outcomes remain locked for read-only checking, including gateway errors and an unchanged reconciliation read. Only documented application rejections that guarantee no mutation unlock editing. Discard on explicit logout abandons the local attempt; it does not prove the server did not save it. There is no automatic replay or global exactly-once guarantee.

## Prerequisites

The first closed Android beta now freezes the implemented product scope. **Beta-R1** adds clean-checkout SDK type initialization, separate standalone preview build paths, release validation, first-use guidance and privacy-safe Help/reporting. It is implemented but **not a verified standalone APK**: approved hosted API/support/data-policy and authorized release signing/EAS configuration are still missing. See the [release runbook](docs/beta/release-runbook.md), [繁體中文測試指南](docs/beta/tester-guide.md), and [fresh Beta-R1 evidence](docs/evidence/beta-r1/acceptance.md).

`npm run android:preview:eas` and `npm run android:preview:local` are separate from the development wrapper. Both require approved preview configuration; the local path additionally requires authorized signing material and a fresh committed checkout without `android/`. The preview identity is `com.etklam.diaryapp.preview` / **Trade Basic Beta**, with explicit monotonically increasing versionCode. Do not reuse a debug APK, uninstall to resolve a signing conflict, or expect developer-app drafts to migrate. `expo-application` adds native installed version/build reporting and requires a rebuilt binary. Existing SDK/network/shared-package versions and draft/session namespaces are unchanged.

**Beta-R2** was attempted as a continuous build-and-acceptance task and remains **BLOCKED**: fresh clean host checks and five disposable API smokes pass, but approved release configuration/signing, a signed APK, physical-device coverage and verified delivery are still unavailable. See [Beta-R2 evidence and exact prerequisites](docs/evidence/beta-r2/acceptance.md). P1C-2B and additional product modules remain deferred until beta feedback. No invitation or public release is authorized by this work.

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

P1C-1 implementation and fresh verification are recorded in [P1C-1 acceptance](docs/evidence/p1c-1/acceptance.md). P1C-2A review authoring, encrypted per-diary drafts and explicit completion/update are implemented; see [P1C-2A acceptance](docs/evidence/p1c-2a/acceptance.md). P1C-2B rescheduling/return-to-queue and full diary editing remain planned. Historical P1B evidence is not the current write-safety contract.

The opt-in `npm run test:api:discovery` requires `DIARY_DISPOSABLE_TEST_ENV=1`, a local `DIARY_API_BASE_URL`, and `DIARY_TEST_DATABASE_URL` naming the uniquely provisioned `diary_v3_e2e_<uuid>` database from diary-v3's existing test harness. `DIARY_V3_DIR` optionally locates that checkout's fixture toolchain (default `../diary-v3`). It creates synthetic A/B accounts and 33 diaries, uses bound disposable SQL fixtures for review buckets, and cleans its diaries. Accounts are removed when the disposable database is disposed. Never use production or a persistent development database. See the evidence record for the fault-proxy regression gate and optional retained VM fixtures.

Review editing autosaves **only on this device**, in an additive table in the existing SQLCipher database. Opening and leaving without edits creates no draft. Complete review / Save review changes sends every reflection through the dedicated review PATCH and updates the server's `reviewedAt`. Before submission, changed server review fields require an explicit baseline decision. This check is best-effort: the backend has no atomic expected-version condition. An unknown PATCH outcome remains locked across restarts; Check server state never authorizes another PATCH, even when text matches. Explicit local discard does not cancel a server request.

`npm run test:api:reviews` is opt-in with `DIARY_DISPOSABLE_TEST_ENV=1` and a local `DIARY_API_BASE_URL` backed by diary-v3's disposable test database. Set `DIARY_FAULT_PROXY=1`, run `scripts/test-write-proxy.mjs`, and use API port 3101 (upstream 3201, control 3102) to exercise PATCH response replacement/loss and delayed commits. It registers synthetic A/B owners, verifies pending → completed and update semantics, and cleans its diary; account cleanup occurs when the disposable database is removed. `DIARY_KEEP_FIXTURES=1` retains synthetic fixtures and writes credentials only into ignored `.expo/p1c2a-fixtures.json` for local VM acceptance. Never use production data.

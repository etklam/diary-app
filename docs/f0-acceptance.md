# Repeatable F0 acceptance

Use disposable synthetic data only. Host and bundle success cannot substitute for Android runtime evidence. [Current results](evidence/f0/acceptance.md) are separate from these instructions.

## Prerequisites

Node 24, Python 3, the existing Android SDK 36 development APK with SQLCipher, a booted AVD, and the diary-v3 checkout/dependencies. Start its local PostgreSQL container without resetting any volume. The source fixture creates and migrates a uniquely named database; never point test scripts at a persistent product database.

```powershell
npm ci
npm run verify
npm run shared:check
npm run parity:check
npm --prefix tests/compatibility ci --ignore-scripts
```

`parity:check` deliberately fails when the selected sibling source changes. Review the diff and explicitly regenerate the baseline; do not weaken the check. Standalone CI runs `shared:check` without a sibling checkout.

## Synthetic API

In a dedicated terminal:

```powershell
$env:DIARY_DISPOSABLE_TEST_ENV='1'
npm run test:api:server
```

The wrapper reuses `diary-v3/scripts/e2e-server.ts`, including synthetic ADMIN users, quotes/history, holidays, SEC documents and provider failures. It writes its unique database name to ignored `.scratch/f0-runtime/server.json`. It exposes no product test endpoint. Ports 3201 and 55433 must be available. If another fixture server is running, stop that owned process normally; never guess which database to delete.

In the test terminal:

```powershell
$fixture = Get-Content .scratch/f0-runtime/server.json -Raw | ConvertFrom-Json
$env:DIARY_DISPOSABLE_TEST_ENV='1'
$env:DIARY_API_BASE_URL=$fixture.baseUrl
$env:DIARY_TEST_DATABASE_URL='postgresql://diary:diary_local@127.0.0.1:55433/' + $fixture.databaseName
npm run test:api:compatibility
npm run test:api:reads
npm run test:api:quick
npm run test:api:reviews
npm run test:api:discovery
node scripts/f0-performance.mjs
```

The PostgreSQL credentials above are the source local fixture defaults. If your disposable server differs, supply its local credentials through the environment. Compatibility includes current/previous clients, ADMIN/USER, Partner acceptance/directional sharing and public synthetic quotes. Existing Quick/Review tests prove owner isolation and lost-response behavior. Fault-proxy extensions remain available through `scripts/test-write-proxy.mjs` and the existing API test flags.

After every native/API check, type `stop` in the server terminal. This invokes the source cleanup handler and drops only its newly created database. Verify that the recorded name is absent from `pg_database`. Force-killing the process cannot prove cleanup. Keep the existing PostgreSQL container and unrelated databases intact.

## Native tracer

Start Metro against the disposable API:

```powershell
$env:EXPO_PUBLIC_API_BASE_URL='http://10.0.2.2:3201'
npm run start:dev-client -- --port 8081
```

Build the development APK with `npm run android:build` when native dependencies/plugins change; a Metro refresh is insufficient for those changes. F0 rebuilt the development APK and installed it over the existing app, preserving encrypted drafts. The tracer records its installed APK hash separately.

Use a signed-out development app. The tracer deliberately stops if another account is active; do not clear app storage to bypass that guard. Log out only through the ordinary app flow after preserving any draft.

```powershell
$env:DIARY_DISPOSABLE_TEST_ENV='1'
$env:ANDROID_SERIAL='emulator-5554'
npm run test:native:tracer
python scripts/f0-shell-visuals.py
node scripts/snapshot-app-source.mjs
```

The tracer registers a synthetic USER, logs in with native controls, writes a draft, force-stops/reopens the app through the ordinary Android launcher, verifies session/draft restoration, reads only encrypted database bytes to check the header and absence of its synthetic marker, explicitly saves, opens Detail and returns to Timeline, then verifies a shared draft across Research/More and an explicit append returning to More. It never reads encryption keys, copies databases into evidence, uninstalls or clears application data. On failure, the draft remains available for investigation. Save or explicitly discard only that synthetic draft before repeating from sign-in.

Screenshots and redacted result metadata go to `docs/evidence/f0/native/`. Do not run screenshot capture on real content. The visual script restores font scale, density, theme and application locale in `finally`. It checks 360 dp/2x text plus zh-TW/zh-CN shell copy. Account preference integration and full existing-screen localization remain F1 work.

The Expo development tools bubble can overlap header Quick. The tracer taps its left edge and retries navigation only; it never retries Save. Release binaries must be checked separately without this development overlay.

## Manual assistive/role checks

- Enable the installed Android TalkBack service, dismiss its first-use permission overlay, reopen the synthetic app and inspect focus/activate Overview and Diary shortcuts. Record the bound service and screenshots. Restore the prior accessibility setting afterwards. Spoken pronunciation and full authoring accessibility need module/device review; do not infer them from XML labels.
- USER More must not show administration. Sign in as the fixture `etf-admin@example.test` using the source harness password; More shows the informational administration destination. No future administrative action is enabled. Log out afterwards.
- Enter Quick from Research/More and press Back without submitting: return to the originating tab and reopen the same saved draft. Switching accounts must not reveal it.

## Performance interpretation

`f0-performance.mjs` measures pure shared-domain chart-series/FIRE/title computation on the host. Compatibility reports warm API summary latency. The native tracer reports its ADB edit/persist duration, including automation overhead. These are distinct baseline probes, not native chart frame-rate claims. Actual chart rendering, long-document editing and physical-device p95 budgets are recorded when those native components exist. [Design budgets](native-design.md) are regression targets, not fabricated measurements.

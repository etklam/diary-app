# Repeatable F1 acceptance

Use synthetic accounts and a uniquely provisioned local database. Follow the [F0 prerequisites](f0-acceptance.md). Do not clear app storage or uninstall to reset a scenario. Preserve unrelated source edits and running services.

## Build and host checks

Read the exact Expo SDK 57 documentation before changing native configuration. F1 changes the single-attempt transport plugin, so a Metro refresh alone is insufficient.

```powershell
npm run verify
npm run shared:check
npm run parity:check
npm run dependencies:check
$env:APP_VARIANT='development'
$env:EXPO_PUBLIC_APP_ENV='development'
$env:EXPO_PUBLIC_API_BASE_URL='http://10.0.2.2:3201'
npx expo prebuild --platform android --no-install
npm run android:build
```

On the recorded Windows host, use Microsoft JDK 17 and set `ANDROID_HOME` to the installed SDK. The equivalent emulator-only build was `android/gradlew.bat app:assembleDebug -PreactNativeArchitectures=x86_64 --console=plain`, followed by `adb -s emulator-5554 install -r android/app/build/outputs/apk/debug/app-debug.apk`. Install over the existing development identity; a signing conflict is a reason to stop, not uninstall. Native generated files are ignored; the config plugin is authoritative.

## Disposable API and native flows

Start the API in its own terminal:

```powershell
$env:DIARY_DISPOSABLE_TEST_ENV='1'
$env:DIARY_F1_TRANSPORT_PROBE='1'
npm run test:api:server
```

The F1 probe adds a local-only control listener on port 3211. It counts logout-all requests and can discard the real handler's response after commit. It records no credentials, headers or bodies. Normal app/API behavior remains authoritative; the probe is never enabled in production. The Markdown tracer temporarily owns a synthetic PNG server on port 3210.

```powershell
$env:DIARY_DISPOSABLE_TEST_ENV='1'
$env:DIARY_API_BASE_URL='http://127.0.0.1:3201'
npm test -- tests/api/account-api.test.ts tests/api/quick-api.test.ts tests/api/reviews-api.test.ts
```

In another terminal, start Metro with the development API origin above and `npm run start:dev-client -- --port 8081`. Use a signed-out development app and the emulator named by `ANDROID_SERIAL` (default `emulator-5554`). The active app must contain synthetic data only before screenshots are captured.

```powershell
$env:DIARY_DISPOSABLE_TEST_ENV='1'
$env:PYTHONUTF8='1'
python scripts/f1-native-tracer.py
python scripts/f1-reader-tracer.py
python scripts/f1-boundary-tracer.py
node scripts/snapshot-app-source.mjs f1
```

The first tracer registers a fresh account, follows a guest continuation, writes an encrypted draft, edits exact settings, restarts with Traditional Chinese/dark/Calendar preferences, rejects an incorrect password, changes the password and restores the same owner's draft. The reader tracer explicitly saves that synthetic draft, reads untrusted long GFM, checks valid/missing images, horizontal tables, both themes, 360 dp/2x font, Simplified Chinese and successful logout-all with a peer-token check. It restores font scale/density and stops its image server in `finally`.

The boundary tracer creates a fresh owner, checks a cold protected date link, a real Markdown link to Guide, remote revocation, A → B → A draft/settings isolation and normal current-client logout. The development launcher may require selection of the existing Metro project; the pending cold intent must survive that selection. Tap an inline link's glyphs, since Android exposes the surrounding paragraph's full bounds. Its final security request really commits; the probe discards the response. Native UI must report uncertainty, and probe deltas must be exactly one request, one successful response discarded, and one drop. A peer token must be rejected. The last synthetic unsent draft remains encrypted for its owner; no app storage is cleared.

Each tracer marks its result RUNNING, then PASS or FAIL. A failed run must not inherit an earlier PASS. Do not automatically retry a failed mutation to make a harness pass; inspect its current state first. Synthetic credentials stay in ignored `.scratch/f0-runtime/`; evidence contains screenshots and redacted outcomes only.

For the server's real realtime revocation integration, run in the sibling source checkout:

```powershell
npm test -- tests/integration/socket-auth-session.test.ts -t 'disconnects real JWT sockets'
```

That test provisions and disposes its own database and verifies both password change and logout-all disconnect existing authenticated sockets and reject old-token reconnect. It is server evidence, not a claim that the app's future realtime feature is complete.

## Cleanup and interpretation

Type `stop` in the owned API terminal and confirm the exact database recorded in `.scratch/f0-runtime/server.json` is absent from `pg_database`. Stop Metro and any remaining owned helper. Leave existing Docker services, unrelated databases, device storage and source changes intact.

Record the installed APK hash, final source snapshot, host bundle hash and fresh results separately. Development emulator acceptance does not establish signed standalone, physical-device, iOS or public-launch acceptance. See [F1 results](evidence/f1/acceptance.md) for observed outcomes and remaining release boundaries.

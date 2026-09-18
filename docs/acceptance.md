# P0 acceptance record

Date: 2026-09-19 (Asia/Taipei)

- App baseline before work: `3cfd3079c32c45efbf5c91442ae1fe0fbbf228af`
- API/shared package baseline: `7e3a39ad5c4900f88d9d8193b7077610d48f9418`
- Selected device: `emulator-5554`, Android 16 / API 36, x86_64
- Device fingerprint: `google/sdk_gphone64_x86_64/emu64xa:16/BE2A.250530.026.F3/13894323:userdebug/dev-keys`
- Toolchain: Node 24.19, npm 11.17, Microsoft OpenJDK 17.0.20.1, Expo SDK 57, React Native 0.86
- API: diary-v3 e2e server at host `127.0.0.1:3201`, reached by the app through a local TCP fault proxy at `10.0.2.2:3101`; disposable PostgreSQL and synthetic accounts only
- Installed package: `com.etklam.diaryapp`
- APK: `android/app/build/outputs/apk/debug/app-debug.apk`, 92,234,723 bytes, SHA-256 `5900479353f5b864093238563cc5853da82db13d93692de9e3f99f969549c695`

Results are **PASS**, **FAIL**, or **NOT VERIFIED**. Unit, real API integration, and VM UI evidence remain separate. A PASS in one layer does not stand in for another layer.

## Automated and build results

| Case | Layer | Command | Exit/result | Evidence |
| --- | --- | --- | --- | --- |
| Lockfile-only standalone install | Host | `npm ci` | PASS, exit 0; 896 packages installed | `docs/evidence/p0/commands.md` |
| SDK dependency compatibility | Host | `npm run dependencies:check` | PASS, exit 0; dependencies up to date | `docs/evidence/p0/commands.md` |
| Expo project diagnostics | Host | `npm run doctor` | PASS, exit 0; 21/21 checks | `docs/evidence/p0/commands.md` |
| Lint, typecheck, tests, Android bundle | Host | `npm run verify` | PASS, exit 0 | `docs/evidence/p0/commands.md`; 5 test files, 23 tests; Android bundle exported |
| API origin, HTTPS policy, environment isolation | Unit | `npm run test:unit` | PASS | `tests/unit/api-config.test.ts` |
| SecureStore schema and failure behavior | Unit | `npm run test:unit` | PASS | `tests/unit/secure-session-storage.test.ts` |
| Concurrent 401, refresh uncertainty, late response, logout race, read failure | Unit | `npm run test:unit` | PASS | `tests/unit/native-session.test.ts`, `tests/unit/auth-lifecycle.test.ts` |
| Invalid credentials and native login/restore/`/me`/logout | Real API integration | `npm run test:api` | PASS, exit 0 | `docs/evidence/p0/commands.md`; no token values logged |
| Controlled access expiry and refresh race | Real API integration | diary-v3 `npm run native:api:test` | PASS, exit 0; 1 test | `docs/evidence/p0/commands.md`; controlled local API and PostgreSQL fixture |
| Shared artifact pack and consumer verification | Package integration | diary-v3 `npm run native:packages:pack`; `npm run native:packages:test -- --packages-dir dist/native-packages` | PASS, exit 0; 71 exports verified | `docs/evidence/p0/commands.md`, `vendor/shared-packages/manifest.json`, and package provenance |
| Native development build | Android native | `npm run android:build` with JDK 17 | PASS; Gradle build, install, Metro bundle, and launch completed | `docs/evidence/p0/commands.md` |
| Rebuild after cleared outputs | Android native | `gradlew app:assembleDebug` with JDK 17 | PASS, exit 0; 455 tasks | Final APK hash above |
| Final APK reinstall and launch | Android VM | `adb install -r`; `am force-stop`; launcher `monkey` event | PASS, exit 0; install reported `Success`, `MainActivity` resumed | `docs/evidence/p0/commands.md` |

The first native attempt under Android Studio's JDK 25 failed during React Native CMake configuration. Repeating with JDK 17 succeeded. A later diagnostic `gradlew clean app:assembleDebug` invocation returned exit 1 because New Architecture dependency clean tasks removed generated codegen JNI directories before the app CMake clean task read them. A subsequent `app:assembleDebug` from those cleared outputs succeeded. These failed commands are retained here rather than represented as successful clean builds.

## Android VM UI results

| Case | Action | Result | Evidence |
| --- | --- | --- | --- |
| Invalid credentials | Submit a deliberately wrong synthetic password | PASS; inline authentication error, no signed-in state | Runtime observation |
| Correct login and server identity | Login with synthetic account A; app calls `GET /api/auth/me` | PASS; protected screen showed the API-verified owner | `docs/evidence/p0/verified-account.png` |
| Force-stop and restore | `am force-stop`, launcher relaunch | PASS; same owner restored from SecureStore then verified by `/me` | `docs/evidence/p0/force-stop-restored.png` |
| Background and foreground | Home, then resume app | PASS; protected state revalidated | Runtime observation |
| Ordinary read outage and recovery | Stop TCP proxy, trigger AppState read, restart proxy, retry/revalidate | PASS; recoverable error shown, token pair retained, then signed-in view restored | `docs/evidence/p0/network-recoverable.png` |
| Online logout and relaunch | Logout with API reachable, force-stop, relaunch | PASS; signed-out screen remained | `docs/evidence/p0/relaunch-signed-out.png` |
| Offline logout and relaunch | Stop proxy, logout locally, force-stop, relaunch | PASS; signed-out screen remained; server revocation was not claimed | Runtime observation |
| Account A to account B | Logout A, login with synthetic B | PASS; only B's verified identity rendered; no A view returned | `docs/evidence/p0/account-b.png` |
| Keyboard and Android Back | Focus password field, press Android Back | PASS; keyboard dismissed and root activity remained foreground | Runtime observation |
| Safe area and 1.3 font scale | Set Android font scale to 1.3 and complete login | PASS; controls remained reachable; scale reset to 1.0 afterward | `docs/evidence/p0/font-scale-login.png` |

All screenshots contain only synthetic identities and no passwords, token values, real diary content, or private user data. The detailed runtime sequence is recorded in `docs/evidence/p0/runtime-results.md`.

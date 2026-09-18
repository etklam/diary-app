# P0 command evidence

Date: 2026-09-19 (Asia/Taipei)

This is a redacted result record. It intentionally excludes credentials, cookies, token values, and private API response bodies.

| Working tree | Command | Exit/result |
| --- | --- | --- |
| diary-app | `npm ci` | Exit 0; 896 packages installed from the lockfile |
| diary-app | `npm run dependencies:check` | Exit 0; dependencies up to date |
| diary-app | `npm run doctor` | Exit 0; 21/21 checks passed |
| diary-app | `npm run verify` | Exit 0; lint and typecheck passed, 5 test files / 23 tests passed, Android bundle exported |
| diary-app | `npm run test:api` | Exit 0; invalid login, real native login, `/api/auth/me`, storage restore, logout, and signed-out restoration passed against the local diary-v3 API |
| diary-v3 | `npm run native:packages:pack` | Exit 0; artifacts and provenance generated from commit `7e3a39ad5c4900f88d9d8193b7077610d48f9418` |
| diary-v3 | `npm run native:packages:test -- --packages-dir dist/native-packages` | Exit 0; 71 exports verified from packed artifacts |
| diary-v3 | `npm run native:api:test` | Exit 0; 1 controlled PostgreSQL API integration test passed, including expiry and refresh race behavior |
| diary-app | `npm run android:build`, Android Studio JDK 25 | Exit 1 during React Native native-module CMake configuration |
| diary-app | `npm run android:build`, Microsoft OpenJDK 17.0.20.1 | Exit 0; Gradle build, APK install, Metro bundle, and activity launch passed |
| diary-app/android | `gradlew clean app:assembleDebug`, JDK 17 | Exit 1 in aggregate New Architecture clean ordering after generated JNI directories were removed |
| diary-app/android | `gradlew app:assembleDebug`, JDK 17, from the cleared outputs | Exit 0; `BUILD SUCCESSFUL`, 455 actionable tasks |
| Android VM | `adb -s emulator-5554 install -r <debug-apk>` | Exit 0; `Success` |
| Android VM | `am force-stop` followed by a launcher `monkey` event | Exit 0; one launcher event injected |
| Android VM | `pm path com.etklam.diaryapp` | Package present under `/data/app/.../com.etklam.diaryapp.../base.apk` |
| Android VM | `dumpsys activity activities` | `com.etklam.diaryapp/.MainActivity` was `topResumedActivity` |

Final APK: 92,234,723 bytes; SHA-256 `5900479353f5b864093238563cc5853da82db13d93692de9e3f99f969549c695`.

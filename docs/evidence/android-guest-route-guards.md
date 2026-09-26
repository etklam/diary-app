# Android guest route-guard smoke

Date: 2026-09-26. Scope: signed-out route gating for recently added private screens; this is not account-owner or API authorization acceptance.

Environment: Android 16 / API 36 `DiaryApp_API_36` AVD, serial `emulator-5554`, package `com.etklam.diaryapp`. `npm run android:build` succeeded after setting `ANDROID_HOME` only for the build process. Installed debug APK SHA-256: `06f18bc515fd16d043e7c4c3d412ca95b8250c906e652d2f286c3cc6822541ee`.

With no signed-in account in the app, opened each app link and inspected the visible accessibility hierarchy with `adb shell uiautomator dump`:

| Link | Observed screen |
| --- | --- |
| `diaryapp://watchlist` | Sign-in screen |
| `diaryapp://discipline` | Sign-in screen |
| `diaryapp://partners` | Sign-in screen |
| `diaryapp://api-keys` | Sign-in screen |

All four snapshots exposed the sign-in title and public welcome copy, with no private screen content. This verifies the app-level signed-out gate on this emulator. It does not verify authenticated owner isolation, backend access control, database round trips, spoken TalkBack behavior, or a physical device. PostgreSQL at `127.0.0.1:55433` remained unavailable during this run.

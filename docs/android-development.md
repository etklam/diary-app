# Android development

## Recorded toolchain

The P0 run uses Expo SDK 57, React Native 0.86, Node 24.19, npm 11.17, Microsoft OpenJDK 17.0.20.1, Android API 36, and an x86_64 Android Studio emulator. SDK 57 requires Node 22.13 or newer and targets Android API 36. Run `adb devices -l` and record the chosen serial before acceptance.

Set `JAVA_HOME` to a JDK 17 installation before the Android build. The Android Studio bundled JDK 25 failed while React Native native modules configured CMake in this run; JDK 17 completed the same build. The generated native project is ignored and must not be replaced with a hand-maintained native tree for P0.

The Android application ID is `com.etklam.diaryapp`. This is a stable project choice, not a claim that the identifier is registered in a store. The existing `diaryapp` URL scheme is preserved.

## Install and start

Create `.env.local` from `.env.example`. For an Android Studio AVD and a host test transport on port 3101:

```dotenv
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_API_BASE_URL=http://10.0.2.2:3101
```

```powershell
npm ci
npm run dependencies:check
npm run doctor
adb devices -l
npm run android:build
```

`npm run android:build` is the clean-checkout path. A direct `gradlew clean` is not required. In the recorded New Architecture project, Gradle's aggregate clean task failed because dependency clean tasks removed generated codegen JNI directories before the app CMake clean task inspected them. Building `app:assembleDebug` from the resulting cleared outputs succeeded, followed by a successful `adb install -r`.

The build script sets the native development variant, enabling cleartext traffic only in that generated development binary. Preview and production reject HTTP at runtime and do not enable Android cleartext traffic. `EXPO_PUBLIC_*` values are bundled and must contain no credentials or secrets.

For later Metro sessions, run `npm run start:dev-client`. To prove process restoration, use Android process control rather than Fast Refresh:

```powershell
adb -s <serial> shell am force-stop com.etklam.diaryapp
adb -s <serial> shell monkey -p com.etklam.diaryapp -c android.intent.category.LAUNCHER 1
```

## API routing and fault testing

An AVD maps `10.0.2.2` to host loopback. Other VM products use different host routes; configure the route actually reachable from the selected VM.

`scripts/test-network-proxy.mjs` is an optional local TCP pass-through used only to interrupt transport during acceptance. It implements no API, auth, token, or application behavior. Start the real authorized API on port 3201, the proxy on 3101, and point the app at `http://10.0.2.2:3101`. Stop and restart only the proxy to test loss and recovery without destroying server-side sessions.

Useful checks:

```powershell
adb -s <serial> shell getprop ro.build.version.sdk
adb -s <serial> shell getprop ro.product.cpu.abi
adb -s <serial> shell pm path com.etklam.diaryapp
adb -s <serial> shell dumpsys activity activities
```

If host curl succeeds but the app fails, check VM host routing, the service bind address, and Windows firewall. A host curl alone does not pass Android acceptance.

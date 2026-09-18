# diary-app

`diary-app` is a standalone Expo SDK 57 Android client for the existing diary-v3 API. The current P0 scope is native login, authenticated `GET /api/auth/me`, secure session restore, and logout.

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

`android:build` runs `expo run:android`, which generates the ignored native project, builds and installs the development client, starts Metro, and launches the app. For an installed binary, start Metro with `npm run start:dev-client` and launch the `diary-app` development client from Android. Expo Go is not the P0 native acceptance target.

Run local checks with `npm run verify`.

The test-only API smoke command accepts credentials through process environment variables and never prints tokens or passwords:

```powershell
$env:DIARY_API_BASE_URL = 'http://127.0.0.1:3201'
$env:DIARY_TEST_EMAIL = '<synthetic account>'
$env:DIARY_TEST_PASSWORD = '<synthetic password>'
npm run test:api
```

See [Android development](docs/android-development.md), [shared packages](docs/shared-packages.md), and [P0 acceptance](docs/acceptance.md) for reproducible details.

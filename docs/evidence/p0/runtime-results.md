# Android P0 runtime results

- Date: 2026-09-19 (Asia/Taipei)
- Device: `emulator-5554`, Android 16 / API 36, x86_64
- App: `com.etklam.diaryapp`, Expo SDK 57 development build
- API: diary-v3 commit `7e3a39ad5c4900f88d9d8193b7077610d48f9418`, local disposable PostgreSQL, synthetic accounts

The VM reached the real local API through `10.0.2.2:3101`. The host port was a TCP-only fault proxy forwarding to the diary-v3 e2e server on port 3201. It supplied no auth or application behavior.

1. Installed and launched the development APK. Native SecureStore and dev-client modules loaded.
2. Submitted invalid synthetic credentials. The app stayed signed out and displayed the mapped authentication error.
3. Logged in as synthetic account A. The protected view rendered the owner returned by `GET /api/auth/me`.
4. Force-stopped the package with Android Activity Manager, relaunched it from the launcher, and observed the same server-verified owner after bootstrap.
5. Moved the app to background and foreground; AppState revalidation completed.
6. Stopped the TCP proxy and triggered a private read. The app showed a recoverable network state and retained the stored pair. After restarting the proxy, retry/revalidation returned to the protected view.
7. Logged out online, force-stopped, and relaunched. The app stayed signed out.
8. Logged in again, stopped the proxy, logged out locally, force-stopped, and relaunched. The app stayed signed out. No server-side revocation claim is made for this offline case.
9. Logged in as synthetic account B after account A. Only B's `/api/auth/me` identity rendered; no late A response or owner-bound view returned.
10. At Android font scale 1.3, completed login with all controls reachable. Reset scale to 1.0.
11. With the password keyboard open, pressed Android Back. The keyboard closed and `MainActivity` remained foreground.
12. Rebuilt the APK from cleared outputs, installed it with `adb install -r`, force-stopped it, and relaunched it. The package resumed in the expected signed-out state.

The screenshots in this directory are visual evidence for identity, restoration, recoverable outage, signed-out relaunch, account switching, and larger-font layout. They contain no credentials, tokens, or real diary data.

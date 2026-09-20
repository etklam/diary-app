# Closed Android beta release runbook

Beta-R1 packaging is implemented. The continuous Phase 1 build / Phase 2 acceptance attempt is **BLOCKED**; see [current Beta-R2 evidence](../evidence/beta-r2/acceptance.md) for fresh host/API results and the consolidated operator-input list. No signed preview artifact or verified download entry exists. First cohort remains approximately 5–10 individually approved testers. This work does not authorize invitations or public publication.

## Operator decisions required before packaging

Provide the following through the operator's process environment and, for EAS, its **preview** environment. Do not commit a populated environment file. Public variables are embedded in the client and must contain no secrets.

| Setting | Required value / purpose |
| --- | --- |
| `APP_VARIANT`, `EXPO_PUBLIC_APP_ENV` | Both `preview`; never infer this from `NODE_ENV` |
| `EXPO_PUBLIC_API_BASE_URL` | Explicitly approved hosted HTTPS API origin, no path, credentials, query or fragment |
| `BETA_APPROVED_API_ORIGIN` | Exact normalized origin approved by the operator; prevents accidentally reusing a development fallback |
| `EXPO_PUBLIC_BETA_SUPPORT_URL` | Real single-address `mailto:` destination or HTTPS support page; no URL credentials/query/fragment |
| `EXPO_PUBLIC_BETA_DATA_NOTICE` | Confirmed server location, retention or planned removal policy, and how to request assistance/data deletion; 20–2000 characters |
| `ANDROID_VERSION_CODE` | Explicit positive integer, greater than every previously distributed build of this package |
| `BETA_CONFIGURATION_APPROVED` | `1` only after the operator has checked the above; this is an assertion, not an access credential |
| `EAS_PROJECT_ID` | Existing authorized project UUID for EAS; never fabricate or initialize a different account/project |

No approved API, support destination, retention policy, EAS project, or release signing identity was found in the Beta-R1 environment. Configuration validation checks syntax and consistency; it cannot verify that an endpoint is owned/authorized or that the policy is true. The operator must confirm those facts. Missing decisions block external invitations even if local tests pass.

Use the existing individual account process. The app offers sign-in, not registration, invitations, or automated password reset. The organizer assists access/recovery through the configured support destination. An installation link grants no API authorization. Do not seed production, share one login among testers, or embed credentials.

## Stable identity and upgrades

* Preview: **Trade Basic Beta**, `com.etklam.diaryapp.preview`, scheme `tradebasicbeta`.
* Existing developer/production package remains `com.etklam.diaryapp`; production identity is unchanged.
* No previously distributed preview identity was found. Confirm this with the release owner before the first distribution; preserve any existing authorized preview identity if external records show one.
* A separate installation does not inherit developer-app sessions or encrypted drafts. Do not copy databases or keys between installations.
* Preserve the authorized signing certificate permanently. Record its SHA-256 fingerprint, never the private key or passwords, in the release ledger. Protect/back up signing material using the operator's existing process.
* Increase `ANDROID_VERSION_CODE` for every distributed update. Update the reviewed `app.config.ts` version name when appropriate. `expo-application` reads the actual native installed version/build in Help; it does not substitute a JS manifest version.
* Do not alter the environment/origin or existing session/draft namespaces during routine updates. A changed origin deliberately isolates data; plan such a migration separately.
* Install over the existing beta (`adb install -r` for operator testing). Never uninstall to resolve a certificate mismatch, force a downgrade, clear app data, rotate the SQLCipher key, or bypass a schema error. Stop and verify identity instead.

## Reproducible candidate build

Use a fresh isolated checkout of the reviewed, committed candidate. Do not copy `.expo`, `expo-env.d.ts`, `node_modules`, or generated `android/` from a developer machine. Record `git rev-parse HEAD` and `git rev-parse 'HEAD^{tree}'` (quote the tree expression in PowerShell). Keep private signing files outside the checkout.

1. Install Node 24 and dependencies with `npm ci`; run the checks below.
2. Load approved operator configuration into the process without logging it. Do not put secrets in command arguments, public environment variables, evidence, or shell transcripts.
3. Run `npm run release:validate`. Failure is a release blocker, not a reason to weaken validation.
4. Select one of these signing paths:

**Authorized EAS:** Use the operator's authorized EAS CLI/account and already configured project/Android signing credentials. Record the CLI version used. Set matching non-secret values in EAS's **preview** environment; local config evaluation needs the same approved values. Run `npm run android:preview:eas`. The wrapper requests `--profile preview --platform android --non-interactive`, so it does not interactively create another identity. `eas.json` explicitly selects internal distribution, `developmentClient: false`, preview environment and APK output. The post-install hook and native pre-release task validate configuration again. Download the completed signed artifact and record its build URL; a queued/failed build is not an artifact.

**Authorized local build:** EAS local builds are not supported on Windows; the repository instead uses Expo prebuild plus the generated Gradle release task. Install the SDK/JDK required by Expo 57 (this workstation has JDK 17 and Android SDK 36). Set `BETA_KEYSTORE_PATH` to an absolute path, `BETA_KEY_ALIAS`, `BETA_KEYSTORE_PASSWORD`, and `BETA_KEY_PASSWORD` through the secure operator environment. These must reference the authorized stable release key, never the template/debug key. Run `npm run android:preview:local`. It refuses an existing native project or uncommitted/untracked source, runs Expo prebuild without the development wrapper, then `:app:assembleRelease`. The plugin injects environment-backed release signing and rejects debug/missing signing. Output: `android/app/build/outputs/apk/release/app-release.apk`; source/build inputs: `dist/preview-build-input.json`. No key is created by the script.

The old `android:build`, `start`, and `android:bundle` commands deliberately select **development**. Do not use them to build a preview. `android:bundle` is a host export check, not a signed APK. The native release guard also blocks using a stale development project as a release shortcut.

The new `expo-application` module requires a new binary. Keep SQLCipher, SecureStore, backup exclusions and `with-single-attempt-writes.cjs` in prebuild. That interceptor marks the request body one-shot independently of HTTP method, covering both marked POST and PATCH. Do not remove it based on host tests.

## Artifact inspection and Beta-R2 acceptance

From the repository root, run the read-only inspector against the **actual** output, using the approved certificate fingerprint:

```powershell
python scripts/audit-preview-apk.py $apkPath --build-tools $androidBuildTools --certificate-sha256 $approvedCertificateSha256
```

The inspector verifies the signed certificate, preview identity/name, native and embedded version agreement, non-debuggable manifest, cleartext/backup restrictions, no launcher/menu components, embedded JS, native SQLite library and backup exclusion resources, and embedded public configuration. It intentionally rejects the developer APK. Inspect the generated `MainApplication.kt` for the one-shot interceptor and the merged release manifest as well. Static ZIP/manifest inspection does not prove SQLCipher execution or OkHttp's runtime behavior.

Record artifact path/build URL, SHA-256, package ID, native versionName/versionCode, certificate SHA-256, source commit/tree, profile/environment and approved non-secret API origin. Never record credentials or full embedded/request/response dumps.

Before invitations, Beta-R2 must use that exact artifact:

* Discover the connected device; install over the correct package with the same certificate. Stop Metro and remove only development port forwards belonging to this test.
* Launch without Expo Go/development launcher; confirm actual version/build/environment in Help and HTTPS sign-in using an approved synthetic account.
* Quick create/read, Review complete/update, mounted Detail/Queue refresh; session restoration; force-stop recovery of encrypted Quick and Review drafts; A/B owner isolation; ordinary offline retention/recovery.
* Short first-run guidance and dismiss/reopen; keyboard/native Back; narrow width and font scale 1.3; reach all recovery actions; inspect/copy/share a diagnostic through the real support destination.
* Verify SQLCipher fail-closed opening, SecureStore and backup exclusions in this release binary. Exercise single-attempt POST and PATCH response loss/delayed writes in an isolated **HTTPS** fault setup. Do not enable cleartext, bypass certificate verification or reuse the HTTP developer proxy as release evidence.
* Install a higher-version candidate over an existing beta with a session and drafts; verify they survive. Broader real-device/upgrade coverage belongs to Beta-R2.

Run these gates as one continuous release task, not a new product phase. Target two physical devices with different manufacturers or OS versions; record model, OS, ABI and exact APK hash. An emulator is a separate layer. Simultaneously prepare one nonempty Quick draft and Review drafts for two diaries, then compare dates, outcomes and multiline fields exactly after force-stop. Keep unknown-attempt restoration as a separate scenario. Verify expiry, cancel/discard logout, A → B → A and late callbacks without exposing another owner's writing. Host repository tests are not native SQLCipher evidence.

If no earlier signed preview exists, use the authorized identity for a controlled N → N+1 pair, increasing versionCode while keeping environment, origin and storage namespaces unchanged. Prepare a session, Quick and multiple Review drafts, plus a separate unresolved-attempt scenario before installing over N. Check native version, existing key/database readability, unchanged writing, no automatic mutation and normal operations afterwards. A same-source pair proves install-over continuity only, not schema migration.

Release HTTPS faults must cover both POST and PATCH before dispatch, commit with lost/replaced response, delayed original request after an unchanged read, retryable response, auth rejection and process death while unknown. Observe received/forwarded/commit counts per case. Prefer isolated authorized ingress with unchanged candidate bytes; a separate test-origin APK must have its own hash/evidence and cannot stand in for the distributable. Do not weaken TLS or add test-control endpoints to the app.

## Private delivery gate

Use an existing authorized EAS internal route or owner-approved transfer mechanism. Record actual link-access behavior: possession of an unlisted URL may grant download access; it does not prove authenticated private access. Download as an intended tester can and compare SHA-256 with the audited APK. An installation link never grants individual API access. Without a hosting authorization, hand the actual signed artifact to the owner for controlled transfer and leave the transfer gate outstanding; a developer-local path is not a tester download.

The handoff must name the actual account provisioning/recovery process and support destination, confirmed data notice, version/build/checksum, and tested Android devices. Use the existing [繁體中文指南](tester-guide.md) for six short tasks and sanitized feedback. Do not distribute its current blocked version as if these missing operational details had been verified. Pause distribution on a blocking report; preserve installations and issue only a corrective higher-version build under the same certificate after retesting.

## Host and disposable checks

Run `npm ci`, `npm run typecheck` **before** an Expo start/export, `npm run dependencies:check`, `npm run doctor`, `npm run lint`, `npm test`, `npm run android:bundle`, and `git diff --check`. CI uses the same ordering. Observe the relevant hosted CI run rather than inferring it from local success.

Existing opt-in smoke commands are `test:api`, `test:api:reads`, `test:api:quick`, `test:api:discovery`, `test:api:reviews`. Use the existing diary-v3 disposable harness and fault proxy; see their guards and historical phase evidence for prerequisites. Discovery requires the exact uniquely provisioned database URL. Credentials remain process-local/ignored fixture files. Dispose only this run's database/accounts/fixtures. HTTP host tests are a separate evidence layer from HTTPS standalone tests.

## Support, data handling, and corrective releases

Confirmed submissions live on the configured API's server. Quick/Review drafts and unresolved attempts stay encrypted locally; transport TLS plus SQLCipher is not end-to-end encryption. The configured notice must state actual server location and retention/removal arrangements. Never promise a deletion or retention period that has not been agreed and performed.

Help/login provides the real support destination and explains organizer-assisted account access/recovery. Diagnostics are opt-in and inspected before sharing; only native version/build, platform/OS, environment, an allowlisted screen/error code and a validated request UUID are included. Do not request passwords, tokens, keys, diary bodies or database files. No telemetry or automatic upload was added.

Keep these states distinct: local draft persisted; server save confirmed; outcome unknown; confirmed save with read refresh failure. Unknown outcomes retain their exact encrypted attempt and permit read-only inspection. A matching or unchanged GET is not a Review operation receipt and never unlocks replay. Explicit discard/logout abandons local writing, not an in-flight server operation. Uninstall loses local drafts/keys; it is not recovery. Involuntary expiry preserves drafts.

P1C-2B rescheduling/return-to-queue, full editing/deletion/templates, broader modules, iOS and stores are deferred. Review preflight stale checks remain best-effort without backend atomic conditional writes. Completed queue history retains its existing server limit.

If a blocking issue emerges, pause invitations and private link distribution, tell affected testers through the approved support process to preserve the installation/drafts, and prepare a reviewed corrective **higher-version** build with the same identity/certificate. Do not automatically replay uncertain writes or ask testers to downgrade/uninstall. Resume distribution only after the blocking scenario passes on the corrective artifact. No invitations or public release are performed by this runbook.

References: [Expo 57](https://docs.expo.dev/versions/v57.0.0/), [APK builds](https://docs.expo.dev/build-reference/apk/), [variants](https://docs.expo.dev/build-reference/variants/), [local production builds](https://docs.expo.dev/guides/local-app-production/), [EAS local-build platform limits](https://docs.expo.dev/build-reference/local-builds/).

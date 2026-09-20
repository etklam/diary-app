# Beta-R1 acceptance — 2026-09-20/21 (Asia/Taipei)

**Implemented; standalone release and invitation readiness BLOCKED.** This record separates host, disposable API, limited development runtime and standalone evidence. No signed preview APK was created, no invitation was sent, and no public release was published.

## Baseline and implementation

* Actual starting branch `main`, clean working tree, HEAD `06a56c338f94d441675225fc7ea62478a24bf6b8` (`chore: ignore .idea directory`). No newer local commit at inspection. Latest feature ancestor: `98cf7a4e7903272b9a50583264735377e1cc25d6`.
* Implementation reference: the Beta-R1 commit containing this record (`git log --format=%H -- docs/evidence/beta-r1/acceptance.md`). Final delivery identifies the commit; no artifact is attributed to the starting commit.
* Read AGENTS/CLAUDE, README, development/Android/shared-package docs, P1C-1/P1C-2A evidence, config/wrapper/CI and existing auth, access, draft managers and native plugins. Read [versioned Expo 57 docs](https://docs.expo.dev/versions/v57.0.0/) before code changes.
* Shared artifacts/source provenance `7e3a39ad5c4900f88d9d8193b7077610d48f9418` unchanged. Expo 57.0.24, React Native 0.86.3 and existing networking stack unchanged. Added SDK-compatible `expo-application ~57.0.3` solely for native installed version/build; lockfile adds that package only. A new native binary is required for this module.
* Previous 129-test and development-VM records are historical, not verification of Beta-R1. No previous acceptance files were rewritten.

## Demonstrated CI root cause and correction

Observed the public GitHub run/job metadata for [run 35520441777](https://github.com/etklam/diary-app/actions/runs/35520441777), job `106103474693`: HEAD matches the starting commit; typecheck failed; tests/export were skipped. No successful hosted CI run of Beta-R1 has been observed. Local success is not a green hosted run.

Created detached worktree `../diary-app-beta-r1-clean` at the actual starting HEAD without copying `.expo`, `expo-env.d.ts`, `node_modules`, or generated native projects. `npm ci` succeeded. `npm run typecheck` reproduced exactly:

```text
src/components/animated-icon.web.tsx(5,21): TS2307
Cannot find module './animated-icon.module.css' or its corresponding type declarations.
src/constants/theme.ts(6,8): TS2882
Cannot find module or type declarations for side-effect import of '@/global.css'.
```

Installed SDK inspection: `expo/types/index.d.ts` includes `global.d.ts`, which supplies Expo's CSS declarations. The Expo CLI's `start/server/type-generation/expo-env.js` generates ignored `expo-env.d.ts` with a reference to `expo/types`. Extending `expo/tsconfig.base` alone did not load those ambients before a server/export generated local state. This explains why a previously used development checkout passed while clean CI failed.

Correction: tracked `src/types/platform.d.ts` contains only an English explanation and `/// <reference types="expo/types" />`. Copying **only that source file** into the failing clean worktree made typecheck pass, without Metro or generated files. No wildcard declarations, exclusions, strictness changes or generated Expo state were committed. CI now runs typecheck immediately after `npm ci`, before Expo commands. See [Expo TypeScript guidance](https://docs.expo.dev/guides/typescript/) and the installed SDK sources above.

## Implemented release and support behavior

* `eas.json`: distinct development, standalone internal preview APK, and production app-bundle profiles. Preview explicitly sets `developmentClient: false`, `environment: preview`, and matching app/runtime environment. `NODE_ENV` is not the selector.
* `config/release.cjs`, release/EAS/local scripts: require approved hosted HTTPS origin, consistent environment, real support destination, operator-confirmed data notice and explicit positive versionCode. Reject development/loopback/placeholder origins, credentials, paths, queries/fragments and missing configuration. A syntactically plausible domain still requires operator authorization; tests use non-contacted syntax fixtures, not a deployment choice.
* Local path uses fresh-checkout Expo prebuild plus Gradle assembleRelease and existing authorized key settings. EAS uses an existing project and non-interactive credentials path. Neither uses `expo-command.mjs`, creates a key/project, nor silently signs with debug credentials. `with-release-safety.cjs` binds release prebuild to validation and rejects missing/debug signing. Metadata-only Expo tooling can inspect the default config without approved release values; release tasks and runtime still fail closed.
* Preview identity: proposed first-distribution `com.etklam.diaryapp.preview`, **Trade Basic Beta**, `tradebasicbeta`; existing production/developer identity unchanged. No preview installation or distributed preview record was found. Operator confirmation remains required before first distribution. Sessions/drafts retain existing environment/origin/owner namespaces and SQLCipher key. No automatic draft migration between apps.
* `src/beta/*`: dismissible first-use workflow, repeatable Help from login/Account, data/access guidance, actual native installed version/build, explicit diagnostic inspection/selection/share and real configured support link. Diagnostics allow only version/build/platform/OS/environment, stable screen, fixed error-code allowlist and UUID request correlation metadata. Raw exception/body/account/diary/search data is excluded. Missing native version module displays unavailable rather than a JS-manifest guess.
* Quick/Review/read errors contribute only schema-validated, sanitized metadata after owner checks; owner invalidation clears it. Quick/Review start clears prior write correlation metadata. No write-safety decision was changed. Unknown attempts remain durable/locked, with read-only checks and separate warned discard.
* Root rendering error boundary offers explicit rendering retry and Help, with no logout, storage deletion, mutation replay or raw-error display. Reporting receives no storage/auth/mutation capability and shares nothing before explicit inspection/action.
* `scripts/audit-preview-apk.py`: read-only manifest/ZIP/certificate audit for the actual candidate. Checks release identity/version, embedded bundle/config, no debug/launcher/cleartext/backup access, backup resources, native SQLite and authorized certificate fingerprint; rejects unreviewed network security overrides. It cannot establish runtime SQLCipher or native network behavior.

## Commands and actual results

Windows/PowerShell, Node 24. Clean worktree dependency installation was independent, not copied. Final source-only sync never copied local Expo/native/dependency state.

| Command / check | Actual result |
| --- | --- |
| Baseline `npm ci` then `npm run typecheck` without generated state | Install PASS; reproduced both errors above |
| Only tracked SDK ambient reference, then clean typecheck | PASS, no Metro/generated files |
| Fresh candidate `npm ci` | PASS, 901 packages; npm reported 16 moderate audit findings and existing deprecation/install-script notices; no incidental upgrade/autofix |
| `npm run dependencies:check` | PASS, dependencies up to date |
| `npm run doctor` | PASS, 21/21 |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS before Expo generation |
| `npm test` | Initial clean candidate: 164 PASS / 2 opt-in API tests skipped; final source: 166 PASS / 2 opt-in tests skipped after extra owner-metadata tests |
| `npm run android:bundle` | PASS, 1,442 modules, 27 assets, one Hermes bundle; host development-profile export only |
| `git diff --check` | PASS |
| `release:validate`, `android:preview:local`, `android:preview:eas` with matching preview selectors but no approved API | All correctly exit 1: `A hosted HTTPS origin is required.` |
| APK audit against existing developer APK | Correct rejection: `Not the stable preview application ID` |
| Isolated development `expo prebuild --platform android --no-install` | PASS; SQLCipher property, backup resources and method-independent one-shot Kotlin retained; `expo-application` autolinks |
| Generated Gradle `:app:validateDiaryRelease` without signing authorization | Correctly FAILED: authorized EAS credentials or explicit local signing path required |
| Same task with test-only `EAS_BUILD=true` and template debug signing | Correctly FAILED: `Debug or missing release signing is not a beta identity` |

Tests cover configuration separation/rejection, actual local script execution with mocked process boundaries preserving preview env, EAS profile, native signing guard generation/idempotence, diagnostic redaction, native version source/missing module, first-use persistence/failure/dismiss/reopen, explicit report actions/failure, actual Quick API metadata capture and late-owner response rejection. Existing auth/draft/write/reconciliation tests remain included. Host repository tests do not verify SQLCipher execution.

## Fresh disposable API evidence

Backend checkout actual HEAD `ce2962f597ef56dc4e4cb8966c1ca1860369e006`; its unrelated working changes were preserved. Used its existing `scripts/e2e-server.ts` harness and Docker PostgreSQL on 127.0.0.1:55433, provisioning only `diary_v3_e2e_53ebb664a2224f0cb3cd4de80ec9a120`. API 3201, existing HTTP fault proxy 3101/control 3102. No production or persistent test database was seeded.

Opt-in variables: `DIARY_DISPOSABLE_TEST_ENV=1`, local `DIARY_API_BASE_URL`, `DIARY_FAULT_PROXY=1`; discovery received only that uniquely provisioned database URL. Auth used synthetic credentials read privately from this run's ignored Review fixture file. No credentials/tokens/payloads are included in evidence.

| Command | Result / coverage |
| --- | --- |
| `npm run test:api` | PASS: invalid credentials, owner login, SecureStore-adapter session restore, logout/local clear and relaunch signed out |
| `npm run test:api:reads` | PASS: 25 fixtures, bounded summaries, detail/string IDs/civil dates, pagination, empty account and A/B isolation |
| `npm run test:api:quick` | PASS: 1 integration test; create/append/conflict, owner isolation, committed response loss, non-JSON 502/503/504, delayed commit after unchanged read; one POST, no automatic resend |
| `npm run test:api:discovery` | PASS: 33 fixtures, three months, keyword/symbol/range/status/sort, two summary pages, leap-month activity, five review buckets, shared page slices, A/B isolation |
| `npm run test:api:reviews` | PASS: 1 integration test; complete/update and canonical timestamps, preserve unrelated fields, invalid/cross-owner rejection, queue/count changes, response-loss/replacement/delayed PATCH; no replay |

Quick/Review smokes were rerun after the final write-diagnostic adjustment, both PASS. These are host HTTP tests against the disposable API, **not release-compatible native HTTPS fault tests**. Stopped only this run's Metro/API/proxy, verified zero connections, dropped the named database and confirmed its absence. Removed this run's ignored credential/UI fixture files. Existing Docker services and user storage were retained.

## Limited development-VM evidence

Discovered device `emulator-5554`, `sdk_gphone64_x86_64`, Android 16/API 36. Installed package is only `com.etklam.diaryapp`, versionName 1.0.0/versionCode 1, **DEBUGGABLE**. No preview package is installed. Used that existing development client with this run's Metro JavaScript; did not rebuild or relabel it as preview.

Temporarily set 960×2133 at density 440 (~349dp width), font scale 1.3. Observed:

* First-run short introduction wraps/scrolls, native Back dismisses; Help reopens the same workflow.
* Force-stop/relaunch retains introduction dismissal. This is preference restoration, **not a fresh encrypted-draft restoration test**.
* Login keyboard opens; Back dismisses it; Help opens, scrolls and closes through native Back.
* About accurately shows development environment and unavailable native version/build because this old binary lacks `expo-application`.
* Missing support/data policy is explicit. Report inspection shows only allowlisted metadata, including Android OS **16**, not API level 36. No login/diary/private content is in screenshots.

Synthetic screenshots, **development runtime only**:

* [Introduction, font 1.3](screenshots/dev-intro-1.3.png)
* [Help and blocked operator configuration](screenshots/dev-help-blocked-config.png)
* [Inspected diagnostic summary](screenshots/dev-diagnostic-1.3.png)

Restored original physical size 1080×2400, density 420 and font scale 1.0. No port reversals were present; no user app uninstall/data-clear or draft cleanup was performed. Real support opening/sharing and clipboard interaction are not claimed verified without a configured destination.

## Artifact ledger and exact blockers

| Candidate property | Actual result |
| --- | --- |
| APK path / EAS build URL | **NOT AVAILABLE — no signed preview built** |
| APK SHA-256 / signing certificate fingerprint | **NOT AVAILABLE**; no key fabricated or debug identity accepted |
| Application ID / display name | Configured `com.etklam.diaryapp.preview` / Trade Basic Beta; **not observed in a candidate APK** |
| Version name / versionCode | Source name 1.0.0; explicit operator versionCode still missing; **no installed preview version** |
| Profile / environment | Configured preview/internal/APK, developmentClient false; standalone execution **NOT VERIFIED** |
| Target API | **UNCONFIGURED**; no approved hosted HTTPS origin found or supplied |
| EAS/signing | No authenticated Expo session/project configuration or EAS CLI found; no authorized release keystore/credentials supplied |
| Support / data policy | No real support destination, confirmed server location/retention/removal/deletion-request notice supplied |

An async operator question requested those exact missing values without requesting secrets in chat. No answer/configuration was available during implementation. Local Android SDK/JDK tooling exists, so the blocker is not a claim that Android cannot build on this workstation: an authorized deployment and stable signing identity are missing. The local path and negative signing gates were implemented/tested without pretending an unsigned/developer artifact is distributable.

## NOT RUN / NOT VERIFIED and next phase

* Signed preview assemble/download/install and actual merged release-manifest/APK inspection: blocked by approved deployment/support/policy/signing settings. Development generated files are not release proof.
* Standalone launch with Metro stopped, HTTPS login, Quick/Review write loop, actual native version display, SecureStore/session restore, SQLCipher/force-stop draft restoration, owner switching and offline recovery on the candidate: **NOT VERIFIED**; no candidate binary.
* Native release POST/PATCH fault behavior: **NOT VERIFIED**; no isolated authorized HTTPS fault setup. Cleartext/TLS restrictions were not weakened to reuse the old HTTP proxy.
* Candidate keyboard/font/Help/root-error recovery and real support delivery; install-over upgrade retaining session/drafts; physical/multiple devices: **NOT VERIFIED**, Beta-R2.
* Hosted CI of this implementation: **NOT VERIFIED**. The old failing run was observed; no commit was pushed merely to claim a new successful run.
* No server retention/removal schedule or completed deletion is asserted. Invitation readiness remains blocked until the operator confirms the notice and support process.

Next smallest phase: **Beta-R2**, starting with operator configuration/signing, an audited signed preview, then real-device standalone/upgrade acceptance and blocking fixes. P1C-2B and broader product work remain deferred. Existing backend best-effort stale checks/no atomic conditional review update and conservative unresolved-attempt handling are unchanged; no new feature or synchronization protocol was introduced.

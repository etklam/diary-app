# F0 foundation acceptance

Date: 2026-09-22. Scope: engineering foundation for the complete diary-v3 app, not product release.

Status: F0 engineering foundation complete at the recorded host/API/Android-emulator layers. Tickets 01–04 are accepted within this scope. The development reload incident and remote Doctor check below remain explicit release follow-ups; this is not full-product or release acceptance.

## Delivered

- Reproducible source inventory: 51 capabilities, 114 stories, 52 routes, 720 source files and 124 API operations. Operations include access, request/response contracts, native homes and runnable source integration-test candidates. Candidate links are source evidence, not proof of full native implementation.
- Reproducible current shared artifacts, independently installed previous-client fixture and a compatibility gate in CI. [Package review](../../shared-packages.md) records unchanged contracts, calendar/Rotation changes and exact-time helpers that remain Web-local.
- Overview/Diary/Portfolio/Research/More shell, global Quick using existing encrypted controllers, secondary navigation and role-aware future destinations. Future workflows explicitly say unavailable. Shell copy covers en/zh-TW/zh-CN and light/dark, with a large-text navigation grid.
- Reusable synthetic API/native harness, [design rules](../../native-design.md) and [receipt/version/draft protocol](../../offline-write-contract.md). Protocol is specified only; no automatic replay is enabled.

## Source and artifact identity

App starting HEAD: `bb7e9791f34b6a14053ab636327c9021d8166ecc`. [app-source.json](app-source.json) hashes the current uncommitted source/configuration/test files. [source-baseline.json](source-baseline.json) identifies source HEAD `ce2962f597ef56dc4e4cb8966c1ca1860369e006` and allowed file hashes. Existing source changes to `tests/unit/native-package-scripts.test.ts` and staged `tests/unit/pwa.test.ts` were preserved; no source product code was edited.

The [shared manifest](../../../vendor/shared-packages/manifest.json) records exact artifacts/provenance. Two fresh packs reproduced it and all tarball digests. [export.json](export.json) identifies the Android Hermes export, which contained none of the checked synthetic password/database/tracer markers. Export is not signed-binary evidence.

Runtime: Android 16 / API 36 x86_64 `DiaryApp_API_36`, serial `emulator-5554`, fingerprint `google/sdk_gphone64_x86_64/emu64xa:16/BE2A.250530.026.F3/13894323:userdebug/dev-keys`. SQLCipher logged 4.7.0 without keys/content. The native tracer records the installed APK digest separately.

## Checks

| Layer | Actual result |
| --- | --- |
| Clean `npm ci` | PASS, 901 packages. npm reported 16 moderate advisories; no unrelated forced dependency upgrade was applied. Release dependency review remains open. |
| `npm run verify` | PASS: lint, TypeScript, 169 host tests, Android export. Two opt-in API suites skip here and run separately below. |
| Shared/parity checks | PASS: installed provenance, hashes, additive exports, unchanged OpenAPI and frozen source. |
| `npm run dependencies:check` | PASS. |
| Expo Doctor | 20/21 complete. Remote config schema check repeatedly timed out at `exp.host:443`; IPv4-first retry did not fix it. No 21/21 claim. |
| Upstream artifact verifier | PASS: fresh offline install; all 72 runtime/type exports. |
| Upstream boundary/calendar/Rotation tests | PASS, 14 tests in three files. |
| Current/previous API clients | PASS: login/restore, Diary create/append/detail, Review, USER admin denial and logout. ADMIN, Partner acceptance/directional sharing/unlink and synthetic public quote also pass. [Results](client-compatibility.json). |
| Existing real API suites | PASS: 25 read fixtures; Quick conflict/owner isolation/lost-response recovery; Review completion/edit/owner isolation/no replay; 33 discovery fixtures across three months and five buckets. |
| Final rebuilt-APK native tracer | PASS: login → encrypted draft → process death → session/draft reopen → explicit save → Detail → Back; Research → Quick → Back; reopen same draft from More → explicit append → Back to More. [Result and APK digest](native/result.json). |
| Shell visuals | PASS on emulator: light/dark, 360 dp, 2x text and three shell languages. Screenshots: [light](native/06-overview-light.png), [dark](native/07-overview-dark.png), [narrow/large](native/09-overview-narrow-large.png), [zh-TW](native/10-overview-zh-TW.png), [zh-CN](native/11-overview-zh-CN.png). |
| Role/assistive probe | Verified ADMIN More destination appears and remains informational; USER omits it. TalkBack bound successfully and basic tab activation remained operational. This is not a spoken-pronunciation or full authoring accessibility audit. Device settings restored. |

## Native incident

At 15:32:09 UTC, a development-client URL restart produced SIGSEGV on `mqt_v_js`, with `MountingCoordinator::pullTransaction` in `libreactnative.so` and an attempt to execute non-executable memory. No JavaScript exception was reported. The encrypted draft survived. Five subsequent cold restores with the same binary/code/draft passed without reproducing the crash.

A fresh native build completed successfully (478 Gradle tasks, 3m44s), followed by install-over with no uninstall. The retained draft survived and was explicitly saved. The full tracer then passed on APK SHA-256 `503d5e315d03d4159a62ebb61e780d62a2f6cf740e180540c65c1bdc46c01488`. One harness-only repeat initially looked for `Append` although the existing-date state correctly showed `Append selected`; its assertion was corrected and the complete tracer rerun successfully. The tracer now uses the ordinary Android launcher for process restoration instead of requesting a development-client URL reload. This improves test fidelity; it is not, by itself, proof of a product crash fix. No storage reset, key rotation or uninstall was used.

The rebuilt APK also passed five consecutive ordinary-launcher cold restores, reopening the authenticated Timeline and Quick each time, with no new crash-buffer entries. Account → Back returned to More. [Stability result](native/stability.json). The incident remains unresolved at root-cause level and is carried into [Android release acceptance, ticket 65](../../../.scratch/diary-app-full-parity/issues/65-full-android-parity-acceptance.md). F0 acceptance rests on the freshly reproduced foundation flow, not a claim that the earlier crash was fixed.

## Performance and scope boundaries

[Host probes](host-performance.json) separately record 100 samples for a 320-point chart series, FIRE projection and 10,000-character title input. API probes record 20 warm one-record summary requests per client, not a 100-record load benchmark. Native tracer timing includes ADB/polling overhead. Native chart rendering does not exist yet, so its frame-rate baseline must be measured when implemented. Design budgets are provisional targets.

FIRE already has a portable export; exact local-instant editing must be extracted/adapted from Web before its authoring tickets. Public quote/history endpoints are distinct from the authenticated Company Hub aggregate. Guest Tools/Articles, existing-screen preferences/localization, full Portfolio/Research and comprehensive accessibility remain later tickets.

Operator inputs/platform/signing (05/69), backend receipts/generalized drafts/outbox (57–61), push and release/physical-device acceptance remain open. F0 specifies the protocol; it does not complete those implementation tickets or authorize publishing.

## Reproduction and cleanup

Follow the [runbook](../../f0-acceptance.md). Both uniquely provisioned disposable databases were stopped through the source cleanup handler. A final `pg_database` query for their exact recorded names returned count 0. The synthetic native account was logged out normally and Metro stopped; app storage was not cleared. Unrelated Docker services and source work remain intact.

## Subsequent source inventory refresh

On 2026-09-26, after the separate ticket 57 backend implementation began, the reproducible source manifest was refreshed. It now records 725 scoped files and 127 API operations, alongside the same 51 capabilities, 114 stories and 52 routes. `node scripts/freeze-parity-baseline.mjs` followed by `npm run parity:check` passes against `../diary-v3`; the current manifest SHA-256 is `209b85e5893bbafd49cd4664fe10193b94326aabb14c2c450d62173073d41f19`. The original 720-file/124-operation figures above describe the 2026-09-22 F0 run. The refreshed inventory includes ticket 57's relevant untracked files and is not PostgreSQL runtime acceptance.

# P1B acceptance record

Date: 2026-09-19 (Asia/Taipei). P1B is VERIFIED at the automated, real API and Android VM layers described here. P0/P1A evidence is preserved separately.

## Baselines and build

- Pre-change app HEAD: `edeebe184fc42896dfd4f8cbfe6e91b60ed3655b`, main, `feat: implement P1A product shell and read-only diary flow`. See the [pre-implementation static audit](static-audit.md).
- Implementation code/config/test Git tree: `eeff478f580304e3df6a3d4d2c8ef243c23db308`. Constructed using a temporary index from HEAD plus app config, package/lockfile, src, plugins, tests and the write proxy. Documentation/screenshots are outside this code fingerprint; the commit containing this record identifies the complete accepted implementation and evidence.
- Shared source: `7e3a39ad5c4900f88d9d8193b7077610d48f9418`; OpenAPI SHA-256 `677a8123be01ef09256cf9b42bfd4b3717a965f2d76bf911e7d4344517917df0`. Vendored files and `sourceDirty: true` provenance are unchanged.
- Real API checkout: `2764b815d4d6dd87ee8b6704e59cb461dd798d81`, whose differences from the pinned source are the two packaging portability scripts. No upstream code, schema, protocol or package changes were required.
- Dependencies installed with Expo's SDK-compatible installer: `expo-sqlite ~57.0.3`, `expo-crypto ~57.0.3`, `expo-file-system ~57.0.7`. Added the existing vendored domain artifact and direct `zod ^4.5.4` dependency for local draft validation. Package manifest and lockfile changed together.
- Native configuration: SQLCipher plugin, database/key backup exclusions and a CNG MainApplication plugin for single-use mutation bodies. No generated Android source is maintained in Git.
- Toolchain: Expo SDK 57, React Native 0.86.3, Node 24.19.0, npm 11.17.0, Microsoft JDK 17.0.20.1, Android build tools/compile/target API 36, project NDK 27.1.12297006, SQLite NDK 27.0.12077973.
- Device: `emulator-5554`, Android 16 / API 36, x86_64, fingerprint `google/sdk_gphone64_x86_64/emu64xa:16/BE2A.250530.026.F3/13894323:userdebug/dev-keys`.
- Final new APK: `android/app/build/outputs/apk/debug/app-debug.apk`, SHA-256 **`5b82dd8f45ff1582bc00b054e9a68a7fc8c2c65d8de7bd79ec39db9b14e09364`**. Build, installation and launch succeeded. It runs the current Metro JavaScript; exported Hermes bundle is `entry-e7c1bc96b0eef59311ea7ed68442e1e6.hbc`.
- Routing: Android API origin `http://10.0.2.2:3101`, local test-only HTTP fault proxy to real API `127.0.0.1:3201`; Metro `10.0.2.2:8081`. All accounts and writing are synthetic, in a uniquely provisioned disposable PostgreSQL database.

## Material changes and ownership

`src/quick/model.ts` uses shared request/response/date/ID schemas and domain title/timezone functions. `repository.ts` provides an ordered, parameterized, schema-validated SQLite repository and fail-closed key opening. `native-storage.ts` supplies SQLCipher, native randomness and SecureStore. `api.ts` wraps the existing generated client; `controller.ts` owns debounce, durable attempts and reconciliation; `manager.ts` binds controllers to auth owner capabilities and logout policy.

The composer is `src/app/(private)/diaries/quick.tsx`. Timeline adds a compose action and mutation-generation refresh. The private stack registers the route. AuthProvider adds subscriptions, background flush and the logout warning. `src/auth/runtime.ts` still creates exactly one native session and one generated client; it is unchanged in P1B. No bearer tokens enter draft records or component state.

Draft identity is `(JSON.stringify([appEnvironment, validatedApiOrigin]), ownerId)`. Every read/upsert/delete binds both fields. Owner IDs and diary IDs remain strings. Owner-epoch invalidation closes A's controller synchronously; late A write/read results cannot clear drafts, navigate or invalidate B's Timeline. Involuntary expiry preserves A's row, while confirmed explicit logout deletes it before the existing auth logout. No persistent Timeline cache or mutation queue exists.

The UI automatically restores an existing draft with an explicit banner. A 500 ms debounce persists edits; background and navigation flush the latest snapshot. Native stack removal waits for pending persistence. Account logout offers Cancel or Discard draft and log out. Date defaults to the account timezone: the VM's date was September 18 GMT while the Asia/Taipei account correctly defaulted to September 19. No Diary civil date is converted through a UTC timestamp.

## Encryption and privacy evidence

The native asynchronous random generator creates a 32-byte database key once. Only this key is stored under `diary.drafts.sqlcipher.v1` in SecureStore. The complete auth token pair remains in its existing separate SecureStore key. A validated 64-character hex key is applied immediately after opening the database, before application tables are accessed. Missing key with an existing DB, unavailable cipher support, wrong key, malformed rows and storage failures fail closed without deleting/replacing the database.

Runtime on the final APK reported **`Encrypted draft storage ready (SQLCipher 4.7.0 community)`** after key/database validation. The active DB and WAL lacked the plaintext SQLite header and the synthetic draft marker; opening the copied encrypted DB with standard unkeyed SQLite failed with `file is not a database`. The temporary copy was removed. Exact draft restoration after process death supplies independent evidence that the keyed database is usable.

Generated merged manifest has `allowBackup=false`, `fullBackupContent=@xml/draft_backup_rules` and `dataExtractionRules=@xml/draft_extraction_rules`. Cloud backup and device transfer exclude the database domain, `files/SQLite/`, and SecureStore preferences. No unreadable restore is automatically deleted. Actual backup/restore migration was NOT VERIFIED.

User values enter SQL through bound parameters. PRAGMA key interpolation accepts only generated validated hex, never user input. No tokens, diary bodies, key values or raw SQL errors are logged. The development diagnostic prints only the cipher version. No AsyncStorage or plaintext draft file is used by the app. Committed test strings/screenshots are synthetic; no captured key, token or database artifact is included.

## Write semantics and state machine

By-date is a read of the selected civil date. No diary defaults to Create; an existing diary defaults to Append unless explicitly selected otherwise. Create on an occupied date returns definitive `DIARY_ALREADY_EXISTS` and retains the editable draft. Append operates on the submitted date despite the legacy field name `appendToToday`. The server keeps the original title, ID and content, adds exactly `\n\n---\n\n` plus the new fragment, uses ordered tag union and normalized distinct stock-symbol union.

| State/event | Durable behavior |
| --- | --- |
| editing → Save | Set synchronous busy latch; validate shared payload; flush; GET baseline |
| baseline obtained → saving | Persist exact normalized payload, baseline, local attempt ID and timestamp before POST |
| successful valid receipt → confirmed | Persist confirmation, delete draft/attempt, invalidate Timeline once, open Detail |
| received failure HTTP response → definitive-error | Persist retained editable draft without pending attempt; show validation/conflict/session/service message |
| mutation 401 | Persist definitive failure first; auth lifecycle verifies/refreshes separately, without replaying the write |
| delivery/result cannot be established → uncertain | Persist attempt, lock editing/resubmit, offer read-only checking and current server Detail |
| restart with saving attempt | Restore as uncertain; no automatic POST or reconnect/resume worker |
| storage failure before durable attempt | No POST; fail closed |
| confirmed cleanup interrupted | Restore durable confirmation and finish deletion without another POST |

Reconciliation issues GET by-date only. For create from an absent baseline, canonical date/title/content/tags/symbols and expected new-diary metadata must match exactly. For append, compare the full relevant baseline projection with the exact separator/content append and tag/symbol union; ignore only server-updated time and derived trade-plan graphs, and compare symbols independent of association order. Unchanged baseline/no diary permits a later explicit user Save. Any unexplained change remains ambiguous with the encrypted attempt retained. Substring/fuzzy matching is never proof. A local attempt ID is not a server idempotency key.

### Native retransmission bug found and fixed

The first SQLCipher APK (`2d33b114...`) exposed a real failure: one JavaScript POST became two Android HTTP requests when a committed response was dropped. The session no-retry marker alone was insufficient. The second request conflicted for create; append could have duplicated content.

`plugins/with-single-attempt-writes.cjs` installs an OkHttp interceptor before React Native initializes. Requests carrying the shared no-automatic-session-retry marker receive a body whose `isOneShot()` is true. This blocks native connection/HTTP follow-up body retransmission while preserving ordinary read/auth behavior. See the [OkHttp request-body contract](https://raw.githubusercontent.com/square/okhttp/parent-4.12.0/okhttp/src/main/kotlin/okhttp3/RequestBody.kt). A second new APK was built and installed; all final counter tests below passed on it. The first APK is not the accepted reliable-write binary.

Final proxy counter progression (POSTs / commits):

| Explicit action | Before → after | Result |
| --- | --- | --- |
| Create, committed response dropped | 0/0 → 1/1 | Uncertain; GET reconciliation confirmed; no further POST |
| Append, committed response dropped | 1/1 → 2/2 | Exact single append, same ID; GET confirmed |
| Create, response held after commit; force-stop | 2/2 → 3/3 | Held=1 before kill; restart uncertain; restore/check kept 3/3 |
| Synthetic mutation 401 | 3/3 → 4/3 | Draft retained, auth verification separate, no duplicate |
| Synthetic 503 with Retry-After: 0 | 4/3 → 5/3 | Definitive failure, draft retained, no duplicate |
| Network unavailable before Save | 5/3 → 5/3 | Baseline read failed; content/session retained |
| Explicit Save after network recovery | 5/3 → 6/4 | Normal confirmed create, Detail opened |
| Append response loss at 1.3 font scale | 6/4 → 7/5 | Reachable recovery UI; GET confirmed, no duplicate |
| Final save-baseline inspection regression check | 7/5 → 8/6 | Current baseline supplies inspection target; GET confirmed exact append |

## Automated commands and results

| Command | Result |
| --- | --- |
| `npm ci` | PASS; 900 packages installed |
| `npm run dependencies:check` | PASS; compatible versions |
| `npm run doctor` | PASS; 21/21 |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm test` | PASS; 74 unit tests, opt-in real API test skipped in normal run |
| `npm run android:bundle` | PASS; 1,421 modules, Hermes export |
| `npm run test:api` | PASS; P0 native auth smoke |
| `npm run test:api:reads` | PASS; P1A 25-fixture summary/detail/pagination/isolation smoke |
| `npm run test:api:quick` with disposable environment | PASS; real PostgreSQL/API create/append/conflict/isolation and create/append response loss |
| development prebuild, then `npm run android:build -- --no-bundler` | PASS; final native build/install/launch; 478 tasks |
| `git diff --check` | PASS |

The 33 new unit cases use the actual controller and repository with host SQLite, plus the actual shared native-session transport where appropriate. They cover exact reopen/owner/environment isolation, malformed records, key/database failures, debounce/flush/discard, string IDs/civil dates/account timezones, double Save, definitive HTTP failures, attempt-persistence failure, committed/uncommitted create and append, concurrent ambiguity, stale date/write/reconciliation results, in-flight and confirmed restart, one invalidation, logout Cancel/confirm and expiry retention. All 41 P0/P1A tests remain passing. Final review also fixed the inspection target when Save outruns the initial date lookup; it now comes from the durable baseline. Its unit, API and final APK regression checks passed.

The real API test creates synthetic accounts and fixtures, verifies 201 create and append, unchanged string ID/date, exact content/tag/symbol behavior, 409 conflict and B's null by-date result. Its test-only transport consumes a real successful response then throws, and the real controller/repository reconcile with zero duplicate POST. Fixture diaries are deleted. One accidental back-to-back opt-in run hit registration rate limiting; a later separate P1B acceptance rerun passed. This is recorded rather than counted as a successful run.

Reproduce against diary-v3's disposable `node --import tsx scripts/e2e-server.ts` harness:

```powershell
$env:DIARY_API_BASE_URL='http://127.0.0.1:3201'
$env:DIARY_DISPOSABLE_TEST_ENV='1'
npm run test:api:quick
Remove-Item Env:DIARY_DISPOSABLE_TEST_ENV
# For VM faults, in a separate terminal:
$env:DIARY_DISPOSABLE_TEST_ENV='1'
node scripts/test-write-proxy.mjs
```

## Android observations

- Login and cold SecureStore restoration reached Timeline. Composer restored exact multiline content, title, date, tags, symbols and mode after actual `am force-stop`, not Fast Refresh: [draft](restored-draft.png), [metadata](restored-metadata.png).
- SQLCipher storage initially failed closed because File expected a URI and SQLite supplied an Android path. Corrected to a file URI; restarted and verified actual encrypted storage. No unreadable database was deleted.
- Normal create opened [Detail](created-detail.png); native Back showed the new [Timeline card](created-timeline.png). [Append selection](append-selected.png) and [appended Detail](appended-detail.png) preserved the same server ID and original text. Normal create also passed on the [final APK](final-apk-normal-create.png).
- Outage before Save retained content/session and made no mutation request. Explicit recovery succeeded. Final APK committed create/append response-loss and held-response process-death results match the counter table: [uncertain create](uncertain-create.png), [reconciled append](reconciled-append.png), [restored uncertain attempt](restored-uncertain.png).
- [Logout warning](logout-warning.png): Cancel retained A and its exact draft; confirm discarded it. B had an [empty composer](owner-b-empty.png). Logging into A again after explicit discard showed no prior draft.
- Revoked synthetic A's access-token version and refresh family in disposable PostgreSQL. Relaunch displayed session-invalid. B saw an [empty owner-bound composer](expiry-owner-b-empty.png); A's later login [restored the retained draft](expiry-owner-a-restored.png).
- At 1.3 font scale, [Save above keyboard](font-1.3-keyboard.png), [recovery controls](font-1.3-recovery.png) and [long editor](font-1.3-long-editor.png) stayed reachable. Back first dismissed keyboard; later Back returned to Timeline. Safe areas remained usable. A paced 1,944-character synthetic entry restored byte-for-byte after another force-stop. An initial unpaced ADB keystroke flood was truncated; it was not counted as successful input evidence.
- Initial keyboard overlay hid Save; fixed using header-aware keyboard avoidance. VM input automation also encountered Gboard's stylus tutorial and transient ADB reconnects; dismissed the tutorial and repeated interrupted checks. These are not claimed as successful steps.

## Boundaries and remaining work

Physical Android, iOS, production/release/store builds, hosted CI, backup restoration and device migration are NOT VERIFIED. SQLCipher is verified on the stated Android VM; host SQLite tests do not claim encryption verification.

There is no server idempotency protocol or automatic upload. Ambiguous concurrent writes remain locked for inspection; P1B does not invent destructive conflict resolution. Future native/network dependency upgrades must repeat the on-device dropped-response counter tests, not just JavaScript mocks. Draft schema migrations and secure device migration need separate design if introduced later.

P1C Search/Calendar/Review remains PLANNED. No full editor, delete UI, templates, background sync, notification, durable mutation queue, or broader product work was added. Unrelated `.idea/` files are untouched.

Cleanup completed after final VM logout: stopped this run's API, fault proxy and Metro; verified zero connections to its uniquely named disposable database and dropped that database (including all synthetic accounts/fixtures); removed the ignored credential file and temporary download. The VM is signed out and font scale is restored to 1.0. The installed final development APK and encrypted database/key remain on-device for normal future development; explicit logout removed the unsent draft.

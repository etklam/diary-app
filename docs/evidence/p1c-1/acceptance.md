# P1C-1 acceptance record

Date: 2026-09-20, Asia/Taipei. P1C-1 is implemented and verified at the automated, disposable API, and Android VM layers stated below. This does not verify P1C-2 or all future P1C work. Previous evidence is preserved unchanged.

## Actual baseline and provenance

- Starting branch: `main`; HEAD `6383455702c6bddfbef1fedd27589b0b3a2375e3`. No newer local commits. The only initial working-tree entry was untracked `.idea/`, preserved untouched.
- Implementation code/test/script tree: `42fe30460d8465eb37a5385ccd0b829771461b95`. Constructed with a separate temporary Git index from HEAD plus `package.json`, `src`, `scripts`, and `tests`; the user's index was not changed. Evidence/docs/screenshots are outside this fingerprint. The commit containing this record identifies the complete implementation and evidence.
- Read `AGENTS.md`, `CLAUDE.md`, README, development plan, shared packages, Android development and P0/P1A/P1B acceptance. Read the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) before code changes.
- All three tarball SHA-256 values and installed `PROVENANCE.json` records match `vendor/shared-packages/manifest.json`. Source remains `7e3a39ad5c4900f88d9d8193b7077610d48f9418`, OpenAPI SHA-256 `677a8123be01ef09256cf9b42bfd4b3717a965f2d76bf911e7d4344517917df0`. No artifacts, generated clients, package versions, lockfile, Expo/RN/native networking configuration or plugins changed.
- Actual running disposable API checkout: diary-v3 `ce2962f597ef56dc4e4cb8966c1ca1860369e006`. It has newer API read refactoring than the package baseline; this run does **not** claim it is identical to the pinned source. Installed contracts and the pinned Review pagination implementation were inspected, and current real API compatibility passed. Pre-existing changes in that checkout's `tests/unit/native-package-scripts.test.ts` and `tests/unit/pwa.test.ts` were not edited.
- API harness: existing `node --import tsx scripts/e2e-server.ts`, using its `provisionTestDatabase` helper to create this run's uniquely named `diary_v3_e2e_45451146db384d6da17ddd74696b8f2f`. Synthetic accounts only. Host API `127.0.0.1:3201`; disposable fault proxy `127.0.0.1:3101`, control `127.0.0.1:3102`.

## Contract and route map

| Surface | Generated operation/route | Contract and bounds |
| --- | --- | --- |
| Timeline | `GET /api/diaries/summary` | `diaryListQuerySchema`, `diarySummaryListResponseSchema`; search, symbol, dateFrom/dateTo, reviewStatus, sortBy, page, limit=20; no local body search or tag filter |
| Calendar | `GET /api/diaries/activity` (`diariesActivityGet`) | `diaryActivityQuerySchema`, `diaryActivityResponseSchema`; one inclusive visible-month range; exact echoed range, unique dates and in-range dates required; not the holiday route |
| Review | `GET /api/reviews` | `reviewQueueQuerySchema`, `reviewGroupsResponseSchema`; always `target=diary`, limit=20, one shared page number |
| Detail | `GET /api/diaries/{id}` | Existing owner/ID validation and full diary response; no mutation on opening |
| Quick lookup/check | `GET /api/diaries/by-date` | Existing by-date schema and owner/date checks |
| Explicit Quick save | `POST /api/diaries` | Existing create/append request; durable encrypted baseline/payload before one single-attempt POST |

Review pagination is **not one combined 20-row page**: the pinned and current implementations rank `partition by bucket` and apply the same requested page slice within each bucket. A request can return up to 100 rows (20 × five buckets). There is one shared Load more action, not independent bucket cursors. Counts remain authoritative server counts; an empty group in page 2 does not mean its total is zero. Completed is the latest 50 reviewed diaries, not unlimited history; the screen states that limitation. Cross-page changes can alter rankings; Refresh replaces the snapshot. Newly returned server membership removes a duplicate ID from its previous group without device-side reclassification.

## Implementation and ownership

`src/diaries/access.ts` extends the existing owner capability and generated client. `query.ts` normalizes blank optional values and symbols and validates shared date/status/search limits. Timeline's existing state controller adds immediate invalidation, 300 ms search debounce, cancellation, totals, query pagination reset and invalid-filter state. Requests never include unsupported filters.

`discovery-state.ts` owns monthly activity and Review pagination. All controllers check owner epochs and request generations before accepting results; cancellation is forwarded through generated `Request.signal` in the existing timeout transport. API origin/environment isolation remains inherited from the single configured runtime/session. New lists and query state live only in memory; no new persistence/auth/cache architecture exists.

Calendar uses civil field arithmetic, account-timezone today from the shared domain helper, a selected date and independent month activity. Until a validated response arrives, activity is unknown, never implicitly empty. Selected-date Quick initialization requires a ready, pristine, newly created draft with no edits, restored record, busy state, confirmation or attempt. Existing drafts receive an explicit Resume offer. Async navigation also checks the originating owner scope.

The private tabs are Timeline, Calendar, Review and Account. Quick Diary remains an action; Detail remains the same native stack route. No tokens or diary bodies enter route parameters. Mounted list state preserves Back context and position. Confirmed Quick saves publish the existing mutation generation, refreshing all mounted read surfaces while keeping Calendar selection. Review fields already shown by Detail remain read-only.

## Focused P1B write-safety correction

The original implementation treated every non-2xx response as definitive and cleared the durable attempt. It also returned `not-applied` for an absent diary or unchanged baseline, and `checkResult` cleared that attempt. Both assumptions were unsafe.

Before correcting implementation, added four controller regressions: committed append followed by 502, 503 or 504, and an unchanged reconciliation read before a later append commit. Running `npx vitest run tests/unit/quick-diary.test.ts` against the old behavior produced **4 failures / 33 passes**; each failure showed the attempt had become null. These are reproduced failures, not hypothetical findings.

Current behavior:

- Only the recognized application rejections `409 / DIARY_ALREADY_EXISTS` and `401 / AUTH_UNAUTHORIZED` unlock editing. The inspected server path rejects authentication before the mutation and rolls back the diary-date uniqueness conflict. A status alone, arbitrary validation/service code, missing/malformed body or gateway response is not proof.
- Every other failure retains the exact encrypted payload and baseline and enters uncertain state. Non-JSON responses preserve their diagnostic status but cannot authorize resubmission.
- An absent diary after an absent baseline, or an unchanged existing baseline, now returns `pending`. The original request can still commit; Check is read-only, and Save remains locked indefinitely without a poll-count or elapsed-time escape hatch.
- Exact expected create/append comparison is retained. Known confirmation cleans the attempt and invalidates reads once. Unexplained changes remain ambiguous and inspectable through Detail. No automatic replay/background uploader/server idempotency protocol was added.
- Explicit logout discard remains a separate, warned action. It deletes the local draft/attempt; it does **not** establish that retrying the write is safe or undo a possible server commit.

Historical tests asserting editable drafts for all HTTP errors were narrowed to the documented rejection cases. Tests asserting `not-applied` for unchanged reads now assert pending/retained attempts. Those expectations changed because an error response or read snapshot cannot fence an outstanding write. New generated-client tests cover non-JSON 400/401/403/409/500/502/503/504; current suite also retains create/append exact matching, ambiguous concurrent changes, durable reopen, no-replay, auth and storage coverage.

**Limitations of reconciliation:** exact comparison assumes the recorded baseline and submitted payload describe this writer's operation and there is no indistinguishable concurrent writer. Read snapshots are not idempotency receipts. Identical concurrent writes, later edits/deletes, or activity from other clients may be indistinguishable or remain ambiguous. This is not global exactly-once behavior. Unknown attempts created under the old code and already cleared before this update cannot be reconstructed.

### Real API/fault proxy reproduction

`tests/api/quick-api.test.ts` uses the actual Quick controller, generated client, shared native-session transport and SQLite repository against the real disposable API. With `DIARY_FAULT_PROXY=1`, it additionally controls the local proxy:

1. `committed502`, `committed503`, `committed504`: forward the append, consume its successful response, replace it with a plain-text gateway error. Verify retained attempt, locked duplicate Save, one proxy POST/commit, exact read-only confirmation and one fragment in server content.
2. `delayed`: retain the accepted original POST at the proxy, return plain-text 504 to the client, and allow immediate GET to read the old baseline. Verify pending state and no second POST. Explicit `release` forwards that original accepted request; after its commit, GET confirms it with no resend.

Both first and final real-API fault-gate runs passed. The test restores `normal` and removes its fixture diaries. The delayed harness uses explicit release rather than a timing heuristic; it does not add production endpoints or idempotency semantics.

## Commands and actual results

| Command/check | Final result |
| --- | --- |
| `npm ci` | PASS, exit 0, 900 packages; npm reported 16 moderate audit findings and existing package deprecation/install-script notices; no dependency upgrades performed |
| `npm run dependencies:check` | PASS, exit 0, dependencies up to date |
| `npm run doctor` | PASS, exit 0, 21/21 |
| `npm run lint` | PASS, exit 0, no final warnings |
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, exit 0, 99 unit tests; one opt-in API test skipped in ordinary run and separately executed below |
| `npm run android:bundle` | PASS, exit 0; 1,429 modules; final Hermes `entry-695353eff9176ae32fb40d8a34653c11.hbc` |
| `npm run test:api` | PASS, exit 0; invalid login, verified owner, restoration, logout/local clear/signed-out relaunch |
| `npm run test:api:reads` | PASS, exit 0; 25 synthetic summaries, pagination, detail, A/B isolation, cleanup |
| `npm run test:api:quick` with disposable proxy gate enabled | PASS, exit 0; create/append/conflict/isolation/response-loss plus all four new gateway/delayed scenarios |
| `npm run test:api:discovery -- --keep-fixtures` | PASS, exit 0; separate retained fixtures used on the VM |
| `npm run test:api:discovery` | PASS, exit 0; final ordinary run cleaned its diaries |
| Tarball + installed provenance comparison | PASS, all three artifacts exactly match manifest |
| `git diff --check` | PASS, exit 0; Git's CRLF conversion notices are not whitespace failures |

The initial baseline regressions intentionally failed. Intermediate typechecking found a narrowed-status branch and an old mock missing new read methods; both were fixed. Calendar's initial hook attempt produced a lint warning and then a ref-during-render lint error; final implementation uses a stable state initializer and passes. These intermediate failures are not represented as passing runs.

Initial API startup failed with `ECONNREFUSED 127.0.0.1:55433`; Docker Desktop and the existing local PostgreSQL container were stopped. Started them, then provisioned a new disposable database successfully. The first read smoke hit registration 429; its later run passed. Back-to-back Quick/discovery runs also hit registration 429; the new discovery smoke now uses the existing e2e harness's per-scenario `x-e2e-test-id` isolation and passes on a fresh scenario. This header changes only test-harness routing, not production API behavior.

Reproduction (provide secrets through process environment, not Expo public variables or logs):

```powershell
# In diary-v3 with its local PostgreSQL service running:
node --import tsx scripts/e2e-server.ts

# In diary-app; DIARY_TEST_DATABASE_URL must identify this harness's unique DB:
$env:DIARY_DISPOSABLE_TEST_ENV='1'
$env:DIARY_API_BASE_URL='http://127.0.0.1:3201'
npm run test:api:discovery

# In a separate terminal, for proxy/API/native fault acceptance:
node scripts/test-write-proxy.mjs
# Then point the Quick smoke at the proxy:
$env:DIARY_API_BASE_URL='http://127.0.0.1:3101'
$env:DIARY_FAULT_PROXY='1'
npm run test:api:quick
```

Discovery smoke prepares 33 synthetic diaries across February/March 2024 and September 2026. It verifies 20+13 summary pages, no full bodies in summaries, distinctive Orchid/Cobalt terms and ORC/SYN symbols, combined keyword/symbol/date/status/date-ascending filtering, reviewed filtering, no matches, February's exact leap-month activity range, and B's empty summaries/activity/reviews plus forbidden A detail. Review counts are overdue=25, today=2, upcoming=2, unscheduled=2, completed=2; second page returns the remaining five overdue rows and empty exhausted buckets with their nonzero counts preserved. Pending-without-date and bucket setup use parameterized SQL against the specifically named disposable database, verifying the synthetic owner email first; no production seeding route was added.

Unit coverage exercises actual access/state/controller code for debounce/clear/reset, invalid ranges, out-of-order query/month responses, refresh/load-more races, duplicate-page prevention, string-ID merging beyond the safe-integer range, cancellation propagation, owner invalidation on all three surfaces, incomplete activity ranges, genuine empty months, leap/century/year boundaries, account timezone versus device timezone, existing-draft protection, server counts versus loaded groups, page failures, cross-group moves and post-save read invalidation. Native Back and visual scroll preservation are runtime evidence below, not inferred from typechecking.

## Android VM acceptance

- Initially `adb devices -l` showed no devices. Launched the existing `DiaryApp_API_36` AVD and rediscovered `emulator-5554`; did not assume the serial before discovery.
- Android 16 / API 36, x86_64; fingerprint `google/sdk_gphone64_x86_64/emu64xa:16/BE2A.250530.026.F3/13894323:userdebug/dev-keys`.
- Installed `com.etklam.diaryapp` APK SHA-256, measured on-device: `5b82dd8f45ff1582bc00b054e9a68a7fc8c2c65d8de7bd79ec39db9b14e09364`, exactly the recorded P1B single-attempt/SQLCipher APK and current local APK. No native configuration changed, so a rebuild was not required.
- Fresh app log: `Encrypted draft storage ready (SQLCipher 4.7.0 community)`. Actual force-stop restoration and native mutation counters independently exercised this binary. The shared session marker and `plugins/with-single-attempt-writes.cjs` remain intact.
- Metro development client used `10.0.2.2:8081`, API `10.0.2.2:3101`. A first Metro run omitted public API configuration and showed the fail-closed configuration screen; restarted Metro with the explicit development origin. This was not an authentication failure or successful acceptance step.
- Tested normal 1080×2400 / density 420 and narrow 840×1866 at the same density (320 dp wide), font scale 1.3. Controls wrap and scroll; Calendar day targets extend the grid to retain at least 44 dp width at 320 dp. Device timezone was UTC; account timezone Asia/Taipei. Midnight differences are deterministic unit coverage, not a changed VM clock claim.

| Connected flow | Observed result / synthetic evidence |
| --- | --- |
| Timeline keyword → Detail → native Back | Correct Orchid subset (16 initially, 17 after new matching diary); query/results/position retained: [search](timeline-search.png), [detail](search-detail.png), [Back](search-back.png). Also verified away from the top: [scrolled results](search-scrolled-before-detail.png), [opened Detail](search-scrolled-detail.png), [same scroll position after Back](search-scrolled-back.png) |
| Filter controls/keyboard/invalid range | Narrow 1.3 fields reachable while keyboard open; Back dismissed keyboard and stayed on Timeline; end-before-start displays validation rather than empty results: [keyboard](filters-keyboard-font-1.3.png), [invalid range](invalid-range-font-1.3.png) |
| Calendar → existing diary → Back | Selected September 2 and month retained: [Calendar Back](calendar-back.png) |
| Calendar empty day → Quick draft | September 4 applied only to a new draft: [draft](calendar-draft.png) |
| Force-stop and different empty-day selection | Exact content and September 4 restored; selecting September 5 offers [Resume](resume-existing-draft.png), preserving [restored draft](force-stop-restored.png) |
| Confirmed save → read invalidation | Same month retained, September 4 activity appears and matching Timeline count increases without restart: [Calendar](calendar-after-save.png), [Timeline](timeline-after-save.png) |
| Calendar empty month versus outage | Successful empty October differs from unknown-day September outage; Retry restores activity: [empty month](empty-month-font-1.3.png), [failure](calendar-network-error.png), [recovered](calendar-network-recovered.png) |
| Review → Detail → Back | Server 25 overdue, 20 loaded initially, title/date/symbol/status/due labels; native Back retains queue: [first page](review-first-page.png), [detail](review-detail.png), [Back](review-back.png). Also verified scrolled to Completed: [before](review-scrolled-before-detail.png), [Detail](review-scrolled-detail.png), [Back at the same position](review-scrolled-back.png) |
| Review pagination | Explicit next page reaches [end](review-end.png); completed remains 2. Disposable database check after viewing confirmed reviewed count still 2 |
| Narrow 1.3 Calendar and Review | No horizontal overflow; lower controls reachable by vertical scroll: [Calendar](calendar-font-1.3-narrow.png), [Review](review-font-1.3-narrow.png) |
| Account switch with read in flight | Proxy confirmed one held A summary response, then A logged out before response completion. B signed in; release/cancellation did not reveal A rows: [B Timeline](owner-b-timeline.png), [B Calendar](owner-b-calendar.png), [B Review](owner-b-review.png). Native timeout/cancellation may dispose held responses; arbitrary late-success/401 schedules remain deterministic unit evidence |
| Logout and cold relaunch | B signed out; font scale and display size restored: [final signed out](final-signed-out.png) |

The first draft-restoration attempt was interrupted by Fast Refresh during development and repeated after actual force-stop. Early screenshot captures caught transitions and were recaptured for the final connected-flow evidence. An initial rapid tab-switch/logout tap landed before the destination screen was ready; repeated with a settled destination and confirmed the held-read condition before logout. These are not counted as passing attempts.

### On-device write gate at narrow width/font scale 1.3

Proxy totals below include earlier API fixtures and the normal Calendar create; relevant differences are one POST per explicit action. Disabled Save taps and read-only checks never advanced POST counters.

| Fault | POST/commit counters | Result |
| --- | --- | --- |
| Committed append → plain-text 502 | 10/9 → 11/10 | [Uncertain](native-502-uncertain.png), locked Save; [GET confirmation](native-502-reconciled.png); remains 11/10 |
| Committed append → plain-text 503 | 11/10 → 12/11 | [Uncertain](native-503-uncertain.png); GET confirmed; remains 12/11 |
| Committed append → plain-text 504 | 12/11 → 13/12 | [Uncertain](native-504-uncertain.png); GET confirmed; remains 13/12 |
| Delayed append, client already received 504 | 13/12 → 14/12, delayed=1 | Immediate unchanged GET stayed locked; no second POST |
| Force-stop, restore, unchanged GET again | remains 14/12 | [Restored pending attempt](native-delayed-restored.png); no replay and Save disabled |
| Release original delayed request, GET again | 14/12 → 14/13 | [Confirmed](native-delayed-reconciled.png), no additional POST |

Database occurrence checks found each of the four native synthetic append markers exactly once. These tests exercised the installed Android networking implementation, not merely JavaScript mocks. Proxy was later restarted for the separate held-read account-switch check, so its counters reset for that stage.

## Limits and remaining work

- NOT VERIFIED: physical Android, iOS, release/store builds, hosted CI, backup/restore migration, and an actual midnight/daylight-saving transition on the VM. Unit date coverage is not a substitute for those runtime checks.
- No new native APK build was run because the measured installed P1B binary was compatible and native configuration was unchanged. Its fresh runtime SQLCipher and network behavior were verified; a fresh build is not claimed.
- No device test proves every possible concurrent schedule or every account-switch animation frame. Actual held-read/logout was observed; old-query/month/refresh/owner success and failure races are covered deterministically in unit tests.
- No full history download, authoritative local review reclassification, automatic mutation retry, new server idempotency protocol, plaintext discovery cache, full diary editor or review mutation UI was added.
- P1C-2 is the next smallest phase: review creation/editing/completion/rescheduling/return-to-queue, starting with an explicit safe-write design. Full diary editing remains separately planned.

Cleanup completed: signed out on the VM and restored font scale 1.0 and physical display size; stopped this run's API, fault proxy and Metro; verified zero database connections, dropped exactly `diary_v3_e2e_45451146db384d6da17ddd74696b8f2f`, then verified it no longer exists. This removed all synthetic accounts, retained VM fixtures and partial rate-limited fixture runs. Removed this run's ignored credential/UI-helper/temporary-index files and named on-device capture files. Existing repositories, Docker volumes, APK, encrypted key/database and unrelated `.idea/` are preserved. No production data was used or mutated.

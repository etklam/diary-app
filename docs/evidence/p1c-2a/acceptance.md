# P1C-2A acceptance — 2026-09-20

## Baseline and implementation reference

- Starting branch: `main`; actual starting HEAD: `138e032133033745530c14972f8a9c6c6fd5df52` (`feat: add P1C-1 diary discovery and harden uncertain writes`). No newer commits existed at inspection.
- Starting working tree: only unrelated untracked `.idea/`; preserved and excluded from the implementation commit.
- Implementation reference: the commit containing this record, `feat: implement P1C-2A encrypted review authoring`. Primary implementation: `src/reviews/{model,repository,api,controller,manager}.ts`, `src/app/(private)/diaries/review.tsx`, owner access/auth wiring, and mounted Detail/read invalidation.
- Read repository instructions, README, development/shared-package/Android documentation and historical P1B/P1C-1 evidence. Read the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) before coding.
- Installed package versions and all three tarball SHA-256 values match `vendor/shared-packages/manifest.json`. Source provenance remains `7e3a39ad5c4900f88d9d8193b7077610d48f9418`; OpenAPI hash remains `677a8123be01ef09256cf9b42bfd4b3717a965f2d76bf911e7d4344517917df0`. No generated client, artifact, Expo, React Native, native plugin or networking upgrade.
- Actual disposable backend checkout: sibling diary-v3 at `ce2962f597ef56dc4e4cb8966c1ca1860369e006`. Existing unrelated backend changes were left intact. Its existing `scripts/e2e-server.ts` provisioned `diary_v3_e2e_1f267a4c71f64f04ad5f038f5044bdc1` on the existing local PostgreSQL container, API port 3201. Fault proxy: 3101; control: 3102.

Historical acceptance records are unchanged. Results below are fresh results for this phase.

## Verified contracts and routes

| Operation | Contract / behavior |
| --- | --- |
| `GET /api/diaries/{id}/review` | Installed `@diary/contracts/review` response schema, generated client route; requested string ID must match response. Response has no owner ID or `updatedAt`, so access uses the current owner-epoch capability and validates diary identity. |
| `PATCH /api/diaries/{id}/review` | Dedicated generated operation; required `INTACT / PARTIAL / INVALIDATED / UNCLEAR` outcome, at least one non-whitespace reflection, each reflection at most 10,000 characters. All three reflection properties are always sent by the editor. |
| Server normalization | Actual backend source and API tests confirm trim, empty/omitted reflection → null, `reviewStatus=reviewed`, server `reviewedAt` and diary `updatedAt` updated together. Updating a completed review changes `reviewedAt`; it is not an immutable first-completion date. |
| Proven rejections | Route-specific 400 `SYS_VALIDATION_ERROR` occurs before mutation; 401 `AUTH_UNAUTHORIZED` before owner dispatch; 404 `DIARY_NOT_FOUND` identifies no owned row. Actual API verified 400/404 codes and unchanged state. Native/session tests verified marked 401 behavior. Status without the matching structured code is unknown. |
| `GET /api/reviews?target=diary&page=…&limit=20` | Existing server groups/counts and shared page cursor retained. Completed remains limited to the backend's latest 50 reviews. |
| Detail / summary / activity | Existing owner-bound endpoints, read schemas and mutation generation reused. No diary PUT or unrelated diary mutation in review submission. |

The backend PATCH uses owner + diary ID, without an atomic expected-version condition. Neither the installed operation nor inspected implementation provides conditional writes or operation receipts. No unsupported headers/version/idempotency fields were added.

## Draft storage and lifecycle

`review_drafts(scope, owner_id, diary_id, record)` is an additive table in the existing `quick-drafts-v1.db`. Quick and Review repositories share the same cached SQLCipher opening and existing SecureStore key. No database repair, table drop, key replacement or owner-specific key deletion occurs.

Schema-versioned records contain editable fields, minimal review-field baseline, revision, exact pending payload/baseline and local attempt ID, plus a durable confirmation when a validated response is received. Original diary bodies/context remain in memory, not in draft records. Credentials/tokens are not stored in records.

Opening and leaving without edits does not persist a draft. Local autosave debounces for 400 ms, flushes on navigation/backgrounding and serializes saves/deletion. Navigation is blocked while a flush fails or submission is busy; failure is visible and local save can be retried. Restored edits are available even when the server read fails; late reads cannot replace edits. Read cancellation/generations and synchronous owner-epoch invalidation discard stale results.

Cancel logout preserves drafts. Confirmed logout discards only the current owner/environment's Quick and Review drafts. Involuntary invalidation preserves records; prior-owner callbacks cannot remove another owner's records. Explicit unresolved-attempt discard warns that it neither cancels nor reverses a possible server write.

## Write state machine and limitations

1. Synchronous busy latch → shared payload validation → local flush.
2. Fetch current review → compare relevant baseline fields, including server `reviewedAt`. A difference retains local edits and requires explicit adoption after viewing the server version.
3. Persist the exact pending attempt **before** one marked PATCH (`NO_AUTOMATIC_SESSION_RETRY_HEADER`).
4. Validate canonical response ID/status/timestamp/normalized submitted fields → persist confirmation → delete local record → publish one existing mutation generation.
5. If cleanup fails after receipt, retain confirmation and offer local cleanup without PATCH. Restart can clean a durable confirmation without a new mutation.
6. A documented rejection preserves edits and clears the attempt. Every unrecognized status/body, transport failure or malformed success retains the pending attempt and blocks another mutation.

Read-only Check server state **never** confirms an unknown PATCH or unlocks another submission. An unchanged read may precede a late commit; identical pre-existing reflections or matching new text are not receipts. Even a matching changed timestamp cannot identify this operation in the presence of other writers. This is intentionally more conservative than Quick Diary's append-specific exact reconciliation; Quick's existing reconciliation was not repurposed.

Preflight GET is best-effort stale-edit detection, not atomic concurrency protection. Another writer may change the review between GET and PATCH. Backend follow-up: an atomic expected-version comparison on update, with a defined conflict response; stronger unknown-outcome recovery additionally needs durable operation identity/receipts. No global exactly-once claim, polling unlock, automatic replay, background upload or backend rewrite.

## Commands and actual results

| Command / check | Result |
| --- | --- |
| `npm run dependencies:check` | PASS — dependencies up to date |
| `npm run doctor` | PASS — 21/21 checks |
| `npm run lint` | PASS — no warnings/errors on final run |
| `npm run typecheck` | PASS |
| `npm test` | PASS — 129 tests; 2 opt-in API tests skipped in this ordinary run, run explicitly below |
| `npm run android:bundle` | PASS — 1,436 modules, 3.8 MB Hermes bundle `entry-520b3d564c52a1122d5b500e7d7dd818.hbc`; export is not runtime verification |
| `npm run test:api` | PASS — auth, restore, invalid credentials and logout checks |
| `npm run test:api:reads` | PASS — 25 synthetic rows, bounded summaries, detail, pagination and A/B isolation |
| `npm run test:api:quick` with fault proxy | PASS — create/append, existing P1C-1 non-JSON gateway/delayed-write gate and zero duplicate POST |
| `npm run test:api:discovery` | PASS — 33 fixtures, three months, search/symbol/range/status/sort, pagination, leap-month activity, five buckets and A/B isolation |
| `npm run test:api:reviews` with fault proxy | PASS — final run 2026-09-20 22:41 Asia/Taipei; actual controller/repository/session/client against disposable API |
| Installed artifact hashes / versions | PASS — all three match manifest |
| `git diff --check` | PASS |
| `npm ci` | NOT RUN — existing installation was retained; version/hash and dependency health checks passed, no installation repair or dependency change was needed |

Initial failures were resolved and checks rerun: test fixtures initially compared POST's absent relation arrays against Detail's empty arrays; changed to compare before/after Detail projections. Existing Quick smoke hit shared harness rate limiting (429) after other smoke tests; it now uses the already-established disposable `x-e2e-test-id` scenario header, without changing production behavior. An actual native return-navigation failure is documented below.

Automated coverage exercises actual model, repository, controller, manager, access and shared transport: initial fields/no writes on local editing; validation/limits; preserving other reflections; double-submit latch; failure before dispatch; ambiguous/proven rejection; unchanged/same-payload reads; restart locks; stale adoption; late GETs/cancellation; serialization and durable-confirmation cleanup failure; large string IDs; owner changes/expiry; additive Quick/multiple-review coexistence and environment cleanup; mounted Detail read failure distinct from mutation failure. Host SQLite reopen tests verify repository behavior, **not SQLCipher**.

## Disposable API and fault coverage

New smoke uses synthetic A/B owners and an actual pending diary created through existing API `reviewDueAt`. It verifies pending/Overdue → Completed and authoritative count changes, edit of completed review, trimmed canonical fields, server timestamps, unchanged content/tags/symbols/thesis/risk/execution/relations, invalid input without mutation, and foreign-owner GET/PATCH rejection.

Proxy now recognizes the actual PATCH review route and separately counts received `patches`, `forwardedPatches`, and successful `patchCommits` (200); existing Quick POST counters remain intact. Tests cover committed response replacement by plaintext 502/503/504, dropped response, and a delayed original PATCH released only after an unchanged GET. Each fault case, including restart and read-only checking, receives/forwards/commits exactly one PATCH. An identical pre-existing payload remains uncertain before and after delayed release. Counters are test observations, not a production idempotency protocol.

## Android runtime acceptance

- Fresh device discovery: `emulator-5554`, `sdk_gphone64_x86_64`, Android 16/API 36, existing DiaryApp_API_36 development VM.
- Installed package: `com.etklam.diaryapp`. Device `base.apk` SHA-256 and local debug APK both `5b82dd8f45ff1582bc00b054e9a68a7fc8c2c65d8de7bd79ec39db9b14e09364`.
- Native runtime emitted `Encrypted draft storage ready (SQLCipher 4.7.0 community)` during this run. Existing method-independent OkHttp one-shot body plugin remains installed and unchanged. No rebuild: native dependencies/configuration and compatible binary did not change.
- Metro used development scope and `http://10.0.2.2:3101`; test API/DB only. Tested narrow 840×1866 at density 420 (320dp width), font scale 1.3, as well as initial 1080×2400/font 1.0.
- PASS: Queue → pending Diary → Write review (no outcome preselected) → reflection → Complete → original mounted Detail with updated review timestamp → native Back to Review; Overdue changed 1 → 0. Repeated completed-review updates returned to Detail successfully.
- PASS: keyboard-open multiline entry, wrapped outcome choices, visible footer submit, native Back dismissing keyboard before route navigation, expandable context and scrollable recovery actions.
- PASS: actual `am force-stop`, relaunch, Resume review draft and explicit restoration notice; restored writing subsequently submitted successfully. An uncertain attempt also survived force-stop and remained locked.
- PASS: committed plaintext 503: received/forwarded/committed counters changed `12/12/10 → 13/13/11`; check/restart did not add a PATCH. Delayed identical payload: received count increased once while forwarded/committed stayed unchanged; release produced one forward/commit, checking remained uncertain.
- PASS: native retryable `503` with `Retry-After: 0` added one received PATCH and zero forwards/commits; marked 401 likewise added one received PATCH and no automatic replay. This exercises PATCH through the installed Android transport, not just JavaScript mocks.
- PASS: confirmed save with subsequent Detail GET 503 showed “Saved, but refreshing this diary failed”; Retry under normal network changed no PATCH counter and restored canonical Detail.
- PASS: offline preflight failure retained local writing and sent zero PATCH; cancel logout retained Resume review draft; confirmed discard/logout and A → B switch exposed no A rows in B's empty Queue.

Native defect found and fixed: immediate successful-save pop could race the removal-guard/header update and throw `ScreenStackFragment added into a non-stack container`, reproducible after a cold start. The editor now commits removal-guard changes before scheduling native Back on the next animation frame. Cold-start complete/update/Detail/Back flows passed afterwards, including on the final source. No dependency upgrade or native-stack replacement.

Synthetic screenshots (captured in this run, not historical):

- [Editor and reachable action with keyboard at 320dp / 1.3](editor-keyboard.png)
- [Restored encrypted Review draft notice](restored-draft.png)
- [Unknown committed PATCH, read-only checking](uncertain-patch.png)
- [Delayed PATCH inspection](delayed-patch.png)
- [Canonical Detail after completion](completed-detail.png)
- [Refreshed Queue membership/count](refreshed-queue.png)
- [Saved mutation, failed Detail refresh](saved-refresh-failed.png)
- [Owner B's empty Review Queue](owner-b-empty.png)

## NOT VERIFIED / remaining boundaries

- Physical Android devices, iOS, hosted CI, release/store build and production: NOT VERIFIED; only the connected Android development VM and disposable local API were targets.
- Actual power loss/disk-full/corrupt-cipher recovery during a save: NOT VERIFIED on Android; no safe native storage fault injector was installed. Controller/repository fault and cleanup ordering tests passed; historical cipher-corruption evidence is not relabeled as a new test.
- Simultaneous nonempty Quick plus multiple Review draft restoration on Android, and native expiry while a PATCH remains in flight: NOT VERIFIED as combined device scenarios in this run. Additive/coexistence, expiry and late-owner behavior were tested against actual host repository/manager/controller code; individual Review process-death recovery was observed on SQLCipher.
- Stale-edit conflict presentation was implemented and controller-tested; two-device concurrent editing UI was NOT VERIFIED. Atomic conflict prevention is unavailable in the backend contract, not something a passing preflight test can establish.
- Completed history beyond the backend's latest 50 remains unavailable. Full diary editing/deletion/templates and P1C-2B rescheduling/return-to-queue remain PLANNED.

Cleanup completed: stopped only this run's API/proxy/Metro processes, confirmed zero connections and dropped the uniquely named disposable database (subsequent existence count 0), removed this run's ignored fixture credentials/helpers/dump and temporary screenshot, signed out the VM, and restored physical display size/font scale 1.0. Existing PostgreSQL container, native app/database/key, unrelated workspace files and prior evidence are preserved. Installed `PROVENANCE.json` files also exactly matched all three manifest provenance records.

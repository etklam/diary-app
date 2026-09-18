# P1A acceptance record

Date: 2026-09-19 (Asia/Taipei). P1A is verified for the evidence layers below; P1B has not started.

## Baselines

- App: acceptance performed on the P1A changes based on `e68c04127c20ef3483308bcde9d6545213571442` (`feat: implement Android native auth P0`); the commit containing this record identifies the accepted implementation. [Static audit](static-audit.md) records the pre-change inspection and architectural decision.
- Vendored API/contracts: `7e3a39ad5c4900f88d9d8193b7077610d48f9418`; OpenAPI SHA-256 `677a8123be01ef09256cf9b42bfd4b3717a965f2d76bf911e7d4344517917df0`. Artifacts, manifest, `sourceDirty: true` and dependency lockfile are unchanged.
- Running API: existing local diary-v3 checkout `2764b815d4d6dd87ee8b6704e59cb461dd798d81`. Its only differences from the pinned source are the two packaging portability scripts; API, contract and product sources match. No upstream change was made for P1A.
- Data: newly provisioned disposable PostgreSQL database, synthetic `example.test` accounts and synthetic diaries only. The standard read smoke run deletes its 25 fixtures. A separate retained run supplied VM fixtures.
- Cleanup: after VM logout, stopped this run's API/proxy, verified zero remaining connections and dropped its uniquely named disposable database. Removed the ignored synthetic credential file. All retained accounts and VM diaries were removed with that database; unrelated databases were untouched.
- Android: `emulator-5554`, Android 16 / API 36, x86_64, fingerprint `google/sdk_gphone64_x86_64/emu64xa:16/BE2A.250530.026.F3/13894323:userdebug/dev-keys`.
- Runtime: Expo SDK 57 / React Native 0.86; Node 24.19.0, npm 11.17.0. Existing `com.etklam.diaryapp` development APK from P0, SHA-256 `5900479353f5b864093238563cc5853da82db13d93692de9e3f99f969549c695`, running the P1A Metro bundle.
- Routing: API `http://10.0.2.2:3101` via TCP-only fault proxy to the real local API on port 3201. Metro was ultimately opened at `http://10.0.2.2:8081`; an earlier `adb reverse` connection was lost and replaced before final acceptance.

## Implementation boundary

`src/auth/runtime.ts` exposes its existing generated client. `src/diaries/access.ts` attaches owner-epoch capabilities to the existing lifecycle; it never creates a second native session. `AuthProvider` subscribes to those capabilities with `useSyncExternalStore`. Ordinary network/service/parse errors stay in read state. Terminal 401s re-enter auth verification; a previously signed-in owner whose session has been cleared now sees the explicit session-invalid state.

Screen-local request generations discard late results after refresh, route changes, unmount and account changes. Detail validates both returned ID and owner. IDs remain strings, with BigInt used only for range validation. Civil dates are displayed verbatim; UTC metadata uses instant formatting. Markdown is selectable native plain text with original line breaks, without HTML or WebView rendering.

## Commands and automated results

| Command | Result |
| --- | --- |
| `npm ci` | PASS, exit 0; 896 packages installed |
| `npm run dependencies:check` | PASS, exit 0; dependencies up to date |
| `npm run doctor` | PASS, exit 0; 21/21 checks |
| `npm run lint` | PASS, exit 0 |
| `npm run typecheck` | PASS, exit 0 |
| `npm test` | PASS, exit 0; 6 files, 41 tests (23 preserved P0 + 18 P1A) |
| `npm run android:bundle` | PASS, exit 0; 1,355 modules, Android Hermes bundle exported |
| Auth smoke (`scripts/auth-api-smoke.mjs`, the `test:api` entry point) | PASS, exit 0; invalid login, native login, `/me`, restoration, logout, signed-out relaunch |
| `npm run test:api:reads` | PASS, exit 0; disposable fixtures cleaned |
| `npm run test:api:reads -- --keep-fixtures` | PASS, exit 0; separate fixtures retained temporarily for VM acceptance |
| `git diff --check` | PASS |

Unit coverage includes strict summary parsing (rejecting full-body fields), initial/empty success, deduplicated pagination, end handling, concurrent pagination suppression, failed-page retry, refresh replacement, refresh/page races, owner invalidation, canceled reads, late detail/route responses, string int64 IDs, civil-date versus instant rendering, detail 404, response owner mismatch, invalid IDs, subscribed owner transitions, ordinary network/404-summary/503 failures preserving auth, and terminal 401 handling. Late A successes and 401s cannot affect B.

Real API acceptance creates 25 diaries on unique civil dates and verifies two pages (20 + 5), repeatable descending order, unique string IDs, an empty third page, bounded summaries without content/transaction graphs, matching full detail and civil date, an empty second account, and `DIARY_NOT_FOUND` / 404 when that account requests A's diary. The test setup POST is not product creation UI.

Reproduction against the authorized disposable diary-v3 e2e server:

```powershell
# In diary-v3, with its local test PostgreSQL available:
node --import tsx scripts/e2e-server.ts

# In diary-app, in another terminal:
$env:DIARY_API_BASE_URL='http://127.0.0.1:3201'
$env:DIARY_DISPOSABLE_TEST_ENV='1'
npm run test:api:reads
```

`--keep-fixtures` writes synthetic test credentials and a diary ID to ignored `.expo/p1a-fixtures.json` for VM use; it writes no session tokens. Dispose the test database after retained-fixture acceptance. Ordinary runs clean their diary fixtures in `finally` and logout both native test sessions.

## Observed Android VM results

| Case | Result and evidence |
| --- | --- |
| Login → product shell | PASS; Trade Basic header, Timeline and Account only; real A summaries in [restored Timeline](restored-timeline.png) |
| Cold restore | PASS; force-stop and launcher relaunch restored SecureStore session, verified owner, and fetched Timeline afresh |
| Pagination | PASS; scrolled through 20 rows, pressed Load more, reached row 1 and [end marker](pagination-end.png) after 25 rows |
| Pull-to-refresh | PASS; a fixture created after list load appeared after pull; [refreshed Timeline](refreshed-timeline.png). Repeated from B's empty Timeline to B's new diary |
| Detail and Android Back | PASS; [full diary](diary-detail.png), civil date, tags, symbols, selectable multiline text and metadata. Android Back preserved both loaded pages and list position at row 1 |
| Timeline read outage | PASS; stopped only TCP proxy, pulled to refresh; existing rows remained and [Retry stayed near heading](timeline-refresh-error.png) |
| Timeline retry at font scale 1.3 | PASS; [error](refresh-error-large-font.png) → restarted proxy → Retry → [recovered list](refresh-recovered.png), without login |
| Detail read outage/retry | PASS; [reachable Retry at 1.3](detail-error-large-font.png) → restarted proxy → [same requested diary](detail-recovered.png), without login |
| Account, font scale and safe areas | PASS; [Account at 1.3](font-scale-account.png), expanded tab height, scrollable content, logout reachable. Scale reset to 1.0 |
| Activity recreation during offline restore | PASS; changing font scale restarted the activity; recoverable verification kept the saved session. Retry verification recovered after proxy restart without credentials |
| Offline logout and relaunch | PASS; A logged out while proxy stopped after starting a detail read, force-stop and relaunch stayed [signed out](offline-logout-relaunch.png). No remote revocation claim |
| A → B isolation | PASS for observed UI; B first showed [empty Timeline](account-b-empty.png), then only [B's row](account-b-timeline.png) and [B's detail](account-b-detail.png). [Account identity](account-b-identity.png) matched B. No A content returned in observed B screens; deterministic late-response races are covered in unit tests |
| Owner-scoped 404 | PASS; while signed in as B, opened A's diary ID through a native deep link; [Diary not found](owner-isolated-not-found.png) appeared without A or previous B content |
| Online logout and relaunch | PASS; B logged out, force-stop and launcher relaunch stayed [signed out](online-logout-relaunch.png) |

All screenshots contain synthetic data only. Inspection used native UI hierarchy dumps and screenshots, not host API success as a substitute for VM behavior.

## Corrections during acceptance and limits

- Initial VM login exposed a blank Timeline because React Compiler memoized an unsubscribed mutable scope getter. Replaced it with `useSyncExternalStore`, added subscription regression coverage, and repeated cold restore and read acceptance.
- The first new transport tests had incomplete auth response fixtures (`ok: true` missing) and a configuration-property typo. Corrected test fixtures; the final suite passes.
- Increased tab bar height for scaled labels after inspecting 1.3 layout. Moved refresh errors to the list header so Retry does not require scrolling through loaded rows.
- **NOT VERIFIED in P1A:** a newly built/reinstalled native APK (existing verified P0 binary was used), hosted GitHub CI (local identical gates passed; no push), iOS, physical Android devices, release/store builds, and frame-by-frame capture of every account-switch animation. Arbitrarily scheduled late responses are verified with deterministic unit tests, not claimed as VM fault injection.
- No new dependency, shared artifact, backend/API change or P1B feature was required. Plain-text Markdown is the deliberate P1A presentation limit. Before P1B, define durable owner-bound drafts and reliable write/uncertain-commit semantics; neither is a blocker for these verified reads.

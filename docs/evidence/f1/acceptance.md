# F1 account/preferences/reader acceptance

Date: 2026-09-23. Status: ACCEPTED within F1 scope at the evidence layers below.

Scope: issues 06–09, account foundations, full preferences and reusable native Markdown reading. F2 implementation has not started. The target remains the complete diary-v3 product.

## Implementation

- Registration uses the canonical request/response schema and an explicit subsequent sign-in. Public Start/Guide work signed out. Allowlisted continuations retain route, bounded diary ID or civil date; authentication never submits a Diary or security mutation.
- Security validates password UTF-8 limits, confirms the action, flushes encrypted drafts, sends one marked request, distinguishes rejection from uncertainty, clears password fields and signs out after success/uncertainty. Same-owner drafts survive security revocation; ordinary logout retains its existing explicit discard behavior.
- Preferences cover name, timezone, zh-TW/zh-CN/en, system/light/dark, default workspace, monthly trades, exact profit/holding decimals and holiday exclusion. Server settings cache by environment/owner; appearance is device-local. Late reads/saves cannot overwrite newer field edits. Existing shell, account, Diary, Quick, Review and Help surfaces share translations/themes; instants use account timezone and civil dates remain unchanged.
- `src/markdown/reader.tsx` renders native GFM headings, lists/tasks, emphasis, links, references, images, quotes, code and horizontally scrolling tables. Raw HTML is omitted; executable, credentialed, local-file and protocol-relative URLs are rejected. Failed links/images retain readable alternatives. Stored Markdown is not rewritten.

## Identity and verification layers

Source API checkout: `ce2962f597ef56dc4e4cb8966c1ca1860369e006`. Frozen parity inventory remains `f83782f007392351298503ad651e47f9ecce04557c5b16a426df42a16c5c073f`. No shared contract or production backend changes were needed; the existing local fixture wrapper only gains opt-in fault instrumentation.

Installed final Android development APK SHA-256: `3fac1b52009db2bb251fe4bce4b63b921f494c7333fd3e6f9a205f863d4121cb`. Built with JDK 17 for the API 36 x86_64 emulator and installed over the existing app with `adb install -r`; prior preferences/session/encrypted draft were restored. No uninstall, key rotation or app-data clearing occurred.

[Host/build evidence](host.json) records the APK and exported Hermes bundle separately. Native scenarios execute current Metro JavaScript, not the exported release bundle. The final [source snapshot](app-source.json) identifies uncommitted source/config/tests without including environment files or private fixtures.

| Layer | Result |
| --- | --- |
| Host checks | PASS: lint, TypeScript, 182 tests. Three opt-in API cases skip in this command and run separately. Android Hermes export passes. |
| Shared/dependencies | PASS: package provenance/exports/runtime boundaries, unchanged full parity inventory and Expo dependency compatibility. |
| Disposable API | PASS: three account, Quick and Review suites. Exact decimal/zero settings, rejected/uncertain writes, owner isolation, native access/refresh and Web-cookie revocation. [Account result](api.json). |
| Source realtime integration | PASS: two selected real-JWT/socket tests for password change and logout-all, including disconnect and rejected old-token reconnect. These are server tests, not implementation of the app's future realtime module. |
| Native account | PASS on the final APK: guest Guide → registration → explicit login → Quick without submission; exact settings; restart with zh-TW/dark/Calendar; wrong password; changed-password reauthentication and retained encrypted draft. [Result](native/account-result.json). |
| Native reader | PASS: 13,161-character GFM fixture, unchanged source, inert HTML/executable link, valid and missing images without account headers, horizontal tables, both themes, 360 dp/2x font and zh-CN save. [Result](native/reader-result.json). |
| Native boundaries | PASS: cold date continuation without submission, actual Markdown Guide link, expiry date continuation, A → B → A draft/settings isolation and current-client logout preserving a peer session. Committed-response loss produced exactly one request, one commit and one drop; native UI reported uncertainty and the peer token was denied. [Result](native/boundary-result.json). |

## Native transport correction

The previous APK reproduced `unexpected end of stream` during fast logout-all and preference saves after reads. A bounded server observer saw no matching mutation; slower explicit security actions succeeded. The app correctly reported uncertainty and did not retry. This was consistent with reuse of expired idle connections under the existing one-shot request policy; it was not proof that the server committed a failed attempt.

F1's plugin evicts idle OkHttp connections before marked writes and keeps the one-shot body. Active calls, cancellation and timeout propagation remain on the original client. This avoids idle-connection reuse without authorizing a replay. The rebuilt APK passed immediate preference save and immediate logout-all. Plugin upgrade/idempotence/fail-closed tests pass. The dedicated committed-response-loss probe additionally proved exactly one request, one commit and an uncertain native result; no production retry or server receipt protocol was introduced.

## Harness corrections and limits

Cold-start acceptance exposed a missing continuation while the private navigator still reported the root path. `+native-intent` now routes validated cold context through the root authentication gate. Expiry acceptance also exposed a second redirect render after the child's date had been cleared. The private guard reads the active route parameters and freezes the first valid continuation while redirecting, so the second render cannot erase the date. Existing encrypted drafts keep their original date and receive a visible explanation when a different requested date cannot be applied. The development launcher must select the existing Metro project before its pending intent reaches the app.

The first PNG fixture was invalid; a valid generated PNG with a per-run URL now avoids both corrupt bytes and accidental cache-only network assertions. Native table scrolling exposed retained reader position; the harness now scrolls to the heading before testing a reopened document. Inline links require tapping their glyphs, not the midpoint of the full-width paragraph bounds exposed by Android. Repeated runs create independent synthetic documents instead of modifying existing content. Failure records are overwritten only by a newly completed scenario.

An intermediate native build omitted the development variant and was not accepted. It was rebuilt through the development configuration. Separately, Metro stopped answering its host `/status` endpoint during regeneration; restarting the owned Metro process restored launch. Neither a white development screen nor host build success was counted as a native pass. Diagnostics remain under `diagnostics/` and are not final accepted screenshots.

Full Tools/Articles and expanded Library operations remain their assigned F5/F8/F2 tickets. F1's Library default opens existing Diary browsing. Native realtime, push, generalized write receipts and offline synchronization remain later phases. Accessibility evidence covers native labels/roles, reachable controls, themes and 360 dp/2x text; it does not certify every TalkBack interaction. Long Markdown is the recorded synthetic document size, not a maximum-size/physical-device performance benchmark. External OS application handlers may be unavailable; readable fallback is retained.

F0's development-client reload SIGSEGV remains a release follow-up; these flows do not establish its root cause. Physical devices, signed standalone APKs, iOS and public launch remain unverified. F0's remote Expo Doctor schema timeout and dependency-advisory review are still release follow-ups. HTTPS handshake/latency implications of idle eviction need physical-device release acceptance.

## Reproduction and cleanup

Commands and fixture behavior are in the [F1 runbook](../../f1-acceptance.md). All three native tracers report PASS. The owned API received its normal SIGTERM cleanup through the already-open local inspector after its terminal stdin was unavailable. The exact disposable database `diary_v3_e2e_aa2a2df107ff4333ad439497fd5b31c8` is absent (catalog count 0). Owned API/probe/image/Metro/inspector ports are closed; the existing PostgreSQL container and encrypted device drafts remain intact. Device font scale is 1.0 and physical density 420, with no override. The crash buffer contains only the earlier F0 incident; no new crash was observed. F0 evidence remains historical and was not overwritten. Unrelated sibling source changes remain untouched.

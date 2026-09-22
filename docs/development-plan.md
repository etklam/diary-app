# Development plan

**Current delivery target (2026-09-22): complete diary-v3 feature parity in the native app, followed by full-product launch.** See the [full launch roadmap](launch-roadmap.md) and [feature parity matrix](feature-parity.md). The owner superseded the earlier beta-only scope and “deferred until beta feedback” priorities. The P0–Beta-R2 sections below remain implementation/evidence history; beta acceptance is an intermediate release task and does not block unrelated feature development.

Execution planning now lives in the [full-app PRD](../.scratch/diary-app-full-parity/PRD.md), [issue index](../.scratch/diary-app-full-parity/ISSUES.md) and [common delivery rules](../.scratch/diary-app-full-parity/ISSUE-BREAKDOWN.md). Follow ticket dependencies rather than numerical or phase order; no new issue is complete merely because a historical slice passed.

Status values: **IMPLEMENTED** means code and automated checks exist; **VERIFIED** means behavior was observed at the stated evidence layer in this run; **PLANNED** is outside the current implementation.

## F0 — Complete-product foundation: VERIFIED within scope

Tickets 01–04 now deliver the frozen full-product inventory, aligned shared packages and previous-client fixture, five-section navigation/global Quick, and repeatable disposable API/native acceptance. The rebuilt Android development APK passed encrypted draft/session restoration, cross-tab authoring and five cold starts. See [F0 evidence](evidence/f0/acceptance.md) for exact layers, performance limitations and the unresolved development-reload incident. Operator tickets 05/69 and actual write-protocol implementation remain open. F0 evidence remains historical; the next accepted phase is recorded below.

## F1 — Account, preferences and Markdown: VERIFIED within scope

Tickets 06–09 deliver registration/public continuation, password change/logout-all, complete preferences/localization/themes and safe native GFM reading. Acceptance includes 182 host tests, three disposable API cases, two source realtime revocation cases, Android Hermes export and three native tracer suites. Cold/expired continuation, A → B → A draft/settings isolation and committed-response loss all passed. See [F1 evidence](evidence/f1/acceptance.md) and [reproduction](f1-acceptance.md). Work stops after F1; F2 has not started. Physical-device, standalone, iOS and full public release gates remain open.

## P0 — Android native auth: VERIFIED

| Scope | Status | Evidence |
| --- | --- | --- |
| Expo SDK 57 development client and SecureStore native module | VERIFIED | Native build, install, and launch record in `docs/acceptance.md` |
| Validated API origin and environment-isolated session key | VERIFIED | `src/config/api.ts`; unit tests passed |
| Atomic SecureStore token pair adapter | VERIFIED | `src/auth/secure-session-storage.ts`; unit and VM restore tests passed |
| Shared `createNativeSession` and `createApiClient` auth flow | VERIFIED | Artifact tests and real API smoke test passed |
| Login, `/api/auth/me`, restore, recoverable network state, logout | VERIFIED | Real API and Android VM evidence in `docs/evidence/p0` |
| Android VM acceptance | VERIFIED | `emulator-5554`; see `docs/acceptance.md` |

## P1A — Product shell + Timeline + Diary Detail: VERIFIED

Verified at the unit, real API and Android VM layers described in [P1A acceptance](evidence/p1a/acceptance.md). The existing SDK 57 development binary runs the new JavaScript application; this phase does not claim a new native APK build or hosted CI run.

| Scope | Status | Evidence |
| --- | --- | --- |
| Trade Basic private Timeline/Account tabs and native detail stack | VERIFIED | Android API 36 VM, safe areas and 1.3 font scale |
| Shared native auth transport and owner-bound read scopes | VERIFIED | One runtime/client; 41 unit tests including all 23 P0 tests |
| Bounded Timeline, page merge, refresh replacement, retry, end state | VERIFIED | Unit tests, 25-row real API fixture, VM pagination and refresh |
| Detail, string int64 IDs, civil dates, owner isolation, 404 | VERIFIED | Shared schema parsing, real API acceptance and VM |
| Restore, online/offline logout, read outage recovery, A → B switch | VERIFIED | P1A VM evidence; P0 evidence retained unchanged |

## P1B — Quick Diary + encrypted durable draft + reliable writes: VERIFIED

Verified at the automated, real API, and Android API 36 VM layers in [P1B acceptance](evidence/p1b/acceptance.md). A new development APK includes SQLCipher and native protection against HTTP mutation retransmission. Physical devices, iOS, hosted CI and distribution are not verified.

| Scope | Status | Evidence |
| --- | --- | --- |
| Quick Diary from Timeline; date/content, optional title/tags/symbols | VERIFIED | Native composer, account-timezone date, create/append and native Back |
| Encrypted owner/environment draft; autosave and restore | VERIFIED | SQLCipher 4.7.0 runtime, unkeyed read rejection, force-stop restoration |
| Explicit logout discard and involuntary expiry retention | VERIFIED | Unit tests and A → B → A VM flows |
| Durable write attempt, no blind replay, exact read-only reconciliation | VERIFIED | Real API and final APK response-loss/in-flight process-death tests |
| Single-attempt transport at both session and Android HTTP layers | VERIFIED | 401, retryable 503 and committed response loss each send one POST |
| Keyboard, long content, 1.3 font scale, reachable recovery controls | VERIFIED | Synthetic VM screenshots and exact 1,944-character restoration |

## P1C-1 — Diary discovery, Calendar, read-only Review Queue: IMPLEMENTED

Fresh automated, disposable API and Android VM results are recorded in [P1C-1 acceptance](evidence/p1c-1/acceptance.md). The P0/P1A/P1B records above remain historical evidence at their documented layers; they are not reruns of this implementation.

| Scope | Status | Evidence |
| --- | --- | --- |
| Focused P1B safety correction | IMPLEMENTED | Gateway/non-JSON failures retain attempts; unchanged reads remain pending, never authorize another Save; regression tests and fault proxy |
| Server summary search and filters | IMPLEMENTED | Shared contracts, debounce, cancellation/generations, bounded pagination and server totals |
| Civil monthly Calendar and selected-date Quick Diary | IMPLEMENTED | Independent activity range, unknown/error states, account-timezone today, protected existing drafts |
| Read-only diary Review Queue | IMPLEMENTED | `target=diary`, server buckets/counts, shared page cursor, latest-50 completed limit |
| Native navigation and post-save invalidation | IMPLEMENTED | Existing Detail stack, mounted read state, mutation generation shared across read surfaces |

## P1C-2A — Review authoring, encrypted drafts, explicit completion/update: IMPLEMENTED

Fresh results and remaining verification limits are recorded in [P1C-2A acceptance](evidence/p1c-2a/acceptance.md). This does not mark all P1C verified or replace historical evidence.

| Scope | Status | Evidence |
| --- | --- | --- |
| Queue → Detail → native Review editor → confirmed save → Detail → Queue | IMPLEMENTED | Existing native stack, full review payload, mounted Detail refresh and shared read invalidation |
| Local-only, diary/owner/environment-scoped Review drafts | IMPLEMENTED | Additive SQLCipher table, shared key/opening, serialized autosave/discard/confirmation, force-stop restoration |
| Single-attempt dedicated PATCH and durable uncertainty | IMPLEMENTED | Marked shared/native transport, exact pending payload, no matching-text reconciliation or automatic replay |
| Explicit stale-edit baseline adoption | IMPLEMENTED | Current server/local comparison; preflight GET is not atomic concurrency protection |
| Logout, expiry and account isolation | IMPLEMENTED | Owner epoch checks, current-owner draft cleanup only, retention on involuntary invalidation |

## Beta-R1 — Standalone Android packaging and tester readiness: IMPLEMENTED, RELEASE BLOCKED

For the Beta-R1 candidate, product scope was frozen at the existing authentication, Quick Diary/encrypted drafts, discovery/Calendar and Review authoring features. This historical candidate boundary does not limit the current full-app target. [Beta-R1 acceptance](evidence/beta-r1/acceptance.md) records fresh checks separately from the historical phase results above.

| Scope | Status | Evidence |
| --- | --- | --- |
| Clean-checkout Expo ambient type initialization | VERIFIED (host) | Original two CSS type errors reproduced without generated Expo state; installed `expo/types` reference fixes them; clean typecheck/tests/export pass |
| Standalone preview profiles, HTTPS/config validation, stable separate identity and signing guard | IMPLEMENTED | Separate EAS/local Gradle paths; regression tests; missing approved deployment/signing blocks a candidate artifact |
| First-use guidance, About/Help, explicit privacy-safe reporting and rendering recovery | IMPLEMENTED | Unit tests and limited development-VM Help evidence; actual standalone behavior pending |
| Signed APK, hosted HTTPS standalone acceptance and invitation readiness | NOT VERIFIED / BLOCKED | No approved API/support/data policy or authorized release signing configuration; no preview artifact. Baseline hosted CI success now re-observed in Beta-R2; it is not native acceptance |

See the [operator runbook](beta/release-runbook.md) and [Traditional Chinese tester guide](beta/tester-guide.md). Beta-R1 is not authorization to invite testers or publish publicly.

## Beta-R2 — Real-device candidate acceptance and blocking fixes: BLOCKED

2026-09-21 continuous Phase 1 / Phase 2 execution is recorded in [Beta-R2 acceptance](evidence/beta-r2/acceptance.md). Clean npm ci and typecheck before generation, dependencies, doctor 21/21, lint, 166 host tests, Android export and all five disposable API smokes passed. The old CSS problem did not recur. Hosted CI 35523669847 was re-observed successful for unchanged App source 940f4dd; subsequent documentation commit CI is not claimed.

Release validation and the local preview build both exit 1 at missing approved HTTPS configuration. No signed candidate exists. Operator deployment/support/data-policy approval, stable signing/version history, individual-account process, isolated HTTPS fault ingress and delivery route remain missing; device discovery found only an Android 16 x86_64 emulator, no physical devices. Exact input/security instructions and blocked artifact/core-flow/draft/owner/install-over/fault/download gates are in the evidence record. Host results do not satisfy them. No new product phase is introduced; complete these same two phases once their external prerequisites are available. No invitations or public distribution occurred.

## P1C-2B — Rescheduling and return-to-queue: PLANNED, FULL-APP PHASE F2

Verify each mutation contract and design its write-safety state machine before implementation. No rescheduling or return-to-queue controls are included in P1C-2A. A separate backend follow-up should add an atomic expected-version condition for review updates; operation receipts/idempotency would be needed for stronger outcome recovery. Neither is invented client-side.

## Remaining diary product work: PLANNED, FULL-APP PHASE F2

Full diary editing, delete workflows and templates remain unimplemented. No automatic uploads, persistent discovery cache, background synchronization or new idempotency protocol is included in P1C-1.

The full-app roadmap now includes these Diary capabilities together with transaction authoring/corrections, Trade Plans and all source authoring relations. Native push and offline synchronization have separate F6/F9 work packages and backend prerequisites; existing encrypted drafts do not establish synchronization support.

## P2 — Broader product/distribution: PLANNED, REQUIRED FOR FULL PARITY

Company/Watchlist/Thesis/Evidence, Portfolio/performance, every existing research tool, reminders/Discipline, Partners/Agent API, Articles, administration, complete settings/localization and final production delivery are required in phases F1–F10 of the full roadmap. They are not deferred until after a small Diary launch. The roadmap includes an explicit iOS delivery milestone under the provisional Android-first platform sequence. SSO is not identified as a current diary-v3 parity requirement and is not added merely because it appeared in an older broad backlog.

Private standalone packaging and acceptance from Beta-R1/Beta-R2 remain reusable release work. Missing hosting/signing/device inputs block the relevant external acceptance, not independently implementable product modules. Full completion is judged by the parity matrix and current evidence, not by beta readiness alone.

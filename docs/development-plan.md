# Development plan

Status values: **IMPLEMENTED** means code and automated checks exist; **VERIFIED** means behavior was observed at the stated evidence layer in this run; **PLANNED** is outside the current implementation.

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

## P1C — Search/Calendar/Review flows: PLANNED

Search/filter UI, Calendar and Review flows remain outside P1B. Timeline only uses the default date-desc summary query. No P1C work has started.

## P2 — Broader product/distribution: PLANNED

Watchlist, Portfolio, Tools, Articles, notifications, SSO, EAS/store distribution, iOS acceptance and production deployment remain outside this phase.

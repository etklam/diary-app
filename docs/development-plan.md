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

## P1B — Quick Diary + durable draft + reliable write semantics: PLANNED

Not started. Define owner-isolated durable drafts, safe logout/account-switch handling, and uncertain-write/duplicate prevention semantics before shipping creation. The fixture POST in the acceptance script is test setup only. No composer, editor, mutation queue, database, or background sync was added to the application.

## P1C — Search/Calendar/Review flows: PLANNED

Search/filter UI, Calendar and Review flows remain outside P1A. Timeline only uses the default date-desc summary query.

## P2 — Broader product/distribution: PLANNED

Watchlist, Portfolio, Tools, Articles, notifications, SSO, EAS/store distribution, iOS acceptance and production deployment remain outside this phase.

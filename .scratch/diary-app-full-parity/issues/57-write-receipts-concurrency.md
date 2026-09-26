# [57] Implement receipt-based writes and optimistic concurrency in the API

Status: ready-for-agent
Execution: complete (F0/F9 backend protocol and acceptance)
Type: AFK
Phase: F0/F9
Work area: diary-v3 + shared contracts
Requirements: X03, X04
Source stories: US-017, US-020, US-107

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Design and prove the backend protocol required for eligible offline submissions and safe cross-client conflict handling.

## Implementation boundary

App/service integration; apply the instructions and permissions of each repository before changing it. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Record an operation support table and additive compatibility design for Quick/content-only Diary, Diary Review and Stock Note writes.
- [x] Bind operation IDs to owner/route/payload hash and commit receipt/result atomically with mutation; concurrent duplicates return one result.
- [x] Add expected-version conflict checks where needed, authorized receipt reads, request-mismatch and retained/expired-operation semantics.
- [x] Prove prior clients keep supported behavior; Agent evidence idempotency is not reused as an unsupported global guarantee; legacy uncertain attempts are not replayed.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [01: Freeze the complete feature and behavior baseline](01-freeze-parity-baseline.md)
- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [04: Establish repeatable API and device acceptance for full parity](04-native-acceptance-harness.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/diary.ts](../../../../diary-v3/apps/api/src/diary.ts)
- [../diary-v3/apps/api/src/diary-review.ts](../../../../diary-v3/apps/api/src/diary-review.ts)
- [../diary-v3/apps/api/src/stock-notes.ts](../../../../diary-v3/apps/api/src/stock-notes.ts)
- [../diary-v3/packages/contracts/src/openapi.ts](../../../../diary-v3/packages/contracts/src/openapi.ts)

## Verification plan

Disposable PostgreSQL concurrency/rollback/commit-response-loss/receipt authorization tests and previous-client compatibility.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

F0 specification and the additive backend protocol are implemented: [offline/write contract](../../../docs/offline-write-contract.md). The `diary-v3` service advertises five receipt-enabled operations, uses owner-scoped receipts, adds ETags/version preconditions without changing strict response bodies, and advances versions on legacy Diary/Stock Note updates. App dispatch remains gated by the separate offline-outbox work. Translation/accessibility checks are not applicable to the API transport surface; locale-neutral error codes are preserved, and owner isolation is covered by the API scenarios below.

2026-09-26 disposable acceptance: `postgres:17.6-alpine` was run as `diary-app-acceptance-postgres` with `--rm`, no volume, and a loopback-only mapping at `127.0.0.1:55433`; the local test database uses the synthetic URL `postgresql://diary:diary_local@127.0.0.1:55433/diary_v3`. The backend API ran on `127.0.0.1:3101` with `NODE_ENV=test` and fixture market data. In `diary-v3`, `npm run lint`, `npm run typecheck`, and `npm test` passed: 151 files and 954 tests, including concurrent duplicate writes, rollback, ownership, version conflicts, receipt expiry and restore/migration coverage. In `diary-app`, `npm run lint`, `npm run typecheck`, and `npm test` passed with the disposable API enabled: 24 files and 214 tests, including all three previously skipped API acceptance tests. `npm run test:api:compatibility` passed current and previous client flows plus synthetic ADMIN/partner/provider checks; results are in [client-compatibility.json](../../../docs/evidence/f0/client-compatibility.json). The local timing sample is a one-record smoke check, not a load benchmark. PostgreSQL and API availability supersede the earlier “Docker unavailable” blocker recorded below.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Implemented the opt-in protocol in the adjacent `diary-v3` service. The five advertised operations are content-only Diary create/append/update, Diary Review, and user Stock Note create/update. Receipt mode rejects Diary-linked transactions, reminders, symbols, thesis/risk/execution fields; all existing requests without protocol headers retain their prior request/response body behavior. GET routes return owner-scoped ETags; old updates increment the same database-backed version. Full successful receipts are retained for 90 days and then become body-cleared tombstones through account deletion. Verification passed: `npm run typecheck`, `npm run lint`, `npm run test:unit` (702 tests), `npm run build`, `npm run contracts:generate`, `npm run contracts:check`, and `git diff --check`. `npx vitest run tests/integration/operation-receipts.test.ts` could not start because PostgreSQL refused `127.0.0.1:55433`; the integration cases are not counted as passed. Agent evidence idempotency was not modified. Conflict/rejection attempts do not reserve receipts; clients must treat returned 4xx responses as terminal and never convert old uncertain attempts into new operation IDs.

2026-09-26 acceptance follow-up: started the disposable PostgreSQL service and completed the acceptance runs recorded above. The three operation receipt integration scenarios and the prior-client compatibility pass are now verified; the earlier unavailable-database note is retained as chronological history only.

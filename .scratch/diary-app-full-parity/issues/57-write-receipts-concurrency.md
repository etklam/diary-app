# [57] Implement receipt-based writes and optimistic concurrency in the API

Status: ready-for-agent
Execution: not-started
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

- [ ] Record an operation support table and additive compatibility design for Quick/content-only Diary, Diary Review and Stock Note writes.
- [ ] Bind operation IDs to owner/route/payload hash and commit receipt/result atomically with mutation; concurrent duplicates return one result.
- [ ] Add expected-version conflict checks where needed, authorized receipt reads, request-mismatch and retained/expired-operation semantics.
- [ ] Prove prior clients keep supported behavior; Agent evidence idempotency is not reused as an unsupported global guarantee; legacy uncertain attempts are not replayed.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

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

F0 specification delivered: [offline/write contract](../../../docs/offline-write-contract.md). Backend receipts and generalized authoring implementation/acceptance remain open; no automatic replay is enabled.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

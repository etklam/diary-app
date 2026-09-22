# [15] Correct transactions and safely delete Diaries or ledger rows

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D01, D05
Source stories: US-019, US-020

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Expose historical transaction correction/removal and Diary deletion while preserving full-ledger integrity and linked records.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Keep stable IDs and unchanged instant precision when editing supported transaction fields.
- [ ] Validate the entire resulting chronology; reject edits/deletes that make later sells invalid with a useful reason.
- [ ] Diary delete uses explicit confirmation and authoritative cleanup of supported relations; cross-owner IDs remain inaccessible.
- [ ] Failed or unknown corrections preserve the original state and attempt; read-back proves atomic success or rejection.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [14: Record partial and full SELL transactions without overselling](14-sell-transactions.md)
- [16: Edit Diary-linked reminders and initial Review scheduling atomically](16-diary-linked-reminders.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/tests/integration/ledger-corrections.test.ts](../../../../diary-v3/tests/integration/ledger-corrections.test.ts)
- [../diary-v3/apps/api/src/diary.ts](../../../../diary-v3/apps/api/src/diary.ts)
- [../diary-v3/tests/e2e/ledger-corrections.spec.ts](../../../../diary-v3/tests/e2e/ledger-corrections.spec.ts)

## Verification plan

Historical reduction/deletion, concurrent sell, linked-record rollback and native confirmation/failure flows.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

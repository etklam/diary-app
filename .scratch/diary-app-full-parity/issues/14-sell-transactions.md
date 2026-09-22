# [14] Record partial and full SELL transactions without overselling

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D05, P01
Source stories: US-020, US-038, US-040

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete SELL authoring and read-back against the authoritative chronological ledger.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Allow partial/full sell with source fields and precise execution time.
- [ ] Display canonical no-holding/oversell errors while retaining input and existing stored data.
- [ ] Assert canonical remaining position and realized results after valid sells.
- [ ] Distinguish validation rejection from uncertain committed outcomes; prevent duplicate local submission.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [13: Record BUY transactions through full Diary authoring](13-buy-transactions.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/ledger.ts](../../../../diary-v3/apps/api/src/ledger.ts)
- [../diary-v3/tests/integration/sell-ledger.test.ts](../../../../diary-v3/tests/integration/sell-ledger.test.ts)
- [../diary-v3/tests/e2e/sell-ledger.spec.ts](../../../../diary-v3/tests/e2e/sell-ledger.spec.ts)

## Verification plan

BUY → partial SELL → full SELL native/API sequence; oversell, equal-instant and interrupted-response fixtures.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

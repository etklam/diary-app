# [26] Read complete holdings, costs, PnL and valuation coverage

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F4
Work area: diary-app
Requirements: P01
Source stories: US-038, US-039, US-040

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Build native Portfolio holdings from canonical server projections and shared financial fixtures.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Show quantities/costs/realized and unrealized results with exact wire values and source rounding.
- [ ] Differentiate complete, partial, stale and unavailable valuations with timestamps and coverage.
- [ ] Refresh after confirmed ledger edits and preserve sort/selection/back context.
- [ ] Missing quotes and provider errors never become zero-valued holdings or fabricated profit.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [14: Record partial and full SELL transactions without overselling](14-sell-transactions.md)
- [15: Correct transactions and safely delete Diaries or ledger rows](15-ledger-corrections-deletion.md)
- [20: Read Company quote, history and personal context](20-company-hub.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/portfolio.ts](../../../../diary-v3/apps/api/src/portfolio.ts)
- [../diary-v3/packages/domain/src/portfolio.ts](../../../../diary-v3/packages/domain/src/portfolio.ts)
- [../diary-v3/tests/e2e/portfolio.spec.ts](../../../../diary-v3/tests/e2e/portfolio.spec.ts)

## Verification plan

Same synthetic BUY/SELL/correction ledger produces matching source/native values under complete and partial quotes.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

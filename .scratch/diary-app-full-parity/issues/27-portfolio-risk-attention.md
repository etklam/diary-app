# [27] Show allocation, exposure, concentration and actionable attention

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F4
Work area: diary-app
Requirements: P02
Source stories: US-041, US-042

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete risk/context views and their source-linked attention actions.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Preserve allocation/beta/exposure/concentration formulas, grouping and missing-input meanings.
- [ ] Show relevant attention reasons and navigate to the correct Company/Thesis/Review or ledger context.
- [ ] Keep independent failures recoverable without hiding valid Portfolio data.
- [ ] Numeric labels and accessible alternatives retain meaning across themes/locales and large text.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [26: Read complete holdings, costs, PnL and valuation coverage](26-portfolio-holdings.md)
- [23: Author and progress Investment Thesis lifecycle](23-investment-thesis.md)
- [24: Review Theses and deliver the combined Review Queue](24-thesis-review-queue.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/portfolio-exposure.ts](../../../../diary-v3/apps/api/src/portfolio-exposure.ts)
- [../diary-v3/apps/api/src/portfolio-attention.ts](../../../../diary-v3/apps/api/src/portfolio-attention.ts)
- [../diary-v3/packages/domain/src/beta-allocation.ts](../../../../diary-v3/packages/domain/src/beta-allocation.ts)

## Verification plan

Shared exposure/attention fixture comparison and native issue → source record → return flow.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

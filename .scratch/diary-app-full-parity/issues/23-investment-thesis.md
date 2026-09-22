# [23] Author and progress Investment Thesis lifecycle

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F3
Work area: diary-app
Requirements: R05
Source stories: US-051, US-052, US-054

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete source thesis authoring and activation/lifecycle from Company Hub.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Create/edit supported thesis fields and preserve the original decision context.
- [ ] Execute only valid lifecycle/activation transitions with source validation.
- [ ] Protect drafts/dirty navigation and competing server edits; failures leave stored thesis intact.
- [ ] Show current versus historical/evidence context and make pending review state visible.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [20: Read Company quote, history and personal context](20-company-hub.md)
- [21: Create and maintain mutable Stock Notes](21-stock-notes.md)
- [22: Capture Evidence and read immutable Stock Timeline records](22-evidence-stock-timeline.md)
- [58: Extend encrypted draft persistence to complete-product authoring](58-encrypted-authoring-drafts.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/investment-thesis.ts](../../../../diary-v3/apps/api/src/investment-thesis.ts)
- [../diary-v3/packages/domain/src/investment-thesis.ts](../../../../diary-v3/packages/domain/src/investment-thesis.ts)
- [../diary-v3/tests/e2e/thesis.spec.ts](../../../../diary-v3/tests/e2e/thesis.spec.ts)

## Verification plan

Native create → edit → activate/lifecycle with invalid transitions and source fixture comparisons.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

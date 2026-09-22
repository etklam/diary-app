# [36] Calculate Position Sizing and save to Diary or Plan

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T06, R06
Source stories: US-083

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Deliver the source calculator with correct inputs/results and completed private handoffs.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Reuse verified sizing/risk formulas and exact source input validation.
- [ ] Guests calculate and use source copy/export actions without a private session.
- [ ] Diary/Plan handoff preserves the displayed assumptions/result and requires authenticated explicit save.
- [ ] Malformed/zero/large inputs and failed saves do not produce invalid numbers or lose work.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [31: Expose the complete public Tools directory and access model](31-public-tools-directory.md)
- [18: Create, manage and link complete Trade Plans](18-trade-plans.md)
- [25: Carry research context into Diary, Evidence and Trade Plans](25-research-authoring-handoffs.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/domain/src/position-sizing.ts](../../../../diary-v3/packages/domain/src/position-sizing.ts)
- [../diary-v3/apps/web/app/routes/position-sizing.tsx](../../../../diary-v3/apps/web/app/routes/position-sizing.tsx)

## Verification plan

Shared calculation fixtures and native guest calculation → sign in → persisted Diary/Plan handoff.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

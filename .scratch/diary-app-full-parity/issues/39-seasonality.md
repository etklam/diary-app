# [39] Read and capture the fixed Seasonality reference

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T09, R06
Source stories: US-086

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Deliver the existing monthly S&P 500 reference with accurate source and timezone labeling.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Keep the fixed dataset and its disclosed historical scope; do not imply current provider or symbol-specific data.
- [ ] Show account-timezone current/next month, twelve-month chart/table and source interpretation.
- [ ] Copy localized Markdown and save supported research destinations with the displayed values.
- [ ] Guest use, missing account timezone and locale/theme changes preserve coherent results.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [31: Expose the complete public Tools directory and access model](31-public-tools-directory.md)
- [25: Carry research context into Diary, Evidence and Trade Plans](25-research-authoring-handoffs.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/domain/src/seasonality.ts](../../../../diary-v3/packages/domain/src/seasonality.ts)
- [../diary-v3/apps/web/app/routes/seasonality.tsx](../../../../diary-v3/apps/web/app/routes/seasonality.tsx)

## Verification plan

Fixed-data/month-boundary fixtures and native guest/read/copy/capture flow.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

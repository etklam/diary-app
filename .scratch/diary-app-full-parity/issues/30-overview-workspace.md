# [30] Compose the complete daily Overview workspace

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F4
Work area: diary-app
Requirements: P04
Source stories: US-023, US-026, US-027

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Present actionable due work, reviews, recent decisions/plans and Portfolio/Watchlist context in one native home.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Use existing bounded projections rather than duplicate business calculations or unbounded data loads.
- [ ] Each section has accurate loading/empty/partial/error/retry behavior independent of the others.
- [ ] Every attention/review/plan/Diary/company action reaches an implemented destination and restores context on return.
- [ ] Respect preferred landing page, account timezone and first-use state; do not confuse pending with absent data.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [12: Complete Library, Timeline and Calendar navigation parity](12-diary-library-calendar.md)
- [18: Create, manage and link complete Trade Plans](18-trade-plans.md)
- [19: Manage stock Watchlist and enter Company research](19-stock-watchlist.md)
- [24: Review Theses and deliver the combined Review Queue](24-thesis-review-queue.md)
- [27: Show allocation, exposure, concentration and actionable attention](27-portfolio-risk-attention.md)
- [28: Analyze strategy performance and transaction history](28-strategy-performance.md)
- [44: Manage one-off and recurring Diary reminders](44-diary-reminders.md)
- [45: Configure and rearm complete Price Alerts](45-price-alerts.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/web/app/routes/home.tsx](../../../../diary-v3/apps/web/app/routes/home.tsx)
- [../diary-v3/tests/e2e/overview.spec.ts](../../../../diary-v3/tests/e2e/overview.spec.ts)
- [../diary-v3/tests/e2e/daily-workspace.spec.ts](../../../../diary-v3/tests/e2e/daily-workspace.spec.ts)

## Verification plan

Mixed synthetic workspace plus partial endpoint failure and native follow-up/drill-down journeys.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

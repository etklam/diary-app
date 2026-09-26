# [33] Read Market State, breadth and confirmation with data quality

Status: ready-for-agent
Execution: in-progress (contract/API coverage and Android bundle complete; native screen acceptance pending)
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T03
Source stories: US-077, US-082, US-089

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Expose the existing market-state projections without translating unknown/warmup data into reassuring signals.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Retain market regime, sector breadth, supporting confirmation and separate observation dates.
- [ ] Show stale/partial/unknown/warmup and absent-snapshot states from contracts.
- [x] Use the existing persisted/job-generated source; app never embeds provider credentials or schedules a duplicate job.
- [ ] Provide localized interpretation and accessible underlying values with independent read retries; screen/TalkBack acceptance remains pending.
- [x] Apply relevant PRD invariants and common translation/owner-isolation rules; public state has no per-user data. Screen accessibility is still pending runtime review.
- [x] Record actual commands/scenarios, source/build and results. Native screen acceptance remains explicitly open.

## Blocked by

Dependencies satisfied: [31](31-public-tools-directory.md) and [02](02-shared-package-compatibility.md).

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/market-state-routes.ts](../../../../diary-v3/apps/api/src/market-state-routes.ts)
- [../diary-v3/packages/contracts/src/market-state.ts](../../../../diary-v3/packages/contracts/src/market-state.ts)
- [../diary-v3/tests/unit/market-state.test.ts](../../../../diary-v3/tests/unit/market-state.test.ts)

## Verification plan

Controlled complete/warmup/missing state payloads and native guest rendering/refresh.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

See [Market State acceptance evidence](../../../docs/evidence/f5/market-state-acceptance.md). API and shared-source HTTP tests cover guest, missing, stale, under-covered and unknown states. Native route interaction remains open. Per-sector breadth is not part of the source snapshot contract and is covered by #34's scope comparisons.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Added a guest Market State view to the existing public market tool route, with independent snapshot/history reads and retries, freshness/coverage/warmup messaging, per-date support metrics and localized unknown-state guidance. Unit, local API, source PostgreSQL HTTP and Android bundle checks passed. The AVD currently waits in Expo Dev Launcher for Metro, so native screen/TalkBack review remains pending.

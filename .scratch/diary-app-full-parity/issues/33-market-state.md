# [33] Read Market State, breadth and confirmation with data quality

Status: ready-for-agent
Execution: not-started
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
- [ ] Use the existing persisted/job-generated source; app never embeds provider credentials or schedules a duplicate job.
- [ ] Provide localized interpretation and accessible underlying values with independent read retries.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [31: Expose the complete public Tools directory and access model](31-public-tools-directory.md)
- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/market-state-routes.ts](../../../../diary-v3/apps/api/src/market-state-routes.ts)
- [../diary-v3/packages/contracts/src/market-state.ts](../../../../diary-v3/packages/contracts/src/market-state.ts)
- [../diary-v3/tests/unit/market-state.test.ts](../../../../diary-v3/tests/unit/market-state.test.ts)

## Verification plan

Controlled complete/warmup/missing state payloads and native guest rendering/refresh.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

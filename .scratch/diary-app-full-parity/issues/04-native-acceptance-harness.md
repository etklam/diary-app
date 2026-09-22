# [04] Establish repeatable API and device acceptance for full parity

Status: ready-for-agent
Execution: complete (F0 foundation scope)
Type: AFK
Phase: F0
Work area: diary-app
Requirements: X04, X05
Source stories: US-113, US-114

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Extend the current verification setup so each product slice can demonstrate persisted API outcomes and real native behavior.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Reuse disposable diary-v3 PostgreSQL fixtures with synthetic USER/ADMIN/partner accounts and controlled providers.
- [x] Define native interaction automation where practical and reproducible manual device steps where required, with exact build identification.
- [x] Make runtime, API, host and artifact evidence distinct; test helpers must not enter distributable builds.
- [x] Prove the harness using existing session restore, Quick save and encrypted draft reopen flows; preserve existing checks.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [package.json](../../../package.json)
- [tests/api/quick-api.test.ts](../../../tests/api/quick-api.test.ts)
- [tests/unit/native-session.test.ts](../../../tests/unit/native-session.test.ts)
- [docs/evidence/beta-r2/acceptance.md](../../../docs/evidence/beta-r2/acceptance.md)

## Verification plan

Fresh host checks and one disposable API/native tracer, with cleanup and recorded limitations.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted at the explicitly recorded layers: [F0 evidence](../../../docs/evidence/f0/acceptance.md). Fresh rebuilt-APK full tracer and five cold restores pass. Host/API performance baselines exclude future native chart rendering; guest workflows, full-screen preferences and full spoken accessibility remain their later module tickets. The earlier development reload crash is not declared fixed and remains tracked in ticket 65. Operator/release inputs remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

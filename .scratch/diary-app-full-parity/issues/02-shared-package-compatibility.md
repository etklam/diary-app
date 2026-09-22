# [02] Align shared packages and prove previous-client compatibility

Status: ready-for-agent
Execution: complete (F0 foundation scope)
Type: AFK
Phase: F0
Work area: diary-app + diary-v3
Requirements: X04
Source stories: US-104, US-106, US-107, US-108

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Compare vendored packages with the frozen diary-v3 contracts and ship reproducible portable artifacts used by a real native read/write tracer.

## Implementation boundary

App/service integration; apply the instructions and permissions of each repository before changing it. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Review generated contract/schema differences, including exact time/holiday helpers and missing portable exports; no blind replacement.
- [x] Record package provenance/hashes and verify native packages contain no DOM, database or server runtime dependencies.
- [x] Run existing login, Diary read/write and Review flows against the selected API with updated packages.
- [x] Retain a prior-client fixture and reject incompatible in-place contract changes; document additive endpoint/version strategy.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [01: Freeze the complete feature and behavior baseline](01-freeze-parity-baseline.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [vendor/shared-packages/manifest.json](../../../vendor/shared-packages/manifest.json)
- [docs/shared-packages.md](../../../docs/shared-packages.md)
- [../diary-v3/packages/contracts/src/openapi.ts](../../../../diary-v3/packages/contracts/src/openapi.ts)
- [../diary-v3/packages/domain/package.json](../../../../diary-v3/packages/domain/package.json)

## Verification plan

Clean app install/typecheck/export plus portable-boundary and disposable previous/current-client compatibility tests.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted at the explicitly recorded layers: [F0 evidence](../../../docs/evidence/f0/acceptance.md). Fresh rebuilt-APK full tracer and five cold restores pass. Host/API performance baselines exclude future native chart rendering; guest workflows, full-screen preferences and full spoken accessibility remain their later module tickets. The earlier development reload crash is not declared fixed and remains tracked in ticket 65. Operator/release inputs remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

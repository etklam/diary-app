# [01] Freeze the complete feature and behavior baseline

Status: ready-for-agent
Execution: complete (F0 foundation scope)
Type: AFK
Phase: F0
Work area: diary-app
Requirements: X04
Source stories: US-114

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Create a reproducible operation inventory for the complete app without treating source route counts or old acceptance as proof of parity.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Record both source commits, relevant worktree changes and sanitized hashes; exclude secrets, dependencies and real data.
- [x] Map all 51 capability IDs, 114 source stories, 52 routes and non-route operations to native or explicit Web/service homes; record later source additions.
- [x] Attach roles, contracts, success/failure behavior and runnable synthetic examples to each operation; resolve documentation/code disagreements explicitly.
- [x] Measure representative list/chart/authoring baselines and record practical device/performance budgets for later regression.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

None. This ticket may start immediately within its stated role.

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [docs/feature-parity.md](../../../docs/feature-parity.md)
- [../diary-v3/apps/web/app/routes.ts](../../../../diary-v3/apps/web/app/routes.ts)
- [../diary-v3/.scratch/diary-v3-rebuild/PRD.md](../../../../diary-v3/.scratch/diary-v3-rebuild/PRD.md)

## Verification plan

Inventory audit: no unmapped requirement/route/story; source manifest reproduces the selected baseline.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted at the explicitly recorded layers: [F0 evidence](../../../docs/evidence/f0/acceptance.md). Fresh rebuilt-APK full tracer and five cold restores pass. Host/API performance baselines exclude future native chart rendering; guest workflows, full-screen preferences and full spoken accessibility remain their later module tickets. The earlier development reload crash is not declared fixed and remains tracked in ticket 65. Operator/release inputs remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

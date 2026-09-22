# [03] Design and implement the complete native navigation shell

Status: ready-for-agent
Execution: complete (F0 foundation scope)
Type: AFK
Phase: F0
Work area: diary-app
Requirements: A04, C01
Source stories: US-098, US-099, US-100, US-102, US-103

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Define a native layout and ship the shell around the existing working Diary journey, with homes for every complete-product module.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Record typography, spacing, color, large-text, table/chart and form interaction rules before module UI work.
- [x] Implement Overview/Diary/Portfolio/Research/More navigation and global Quick access, retaining existing drafts and Back context.
- [x] Guest, USER and ADMIN destinations reflect actual session/role; navigation is not an authorization boundary.
- [x] Map future destinations without advertising unfinished workflows as working; test safe areas, screen-reader navigation and narrow screens.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [01: Freeze the complete feature and behavior baseline](01-freeze-parity-baseline.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/app/_layout.tsx](../../../src/app/_layout.tsx)
- [src/app/(private)/(tabs)/_layout.tsx](../../../src/app/(private)/(tabs)/_layout.tsx)
- [../diary-v3/apps/web/app/routes.ts](../../../../diary-v3/apps/web/app/routes.ts)

## Verification plan

Native login → Timeline → Quick → Detail → Back tracer; visual/accessibility review in light/dark and large text.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted at the explicitly recorded layers: [F0 evidence](../../../docs/evidence/f0/acceptance.md). Fresh rebuilt-APK full tracer and five cold restores pass. Host/API performance baselines exclude future native chart rendering; guest workflows, full-screen preferences and full spoken accessibility remain their later module tickets. The earlier development reload crash is not declared fixed and remains tracked in ticket 65. Operator/release inputs remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

# [66] Publish and support the accepted complete Android app

Status: ready-for-human
Execution: not-started
Type: HITL
Phase: F10
Work area: operator
Requirements: X05
Source stories: US-114

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete owner-controlled store setup and publication only for the fully accepted Android artifact.

## Implementation boundary

Operator decisions, evidence and authorized release actions. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Provide finalized naming/screenshots/description/declarations, reviewer access and actual support/privacy resources.
- [ ] Verify current Play account testing/eligibility and submission requirements; track review outcome and approved version.
- [ ] Release only accepted bytes/config and confirm real install/account/core journeys; monitor service and support after launch.
- [ ] Have a tested higher-version corrective-release path preserving data; distinguish submitted/reviewing/live rather than claiming release early.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [65: Accept all full-product journeys on the Android release candidate](65-full-android-parity-acceptance.md)
- [69: Record platform order and release-owner product decisions](69-platform-release-decision.md)
- [05: Supply release, hosting, provider and device inputs](05-operator-release-inputs.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [eas.json](../../../eas.json)
- [docs/beta/release-runbook.md](../../../docs/beta/release-runbook.md)
- [docs/launch-roadmap.md](../../../docs/launch-roadmap.md)

## Verification plan

Store/build records, real distribution/install verification and launch monitoring/handoff; no automatic publication from this ticket draft.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

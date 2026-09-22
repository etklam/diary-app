# [70] Publish and support the accepted complete iOS app

Status: ready-for-human
Execution: not-started
Type: HITL
Phase: iOS
Work area: operator
Requirements: X05
Source stories: US-114

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete owner-controlled App Store preparation and release of the accepted iOS product.

## Implementation boundary

Operator decisions, evidence and authorized release actions. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Confirm current App Store submission/privacy/account requirements, assets, reviewer access and authorized signing.
- [ ] Submit the accepted artifact and record actual review/publication status; correct rejection causes through tracked changes.
- [ ] Verify live installation, account/notification/core workflows and operational support for iOS users.
- [ ] Retain source/build identity and a tested data-preserving corrective update path.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [68: Complete iOS feature parity and full-device acceptance](68-ios-full-parity-acceptance.md)
- [69: Record platform order and release-owner product decisions](69-platform-release-decision.md)
- [64: Complete account recovery, deletion access and accurate support/privacy](64-account-data-support.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [app.config.ts](../../../app.config.ts)
- [eas.json](../../../eas.json)
- [docs/launch-roadmap.md](../../../docs/launch-roadmap.md)

## Verification plan

Store release record and physical-device distribution smoke; publication is a separate operator action.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

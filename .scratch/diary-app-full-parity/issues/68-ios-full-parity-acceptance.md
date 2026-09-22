# [68] Complete iOS feature parity and full-device acceptance

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: iOS
Work area: diary-app
Requirements: A04, X01, X02, X03, X04, X05
Source stories: US-098, US-099, US-100, US-101, US-103, US-114

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Resolve identified platform differences and prove the same complete product on iOS.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Run every capability and all PRD journeys against the iOS release candidate; no module becomes Android-only silently.
- [ ] Verify notifications, native navigation/keyboard, file imports/exports, safe links, accessibility and long/wide content.
- [ ] Exercise real install-over/schema migration, offline/legacy attempts, key persistence and account switching.
- [ ] Record iOS-specific source/artifact/device evidence and fix release-critical findings before store delivery.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [67: Build and verify the iOS native runtime foundation](67-ios-native-foundation.md)
- [65: Accept all full-product journeys on the Android release candidate](65-full-android-parity-acceptance.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [docs/feature-parity.md](../../../docs/feature-parity.md)
- [app.config.ts](../../../app.config.ts)
- [docs/launch-roadmap.md](../../../docs/launch-roadmap.md)

## Verification plan

Physical iOS full-product acceptance plus controlled API/upgrade/fault scenarios; Android results are only comparison evidence.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

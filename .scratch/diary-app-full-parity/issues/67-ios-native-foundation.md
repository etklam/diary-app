# [67] Build and verify the iOS native runtime foundation

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: iOS
Work area: diary-app
Requirements: X04, X05, X01, X02
Source stories: US-104, US-105, US-108

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Create an actual iOS build and validate platform adapters before claiming cross-platform completion.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Use authorized Apple/build inputs and native Expo 57 modules; retain portable app/domain code.
- [ ] Verify SecureStore/SQLCipher, lifecycle, backup exclusions and token/draft behavior in simulator and physical runtime.
- [ ] Implement/test iOS mutation-network safety rather than assuming the Android HTTP interceptor applies.
- [ ] Probe notification credentials/permission/taps, links, file/share and layout differences; record concrete platform gaps.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [03: Design and implement the complete native navigation shell](03-native-navigation-design.md)
- [04: Establish repeatable API and device acceptance for full parity](04-native-acceptance-harness.md)
- [05: Supply release, hosting, provider and device inputs](05-operator-release-inputs.md)
- [69: Record platform order and release-owner product decisions](69-platform-release-decision.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [app.config.ts](../../../app.config.ts)
- [src/quick/native-storage.ts](../../../src/quick/native-storage.ts)
- [plugins/with-single-attempt-writes.cjs](../../../plugins/with-single-attempt-writes.cjs)

## Verification plan

Signed iOS simulator/device auth → Diary → draft reopen tracer and controlled response-loss proof; failures become bounded fixes.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

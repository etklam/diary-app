# [31] Expose the complete public Tools directory and access model

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T01, A04
Source stories: US-098, US-102

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Provide a guest-accessible research directory with consistent routing to the source tool capabilities.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] List all source tools with localized descriptions, current capability state and stable navigation.
- [ ] No private session/API call is a prerequisite for public calculation/read/export/download.
- [ ] Private save actions preserve tool state through safe login and require explicit confirmation.
- [ ] Retain invalid-credential fail-closed behavior; guest absence is distinct from bad credentials.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [03: Design and implement the complete native navigation shell](03-native-navigation-design.md)
- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/docs/tools-access-matrix.md](../../../../diary-v3/docs/tools-access-matrix.md)
- [../diary-v3/apps/web/app/routes/tools.tsx](../../../../diary-v3/apps/web/app/routes/tools.tsx)

## Verification plan

Guest and signed-in directory/access tests and public tool → login → deliberate private-action tracer.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

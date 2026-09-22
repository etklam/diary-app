# [08] Implement complete preferences, localization and themes

Status: ready-for-agent
Execution: done
Type: AFK
Phase: F1
Work area: diary-app
Requirements: A03, A04
Source stories: US-006, US-007, US-008, US-099

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Read and edit the full settings schema and make preferences affect the native experience consistently.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Support name, timezone, zh-TW/zh-CN/en, theme, default workspace and all investment preferences including holiday exclusion.
- [x] Preserve exact decimal and zero preference values through read/edit/save; account-local dates never silently use UTC.
- [x] Persist settings and session-aware refresh without overwriting unsaved edits on late responses.
- [x] Provide reusable translated text/theme behavior and accessibility baselines required by every later module.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/contracts/src/settings.ts](../../../../diary-v3/packages/contracts/src/settings.ts)
- [src/app/(private)/(tabs)/account.tsx](../../../src/app/(private)/(tabs)/account.tsx)
- [src/constants/theme.ts](../../../src/constants/theme.ts)

## Verification plan

Settings round trip, locale/theme restart, timezone edges and decimal/zero validation on native screens.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted 2026-09-23 within F1 scope. See [native design](../../../docs/f1-design.md), [commands and scenarios](../../../docs/f1-acceptance.md) and [layered acceptance evidence](../../../docs/evidence/f1/acceptance.md). Lint, TypeScript, 182 host tests, three disposable API cases, two source realtime cases, Android export and all three native tracers passed. Signed standalone, physical-device and iOS acceptance remain release tickets.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

# [09] Render safe rich Markdown in Diary Detail

Status: ready-for-agent
Execution: done
Type: AFK
Phase: F1–F2
Work area: diary-app
Requirements: D02, A04
Source stories: US-012, US-092, US-100, US-103

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Replace plain-body reading with a reusable native Markdown renderer first exercised by existing Diary Detail.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Render source-supported headings, lists, links, images, code and wide tables without executing arbitrary HTML.
- [x] Links use validated native routing/external handling and retain an accessible text alternative on failures.
- [x] Long content, missing images, code/table scrolling and both themes remain usable at large text sizes.
- [x] Keep stored Markdown unchanged and expose the same renderer to later previews/articles.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [03: Design and implement the complete native navigation shell](03-native-navigation-design.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/app/(private)/diaries/[id].tsx](../../../src/app/(private)/diaries/[id].tsx)
- [../diary-v3/apps/web/app/markdown.tsx](../../../../diary-v3/apps/web/app/markdown.tsx)
- [../diary-v3/tests/e2e/markdown-typography.spec.ts](../../../../diary-v3/tests/e2e/markdown-typography.spec.ts)

## Verification plan

Untrusted/long Markdown fixtures, link failures and native visual/accessibility reading checks.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

Accepted 2026-09-23 within F1 scope. See [native design](../../../docs/f1-design.md), [commands and scenarios](../../../docs/f1-acceptance.md) and [layered acceptance evidence](../../../docs/evidence/f1/acceptance.md). Lint, TypeScript, 182 host tests, three disposable API cases, two source realtime cases, Android export and all three native tracers passed. Signed standalone, physical-device and iOS acceptance remain release tickets.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

# [11] Complete Quick templates, related context and append behavior

Status: ready-for-agent
Execution: complete (live API, unit, Android 16/API 36 template/context, encrypted-snippet restart, save and source-return acceptance passed; see [F2 Quick acceptance](../../../docs/evidence/f2/quick-templates-context-acceptance.md))
Type: AFK
Phase: F2
Work area: diary-app
Requirements: D03, X01
Source stories: US-015, US-016, US-017

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Extend the working Quick flow with the source templates/snippets and relevant context while preserving its write-safety guarantees.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Support free writing and existing localized templates/snippets without discarding edited content.
- [x] Show source-defined related-trade/context and recent input conveniences, retaining selected date/symbols.
- [x] Existing encrypted drafts take precedence until the user chooses; template/context changes cannot overwrite them silently.
- [x] Concurrent same-day append preserves existing content/relations; save confirmation and source return remain explicit.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [src/quick/controller.ts](../../../src/quick/controller.ts)
- [../diary-v3/packages/domain/src/quick-template.ts](../../../../diary-v3/packages/domain/src/quick-template.ts)
- [../diary-v3/tests/e2e/quick-related-trades.spec.ts](../../../../diary-v3/tests/e2e/quick-related-trades.spec.ts)

## Verification plan

Template/free-writing/restore flows and concurrent append/replaced-response tests with canonical read-back.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

See [F2 Quick acceptance](../../../docs/evidence/f2/quick-templates-context-acceptance.md) for commands, API race/read-back results, Android 16/API 36 runtime scenarios, bundle hash, evidence artifacts and the provider/TalkBack/device limits.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Added localized source templates, merge/replace safeguards, SQLCipher-backed account snippets/recent tags, recent closed-trade and SPX context integration, explicit save confirmation/source return, and same-day concurrent append verification. Live disposable-PostgreSQL and AVD acceptance passed. The SPX provider was unavailable in this run; manual localized context remains usable, while a valid response is covered by the typed unit fixture.

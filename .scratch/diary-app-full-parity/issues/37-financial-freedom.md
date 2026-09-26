# [37] Run the Financial Freedom and FIRE calculator

Status: ready-for-agent
Execution: in-progress (shared formula/input checks and Android bundle complete; native interaction/accessibility pending)
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T07
Source stories: US-084

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Port the complete source assumptions, projections and available output actions to native.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [x] Preserve formula and scenario semantics using the reviewed portable shared-domain export.
- [x] Validate inputs and distinguish assumptions from factual market data; overflow does not produce numeric results.
- [ ] Render results/charts with accessible values and all source output actions.
- [ ] Locale/theme/large text and edge cases remain usable without a mandatory account.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. Native use remains explicitly open.

## Blocked by

Dependencies satisfied: [31](31-public-tools-directory.md) and [08](08-preferences-localization.md).

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/domain/src/fire.ts](../../../../diary-v3/packages/domain/src/fire.ts)
- [../diary-v3/apps/web/app/routes/fire.tsx](../../../../diary-v3/apps/web/app/routes/fire.tsx)
- [../diary-v3/tests/unit/fire.test.ts](../../../../diary-v3/tests/unit/fire.test.ts)

## Verification plan

Source FIRE fixture comparison and native guest input/result/output scenarios.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

See [Financial Freedom acceptance evidence](../../../docs/evidence/f5/financial-freedom-acceptance.md). Shared formula parity, input boundaries and Android bundle passed. Native calculator, copy and accessibility interaction remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Added the guest calculator to the public Financial Freedom tool route using the vendored source formula and presets. Added localized assumptions/results, exact input bounds, scenario bands, no-persistence disclosure, accessible projection table, copyable Markdown and an overflow-without-result state. Unit and source-formula checks plus full app verification passed. AVD input/copy/TalkBack acceptance remains pending.

2026-09-27: Reviewed the complete source route and repaired remaining export/input details: manually selectable Markdown is available before a copy failure, the custom preset label is localized in export, clipboard completion is tied to the copied result, and projection accessibility labels pair every value with its column. Pasted whitespace cannot silently become zero for required fields; optional blank age remains unknown; non-decimal JavaScript number syntax is rejected. App FIRE tests now pass 18 cases (including all three localized exports), source FIRE tests pass 18 cases, focused ESLint and full TypeScript pass. The calculator has no API/backend operation. Native acceptance remains open while the shared AVD is reserved for another ticket; no device result is claimed here.

# [43] Import, export and publicly share selected Discipline

Status: ready-for-agent
Execution: in-progress (shared-contract/API acceptance and Android bundle complete; native file/share/continuation acceptance and canonical web origin pending)
Type: AFK
Phase: F6
Work area: diary-app
Requirements: N04
Source stories: US-064, US-065

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Complete the JSON/file and public-link round trip with preview before private import.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Read source JSON via native file/text input and show accepted/skipped/invalid preview without writing.
- [ ] Apply source merge/dedup semantics only after explicit import; export selected content and optional permitted attribution.
- [ ] Open/share public links safely and preserve guest login continuation before import.
- [ ] Clipboard/file denial or uncertain import retains a usable selection and avoids duplicating content.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [42: Create, reorder and randomly review Discipline entries](42-discipline-management.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/packages/contracts/src/discipline-share.ts](../../../../diary-v3/packages/contracts/src/discipline-share.ts)
- [../diary-v3/apps/web/app/routes/discipline-share.tsx](../../../../diary-v3/apps/web/app/routes/discipline-share.tsx)
- [../diary-v3/tests/e2e/discipline-share.spec.ts](../../../../diary-v3/tests/e2e/discipline-share.spec.ts)

## Verification plan

Export → OS share/link → guest preview → authenticated import, including malformed input and duplicate import.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

See [Discipline transfer acceptance evidence](../../../docs/evidence/f6/discipline-transfer-acceptance.md). Unit validation, source API round-trip, owner isolation, lint/typecheck, Expo dependency validation, and Android static export passed. Native file/share/clipboard/runtime acceptance and a canonical public website origin remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Implemented the native JSON/file preview, selected-row export, optional attribution, OS JSON-file/link sharing, public native preview route, guest login continuation, explicit append/replacement, and uncertain-import reconciliation. Disposable PostgreSQL API acceptance passed for export, append, replacement and owner isolation. Native permission/share/accessibility flows were not run because the available AVD development client still waits for Metro and no physical device is available. #05 does not yet record a canonical web origin, so only the native app preview link is emitted pending that release input. Exact commands and bundle hash are in the evidence document.

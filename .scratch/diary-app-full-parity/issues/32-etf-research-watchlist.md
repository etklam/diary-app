# [32] Deliver ETF research and the personal ETF Watchlist

Status: ready-for-agent
Execution: in-progress (API/model coverage and Android bundle complete; native screen acceptance pending)
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T02
Source stories: US-075, US-076

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Read source ETF profiles/analysis and manage the separate personal research Watchlist.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Show profile, quote, risk, valuation and relative-return data with correct source timestamps/status.
- [ ] Support authenticated ETF Watchlist add/read/remove without altering stock ledger holdings.
- [x] Keep guest research functional and preserve unavailable quote and catalog recovery.
- [ ] Render wide/long research data accessibly with precise numeric labels.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. Native screen acceptance is explicitly still open.

## Blocked by

Dependencies satisfied: [31](31-public-tools-directory.md) and [08](08-preferences-localization.md).

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/etf-profile.ts](../../../../diary-v3/apps/api/src/etf-profile.ts)
- [../diary-v3/apps/api/src/etf-watchlist.ts](../../../../diary-v3/apps/api/src/etf-watchlist.ts)
- [../diary-v3/tests/e2e/etf-research.spec.ts](../../../../diary-v3/tests/e2e/etf-research.spec.ts)

## Verification plan

Guest research and user Watchlist round trips under partial quotes/catalog failure.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

See [ETF research acceptance evidence](../../../docs/evidence/f5/etf-research-acceptance.md). API, owner isolation, null/partial/unavailable handling, source timestamps, stock-holdings separation, unit checks and Android bundle passed. Device-level presentation and accessibility remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Implemented public ETF research and a distinct private ETF Watchlist, including guest access, bounded benchmark/period choices, per-field null/source timestamps, owner fencing, duplicate/catalog error states and uncertain-write reconciliation. The disposable API acceptance passed against the source E2E harness; the exact command, assertions and build are in the evidence document. Android UI/TalkBack acceptance remains pending because the installed AVD development client is waiting for Metro; bundle output is not counted as runtime acceptance.

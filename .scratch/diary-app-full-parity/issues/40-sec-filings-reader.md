# [40] Search SEC companies and read filings and document lists

Status: ready-for-agent
Execution: in-progress (SEC contract/routes, fixture API acceptance and Android bundle complete; native search/browser/detail acceptance pending)
Type: AFK
Phase: F5
Work area: diary-app
Requirements: T10
Source stories: US-087, US-089

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Implement guest SEC company search, filing filters and complete filing/document detail.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Validate/canonicalize source identifiers and preserve search/filter/pagination semantics.
- [ ] Show filing metadata, original document links and bounded detail views with accessible content.
- [ ] Handle provider unavailable/rate limit and stale/partial results using server contracts.
- [ ] Retain selected company/filing context across links and avoid mixing late responses.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [31: Expose the complete public Tools directory and access model](31-public-tools-directory.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/apps/api/src/sec-filings.ts](../../../../diary-v3/apps/api/src/sec-filings.ts)
- [../diary-v3/packages/contracts/src/sec-filings.ts](../../../../diary-v3/packages/contracts/src/sec-filings.ts)
- [../diary-v3/tests/e2e/sec-filings.spec.ts](../../../../diary-v3/tests/e2e/sec-filings.spec.ts)

## Verification plan

Controlled SEC fixtures for search → filter → filing → original document, error and route-restoration cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

See [SEC filing acceptance evidence](../../../docs/evidence/f5/sec-filings-acceptance.md). Identifier/filter tests, source fixture API integration, full app verification and Android static export passed. Native search, filtering, detail routing and external document opening remain untested on-device.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

2026-09-26: Added guest company search, contract-validated filing filters and cursor pagination, cache freshness states, canonical detail navigation, and safe links to official SEC documents. The source SEC HTTP integration passed against its synthetic provider. The running API on port 3101 returned HTTP 500 SYS_INTERNAL_ERROR for SEC company search; this is recorded as an environment/server observation and is not counted as provider success. AVD browser handoff, route restoration and TalkBack checks remain pending because its development client is waiting for Metro and there is no physical device. Bundle hash and commands are in the evidence document.

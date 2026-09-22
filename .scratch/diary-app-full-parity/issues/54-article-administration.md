# [54] Author and manage the complete article publishing lifecycle

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F8
Work area: diary-app
Requirements: C03, X01
Source stories: US-093, US-094, US-095

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Let administrators complete draft/edit/preview/publish/archive/delete and bulk article operations natively.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Preserve source fields/search and draft/published/archived lifecycle, including update/republish and confirmed bulk actions.
- [ ] Encrypted draft recovery stores authoring content, not a fabricated publication state; merge onto current server state.
- [ ] Safe preview, dirty navigation and failure/uncertainty retain work without inventing a public URL.
- [ ] Ordinary users are denied by API and navigation; server role changes take effect on subsequent actions.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [53: Read public articles, About and complete product guidance](53-public-articles-guide.md)
- [58: Extend encrypted draft persistence to complete-product authoring](58-encrypted-authoring-drafts.md)
- [07: Change password and revoke all sessions from the app](07-account-security.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [../diary-v3/docs/design/article-publishing-acceptance.md](../../../../diary-v3/docs/design/article-publishing-acceptance.md)
- [../diary-v3/apps/web/app/routes/admin-blog.tsx](../../../../diary-v3/apps/web/app/routes/admin-blog.tsx)
- [../diary-v3/apps/api/src/posts.ts](../../../../diary-v3/apps/api/src/posts.ts)

## Verification plan

Admin create/preview/publish/public read/archive/republish/bulk flows plus role-downgrade and interrupted-save cases.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

# [31] Expose the complete public Tools directory and access model

Status: ready-for-agent
Execution: done (public directory and access boundary)
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

- [x] List all source tools with localized descriptions, current capability state and stable navigation.
- [x] Directory and status routes are guest-accessible and make no private API call a prerequisite. Public tool operations are verified by their owning tool tickets.
- [x] No private save action exists on the directory or status routes; save handoff and confirmation are verified by the owning tool tickets when those actions are implemented.
- [x] Retain invalid-credential fail-closed behavior; guest absence is distinct from bad credentials.
- [x] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [x] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

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

See [Tools directory acceptance](../../../../docs/evidence/f5/tools-directory-acceptance.md). The directory and public access boundary are complete. Tool behavior and save handoffs belong to their owning implementation tickets; spoken TalkBack review remains part of full-platform acceptance.

## Implementation evidence

- Added a public native directory for the seven source-defined tools and stable `/tools/{slug}` status routes. Names, purposes and status copy are available in English, Traditional Chinese and Simplified Chinese. All entries truthfully report that the native tool workflow is unavailable; the directory and status routes do not call private account APIs or require a session.
- Added entry links on sign-in and guest start screens. Invalid tool slugs return to the directory. Private save actions are not offered until a tool and its dependent handoff are implemented.
- Source inventory checked against `diary-v3/apps/web/app/tool-shell.tsx` and `docs/tools-access-matrix.md`. `npx vitest run tests/unit/public-tools.test.ts` passed (2 tests: complete unique slug inventory and all supported locales); `npm run lint`, `npm run typecheck`, and `npm run android:bundle` passed. The bundle contains both directory and dynamic detail routes.
- The directory's public navigation is not session-gated. Existing guest/credential behavior remains covered by accepted ticket #06; this change does not alter credential handling. Owner-isolation checks do not apply to this public static catalog.
- Criteria for working public calculations/reads/exports/downloads and preserving live tool state through an authenticated save remain open because no native tool workflow or private handoff is available yet. Screen-reader and device navigation review is also pending.
- Fresh native smoke on 2026-09-26: `npm run android:build` succeeded (478 Gradle tasks) after supplying the installed SDK path to that process only. APK SHA-256: `06f18bc515fd16d043e7c4c3d412ca95b8250c906e652d2f286c3cc6822541ee`. On the Android 16/API 36 `DiaryApp_API_36` emulator (`emulator-5554`), unauthenticated sign-in → Explore public tools opened the directory; UIAutomator observed all seven stable tool IDs across scroll, clickable nodes with localized accessible labels, and the SEC filings status route. Opening `diaryapp://tools/unknown` returned to the Tools directory. The SEC route states it is public and does not require sign-in. This did not test calculation/read/download functionality or private API traffic; TalkBack is installed but no spoken TalkBack session or physical-device review was performed.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

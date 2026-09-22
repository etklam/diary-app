# Issue breakdown and common delivery rules

Feature: diary-app-full-parity
Date: 2026-09-22

[PRD](PRD.md) · [Issue index](ISSUES.md)

## Tracker and triage conventions

Use `.scratch/diary-app-full-parity/PRD.md` as the parent and `issues/NN-slug.md` for tickets. This adopts diary-v3's local Markdown workflow; these are not remotely published GitHub issues.

| Field | Values / meaning |
| --- | --- |
| Status | `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix` |
| Execution | `not-started`, `in-progress`, `blocked`, `done` |
| Type | `AFK` for specified agent implementation/verification; `HITL` for explicit operator decisions or publication |
| Requirements | Stable IDs from the PRD and parity matrix |
| Source stories | Numbered source PRD stories; links establish traceability, not runtime completion |
| Blocked by | Direct required ticket outputs; transitive predecessors are also required |

A ready triage label describes the specification. It does not override dependencies or supply missing credentials. Mark an active task blocked only with the concrete dependency/evidence and work still possible elsewhere. Preserve history in Comments; do not erase acceptance limitations.

No implementation ticket is complete at creation. Source files, tests and historical beta records are starting evidence. The PRD's platform-order assumption remains open in ticket 69.

## Scope and dependency discipline

- Preserve the confirmed full-product goal. Moving a module to “after beta” is a scope change, not routine scheduling.
- Prefer complete user operations with real API results. Existing native features are extended/reverified, not recreated gratuitously.
- Foundations 02/03/04 and 57/58 enable many slices; deliver their concrete compatibility/tracer/storage proofs before treating downstream tickets as unblocked.
- Numbers group topics and are stable references, not chronological execution order. For example, 58 precedes Full Diary 10 and reminder ticket 44 precedes linked-authoring ticket 16.
- Backend work stays explicit in diary-v3 and its portable packages. Follow that repository's instructions and permissions when implementing there. This app planning task does not edit the backend or authorize deployment.
- Operator tasks 05/69 can proceed while feature development runs. Publication tasks 66/70 require the complete platform acceptance record.

## Every implementation slice

1. Read the parent PRD, required predecessor outputs and frozen source behavior. Confirm the operation/role/contracts and identify existing reusable app code.
2. For a UI slice, establish its native layout/interaction direction consistent with ticket 03 before implementation. Preserve source operations while adapting touch/navigation/table/file behavior.
3. Implement UI, API integration and state/error transitions together where they form one user operation. Keep server authorization and business rules authoritative.
4. Apply relevant PRD invariants: exact decimals/dates, owner/role isolation, no unknown-as-zero, safe marked writes, durable drafts, late-response guards, three locales/themes and accessible long content.
5. Run focused meaningful checks and the repository's applicable lint/typecheck/tests/export checks. Shared/backend changes additionally need contracts and previous-client/integrity coverage.
6. Record exact source/build and actual commands/scenarios/results. Inspect visual/file outputs where they matter. Note environment limitations rather than counting unrun device checks as passed.
7. Close only after acceptance criteria pass with evidence, and update the index if scope/dependencies changed.

## Write and offline requirements

Existing conservative mutation behavior remains until the receipt-backed protocol is implemented for the operation. A failed response, a matching GET or an unchanged GET is not automatic permission to replay. Keep exact attempted payloads and distinguish confirmed save with refresh failure from uncertain mutation.

Ticket 57 owns backend operation IDs, atomic deduplication/results and expected-version conflicts. Ticket 59 adopts those contracts for the PRD's eligible offline operations. Ticket 60 handles legacy uncertainty and cross-client conflicts; ticket 61 proves actual schema/install-over continuity.

Never queue unapproved destructive/financial/admin operations simply because another operation supports an outbox. Preserve offline edits where supported and explain when authoritative online validation is needed.

## Native evidence requirements

- Host tests prove pure/state behavior, not SQLCipher/secure-store/network execution.
- Disposable PostgreSQL/API tests prove authorization, atomicity, financial results, concurrency and compatible contracts.
- Native runtime evidence proves keyboard/Back/lifecycle, encrypted persistence, routing, file/share behavior, notifications and upgrades.
- Record physical model/OS and artifact hash for release claims. Android results do not certify iOS.
- Keep synthetic users/data and controlled market/push providers. Do not use production accounts or expose secrets/content in artifacts.
- A new native module or config/plugin requires a rebuilt binary. Read the exact [Expo SDK 57 documentation](https://docs.expo.dev/versions/v57.0.0/) and relevant versioned module pages before code changes.

## Definition of done

A ticket is `Execution: done` only when its intended operation works, all checklist criteria have evidence, relevant regressions pass and no unresolved blocking integrity/privacy/core-flow issue remains. Record the accepted source and any required backend/artifact version. Runtime acceptance cannot be inherited from unrelated historical builds.

A module passing does not authorize public release. Ticket 65/68 closes full platform parity; ticket 66/70 records actual owner-controlled publication and support readiness.

## Planning validation

The breakdown must have unique ticket IDs, valid acyclic dependencies, valid local links, coverage of all 51 requirement IDs and all 114 source stories, and the existing 52-route mapping. None of these documentation checks constitutes application testing.

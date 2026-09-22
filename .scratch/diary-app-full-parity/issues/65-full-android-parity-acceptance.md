# [65] Accept all full-product journeys on the Android release candidate

Status: ready-for-agent
Execution: not-started
Type: AFK
Phase: F10
Work area: diary-app
Requirements: A04, X04, X05
Source stories: US-098, US-099, US-100, US-103, US-114

## Parent and outcome

[Full-product PRD](../PRD.md) · [Issue index](../ISSUES.md) · [Common delivery rules](../ISSUE-BREAKDOWN.md)

Execute the final complete-product acceptance matrix against the exact accepted service and candidate.

## Implementation boundary

Native app implementation; inspect referenced service contracts before changing behavior. Follow the source-defined roles, contracts, financial/date semantics and failure behavior. Extend existing working code where applicable. The concrete starting references below are evidence and entry points, not permission to import Web/server runtime into native.

## Acceptance criteria

- [ ] Every requirement ID, source story and route/platform mapping has current evidence; implementation-only rows cannot be counted passed.
- [ ] Run all eight PRD journeys, including financial correction, tools/export, sharing, admin, push, offline conflicts and install-over.
- [ ] Cover representative physical devices, guest/USER/ADMIN, three locales, both themes, large/long content and measured performance budgets.
- [ ] Resolve all data-loss, duplicate-financial-write, privacy and core-flow blockers; record exact artifact/source/device/results and any nonblocking limitations.
- [ ] Apply relevant PRD invariants and common translation/accessibility/owner-isolation rules; explain any non-applicable check in evidence.
- [ ] Record actual commands/scenarios, source/build and results. No criterion is complete solely because code or an old screenshot exists.

## Blocked by

- [01: Freeze the complete feature and behavior baseline](01-freeze-parity-baseline.md)
- [02: Align shared packages and prove previous-client compatibility](02-shared-package-compatibility.md)
- [03: Design and implement the complete native navigation shell](03-native-navigation-design.md)
- [04: Establish repeatable API and device acceptance for full parity](04-native-acceptance-harness.md)
- [06: Complete registration and guest-to-account continuation](06-registration-guest-continuation.md)
- [07: Change password and revoke all sessions from the app](07-account-security.md)
- [08: Implement complete preferences, localization and themes](08-preferences-localization.md)
- [09: Render safe rich Markdown in Diary Detail](09-safe-markdown-reader.md)
- [10: Create and edit complete Diary content with durable recovery](10-full-diary-editor.md)
- [11: Complete Quick templates, related context and append behavior](11-quick-templates-context.md)
- [12: Complete Library, Timeline and Calendar navigation parity](12-diary-library-calendar.md)
- [13: Record BUY transactions through full Diary authoring](13-buy-transactions.md)
- [14: Record partial and full SELL transactions without overselling](14-sell-transactions.md)
- [15: Correct transactions and safely delete Diaries or ledger rows](15-ledger-corrections-deletion.md)
- [16: Edit Diary-linked reminders and initial Review scheduling atomically](16-diary-linked-reminders.md)
- [17: Complete Diary Review scheduling, revision and return-to-queue](17-review-reschedule-return.md)
- [18: Create, manage and link complete Trade Plans](18-trade-plans.md)
- [19: Manage stock Watchlist and enter Company research](19-stock-watchlist.md)
- [20: Read Company quote, history and personal context](20-company-hub.md)
- [21: Create and maintain mutable Stock Notes](21-stock-notes.md)
- [22: Capture Evidence and read immutable Stock Timeline records](22-evidence-stock-timeline.md)
- [23: Author and progress Investment Thesis lifecycle](23-investment-thesis.md)
- [24: Review Theses and deliver the combined Review Queue](24-thesis-review-queue.md)
- [25: Carry research context into Diary, Evidence and Trade Plans](25-research-authoring-handoffs.md)
- [26: Read complete holdings, costs, PnL and valuation coverage](26-portfolio-holdings.md)
- [27: Show allocation, exposure, concentration and actionable attention](27-portfolio-risk-attention.md)
- [28: Analyze strategy performance and transaction history](28-strategy-performance.md)
- [29: Export canonical trade data through native file sharing](29-trade-export.md)
- [30: Compose the complete daily Overview workspace](30-overview-workspace.md)
- [31: Expose the complete public Tools directory and access model](31-public-tools-directory.md)
- [32: Deliver ETF research and the personal ETF Watchlist](32-etf-research-watchlist.md)
- [33: Read Market State, breadth and confirmation with data quality](33-market-state.md)
- [34: Compare Market Rotation scopes, rankings and historical trends](34-market-rotation.md)
- [35: Export the exact Rotation view as CSV, table text and PNG](35-rotation-exports.md)
- [36: Calculate Position Sizing and save to Diary or Plan](36-position-sizing.md)
- [37: Run the Financial Freedom and FIRE calculator](37-financial-freedom.md)
- [38: Compare Relative Value and capture the displayed research](38-relative-value.md)
- [39: Read and capture the fixed Seasonality reference](39-seasonality.md)
- [40: Search SEC companies and read filings and document lists](40-sec-filings-reader.md)
- [41: Download and share SEC documents and bounded ZIP packages](41-sec-download-packages.md)
- [42: Create, reorder and randomly review Discipline entries](42-discipline-management.md)
- [43: Import, export and publicly share selected Discipline](43-discipline-transfer-sharing.md)
- [44: Manage one-off and recurring Diary reminders](44-diary-reminders.md)
- [45: Configure and rearm complete Price Alerts](45-price-alerts.md)
- [46: Receive authenticated realtime updates and reconcile on resume](46-foreground-realtime.md)
- [47: Add owner-bound device enrollment and server push delivery](47-push-delivery-service.md)
- [48: Receive native push and open authorized destinations](48-native-push-links.md)
- [49: Manage Partner invitations and independent sharing settings](49-partner-relationships.md)
- [50: Compare partner Diaries and read permitted Stock Notes](50-partner-timeline.md)
- [51: Create, inspect and revoke scoped API keys](51-scoped-api-keys.md)
- [52: Verify Agent ingestion, provenance and Partner integration](52-agent-interoperability.md)
- [53: Read public articles, About and complete product guidance](53-public-articles-guide.md)
- [54: Author and manage the complete article publishing lifecycle](54-article-administration.md)
- [55: Manage users, system statistics and authorized admin Diaries](55-user-system-administration.md)
- [56: Administer ETF data and existing market jobs](56-etf-market-administration.md)
- [57: Implement receipt-based writes and optimistic concurrency in the API](57-write-receipts-concurrency.md)
- [58: Extend encrypted draft persistence to complete-product authoring](58-encrypted-authoring-drafts.md)
- [59: Queue and deliver eligible user-authorized offline submissions](59-encrypted-outbox.md)
- [60: Resolve cross-client conflicts and preserve legacy uncertain attempts](60-conflict-legacy-recovery.md)
- [61: Prove encrypted draft and outbox continuity across native upgrades](61-storage-upgrade-continuity.md)
- [62: Build and audit the complete standalone Android candidate](62-android-release-candidate.md)
- [63: Verify compatible hosting, jobs, deployment and restore](63-service-operations.md)
- [64: Complete account recovery, deletion access and accurate support/privacy](64-account-data-support.md)

Triage readiness describes specification quality. Start implementation only when required predecessor outputs are accepted; missing unrelated release credentials do not block independent product work.

## Source and starting points

- [docs/feature-parity.md](../../../docs/feature-parity.md)
- [docs/launch-roadmap.md](../../../docs/launch-roadmap.md)
- [docs/beta/release-runbook.md](../../../docs/beta/release-runbook.md)

## Verification plan

Full synthetic API/native release acceptance with requirement-level evidence ledger; no production-user test data.

Use synthetic data and controlled provider/service fixtures. Native storage/network/link/notification/upgrade claims require actual runtime evidence. If the implementation modifies a shared contract or backend, record current and previously supported client results.

## Evidence

NOT RUN. This ticket was created by the planning task; implementation and acceptance remain open.

## Comments

Planning baseline: full diary-v3 parity is mandatory; beta is an intermediate test activity. Append implementation decisions, findings and evidence here without rewriting history.

F0 carry-forward: investigate the development-client URL restart SIGSEGV (`MountingCoordinator::pullTransaction`, 2026-09-22 15:32:09 UTC). A rebuilt development APK passed the full tracer; this does not establish a root-cause fix. Recheck cold start, process death, development reload and signed physical-device stability before release. Also complete the Expo Doctor remote schema check, which timed out locally. See [incident evidence](../../../docs/evidence/f0/acceptance.md).

F1 carry-forward: verify cold external intents in the signed standalone app (the development emulator requires selecting its Metro project), plus HTTPS latency/connection behavior after idle OkHttp eviction. F1 native account, Markdown and security uncertainty scenarios passed; this does not close the full-product release gate. See [F1 evidence](../../../docs/evidence/f1/acceptance.md).

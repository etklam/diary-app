# Full-app implementation issues

Feature: diary-app-full-parity
Date: 2026-09-22
Tracker: local Markdown
Execution state: F0 foundation and F1 account/preferences/reader are complete at their recorded evidence layers. In F2, #10–#13 have passed their recorded API and Android 16/API 36 scenario acceptance; #14 has API and native partial/full/oversell evidence, with native no-holding and integrated verification still open. Later F2 tickets remain open. #19, #31, #42, #49, #51, #57 and #58 have recorded implementation completion; #20, #32, #33, #37, #40, #43 and #53 have implementation/API/emulator evidence with remaining native/operator acceptance open. Operator inputs #05 and #69 remain in progress.

[PRD](PRD.md) · [Common rules](ISSUE-BREAKDOWN.md) · [Roadmap](../../docs/launch-roadmap.md) · [Parity matrix](../../docs/feature-parity.md)

The target is the complete diary-v3 native product. There are **70 tickets: 66 AFK development/acceptance tickets and 4 HITL operator/decision/release tickets**. The original planning task did not mark implementation complete. Tickets 01–04 are complete within the recorded F0 foundation scope; see [F0 acceptance](../../docs/evidence/f0/acceptance.md).

## Start here

- Start with [01](issues/01-freeze-parity-baseline.md) to freeze the actual behavior/package baseline.
- After 01, [02](issues/02-shared-package-compatibility.md) aligns packages and [03](issues/03-native-navigation-design.md) establishes the native shell/design; [04](issues/04-native-acceptance-harness.md) then provides acceptance infrastructure.
- [06](issues/06-registration-guest-continuation.md)–[18](issues/18-trade-plans.md) establish full account/Diary/ledger/Review/Plan behavior, following their actual dependencies.
- Start [57](issues/57-write-receipts-concurrency.md) (service receipts/concurrency) and [58](issues/58-encrypted-authoring-drafts.md) (encrypted authoring drafts) as soon as 02/04 permit; their high ticket numbers do not mean they wait until the end.
- [44](issues/44-diary-reminders.md) (reminders) supplies the linked-authoring dependency for [16](issues/16-diary-linked-reminders.md). Use the graph, not numerical or phase order, to select work.
- Operator inputs [05](issues/05-operator-release-inputs.md) and platform/release decisions [69](issues/69-platform-release-decision.md) run alongside implementation. Missing credentials do not block independent modules.
- [65](issues/65-full-android-parity-acceptance.md) is the full Android acceptance gate; [66](issues/66-android-public-launch.md) is owner-controlled Android publication. iOS foundation/acceptance/publication are [67](issues/67-ios-native-foundation.md), [68](issues/68-ios-full-parity-acceptance.md) and [70](issues/70-ios-public-launch.md).

Triage `ready-for-agent` means specified sufficiently once predecessors are accepted. It does not mean dependencies are already finished. Execution status is recorded per ticket; 01–04 and 06–09 are complete within their recorded F0/F1 scopes. F2 #10–#13 have current acceptance evidence; #14 has API and partial native evidence with two checks remaining. See [F1 acceptance](../../docs/evidence/f1/acceptance.md), [F2 editor acceptance](../../docs/evidence/f2/full-diary-editor-acceptance.md), [F2 Quick acceptance](../../docs/evidence/f2/quick-templates-context-acceptance.md), [F2 Library/Timeline/Calendar acceptance](../../docs/evidence/f2/library-timeline-calendar-acceptance.md), [F2 BUY transaction acceptance](../../docs/evidence/f2/buy-transactions-acceptance.md) and [F2 SELL transaction acceptance](../../docs/evidence/f2/sell-transactions-acceptance.md).

## Ticket index

| # | Deliverable | Phase | Type | Direct predecessors |
| --- | --- | --- | --- | --- |
| 01 | [Freeze the complete feature and behavior baseline](issues/01-freeze-parity-baseline.md) | F0 | AFK | None |
| 02 | [Align shared packages and prove previous-client compatibility](issues/02-shared-package-compatibility.md) | F0 | AFK | [01](issues/01-freeze-parity-baseline.md) |
| 03 | [Design and implement the complete native navigation shell](issues/03-native-navigation-design.md) | F0 | AFK | [01](issues/01-freeze-parity-baseline.md) |
| 04 | [Establish repeatable API and device acceptance for full parity](issues/04-native-acceptance-harness.md) | F0 | AFK | [02](issues/02-shared-package-compatibility.md) |
| 05 | [Supply release, hosting, provider and device inputs](issues/05-operator-release-inputs.md) | F0–F10 | HITL | None |
| 06 | [Complete registration and guest-to-account continuation](issues/06-registration-guest-continuation.md) | F1 | AFK | [02](issues/02-shared-package-compatibility.md), [03](issues/03-native-navigation-design.md), [04](issues/04-native-acceptance-harness.md) |
| 07 | [Change password and revoke all sessions from the app](issues/07-account-security.md) | F1 | AFK | [06](issues/06-registration-guest-continuation.md) |
| 08 | [Implement complete preferences, localization and themes](issues/08-preferences-localization.md) | F1 | AFK | [06](issues/06-registration-guest-continuation.md) |
| 09 | [Render safe rich Markdown in Diary Detail](issues/09-safe-markdown-reader.md) | F1–F2 | AFK | [03](issues/03-native-navigation-design.md), [08](issues/08-preferences-localization.md) |
| 10 | [Create and edit complete Diary content with durable recovery](issues/10-full-diary-editor.md) | F2 | AFK | [06](issues/06-registration-guest-continuation.md), [08](issues/08-preferences-localization.md), [09](issues/09-safe-markdown-reader.md), [58](issues/58-encrypted-authoring-drafts.md) |
| 11 | [Complete Quick templates, related context and append behavior](issues/11-quick-templates-context.md) | F2 | AFK | [10](issues/10-full-diary-editor.md) |
| 12 | [Complete Library, Timeline and Calendar navigation parity](issues/12-diary-library-calendar.md) | F2 | AFK | [10](issues/10-full-diary-editor.md) |
| 13 | [Record BUY transactions through full Diary authoring](issues/13-buy-transactions.md) | F2 | AFK | [08](issues/08-preferences-localization.md), [10](issues/10-full-diary-editor.md) |
| 14 | [Record partial and full SELL transactions without overselling](issues/14-sell-transactions.md) | F2 | AFK | [13](issues/13-buy-transactions.md) |
| 15 | [Correct transactions and safely delete Diaries or ledger rows](issues/15-ledger-corrections-deletion.md) | F2 | AFK | [14](issues/14-sell-transactions.md), [16](issues/16-diary-linked-reminders.md) |
| 16 | [Edit Diary-linked reminders and initial Review scheduling atomically](issues/16-diary-linked-reminders.md) | F2 | AFK | [10](issues/10-full-diary-editor.md), [44](issues/44-diary-reminders.md) |
| 17 | [Complete Diary Review scheduling, revision and return-to-queue](issues/17-review-reschedule-return.md) | F2 | AFK | [16](issues/16-diary-linked-reminders.md) |
| 18 | [Create, manage and link complete Trade Plans](issues/18-trade-plans.md) | F2 | AFK | [08](issues/08-preferences-localization.md), [10](issues/10-full-diary-editor.md) |
| 19 | [Manage stock Watchlist and enter Company research](issues/19-stock-watchlist.md) | F3 | AFK | [06](issues/06-registration-guest-continuation.md), [08](issues/08-preferences-localization.md) |
| 20 | [Read Company quote, history and personal context](issues/20-company-hub.md) | F3 | AFK | [02](issues/02-shared-package-compatibility.md), [08](issues/08-preferences-localization.md), [19](issues/19-stock-watchlist.md) |
| 21 | [Create and maintain mutable Stock Notes](issues/21-stock-notes.md) | F3 | AFK | [09](issues/09-safe-markdown-reader.md), [20](issues/20-company-hub.md), [58](issues/58-encrypted-authoring-drafts.md) |
| 22 | [Capture Evidence and read immutable Stock Timeline records](issues/22-evidence-stock-timeline.md) | F3 | AFK | [09](issues/09-safe-markdown-reader.md), [20](issues/20-company-hub.md) |
| 23 | [Author and progress Investment Thesis lifecycle](issues/23-investment-thesis.md) | F3 | AFK | [20](issues/20-company-hub.md), [21](issues/21-stock-notes.md), [22](issues/22-evidence-stock-timeline.md), [58](issues/58-encrypted-authoring-drafts.md) |
| 24 | [Review Theses and deliver the combined Review Queue](issues/24-thesis-review-queue.md) | F3 | AFK | [17](issues/17-review-reschedule-return.md), [23](issues/23-investment-thesis.md) |
| 25 | [Carry research context into Diary, Evidence and Trade Plans](issues/25-research-authoring-handoffs.md) | F3 | AFK | [10](issues/10-full-diary-editor.md), [11](issues/11-quick-templates-context.md), [18](issues/18-trade-plans.md), [20](issues/20-company-hub.md), [22](issues/22-evidence-stock-timeline.md) |
| 26 | [Read complete holdings, costs, PnL and valuation coverage](issues/26-portfolio-holdings.md) | F4 | AFK | [14](issues/14-sell-transactions.md), [15](issues/15-ledger-corrections-deletion.md), [20](issues/20-company-hub.md) |
| 27 | [Show allocation, exposure, concentration and actionable attention](issues/27-portfolio-risk-attention.md) | F4 | AFK | [23](issues/23-investment-thesis.md), [24](issues/24-thesis-review-queue.md), [26](issues/26-portfolio-holdings.md) |
| 28 | [Analyze strategy performance and transaction history](issues/28-strategy-performance.md) | F4 | AFK | [08](issues/08-preferences-localization.md), [26](issues/26-portfolio-holdings.md) |
| 29 | [Export canonical trade data through native file sharing](issues/29-trade-export.md) | F4 | AFK | [28](issues/28-strategy-performance.md) |
| 30 | [Compose the complete daily Overview workspace](issues/30-overview-workspace.md) | F4 | AFK | [12](issues/12-diary-library-calendar.md), [18](issues/18-trade-plans.md), [19](issues/19-stock-watchlist.md), [24](issues/24-thesis-review-queue.md), [27](issues/27-portfolio-risk-attention.md), [28](issues/28-strategy-performance.md), [44](issues/44-diary-reminders.md), [45](issues/45-price-alerts.md) |
| 31 | [Expose the complete public Tools directory and access model](issues/31-public-tools-directory.md) | F5 | AFK | [03](issues/03-native-navigation-design.md), [06](issues/06-registration-guest-continuation.md) |
| 32 | [Deliver ETF research and the personal ETF Watchlist](issues/32-etf-research-watchlist.md) | F5 | AFK | [08](issues/08-preferences-localization.md), [31](issues/31-public-tools-directory.md) |
| 33 | [Read Market State, breadth and confirmation with data quality](issues/33-market-state.md) | F5 | AFK | [02](issues/02-shared-package-compatibility.md), [31](issues/31-public-tools-directory.md) |
| 34 | [Compare Market Rotation scopes, rankings and historical trends](issues/34-market-rotation.md) | F5 | AFK | [33](issues/33-market-state.md) |
| 35 | [Export the exact Rotation view as CSV, table text and PNG](issues/35-rotation-exports.md) | F5 | AFK | [34](issues/34-market-rotation.md) |
| 36 | [Calculate Position Sizing and save to Diary or Plan](issues/36-position-sizing.md) | F5 | AFK | [18](issues/18-trade-plans.md), [25](issues/25-research-authoring-handoffs.md), [31](issues/31-public-tools-directory.md) |
| 37 | [Run the Financial Freedom and FIRE calculator](issues/37-financial-freedom.md) | F5 | AFK | [08](issues/08-preferences-localization.md), [31](issues/31-public-tools-directory.md) |
| 38 | [Compare Relative Value and capture the displayed research](issues/38-relative-value.md) | F5 | AFK | [25](issues/25-research-authoring-handoffs.md), [31](issues/31-public-tools-directory.md) |
| 39 | [Read and capture the fixed Seasonality reference](issues/39-seasonality.md) | F5 | AFK | [25](issues/25-research-authoring-handoffs.md), [31](issues/31-public-tools-directory.md) |
| 40 | [Search SEC companies and read filings and document lists](issues/40-sec-filings-reader.md) | F5 | AFK | [08](issues/08-preferences-localization.md), [31](issues/31-public-tools-directory.md) |
| 41 | [Download and share SEC documents and bounded ZIP packages](issues/41-sec-download-packages.md) | F5 | AFK | [40](issues/40-sec-filings-reader.md) |
| 42 | [Create, reorder and randomly review Discipline entries](issues/42-discipline-management.md) | F6 | AFK | [06](issues/06-registration-guest-continuation.md), [08](issues/08-preferences-localization.md) |
| 43 | [Import, export and publicly share selected Discipline](issues/43-discipline-transfer-sharing.md) | F6 | AFK | [42](issues/42-discipline-management.md) |
| 44 | [Manage one-off and recurring Diary reminders](issues/44-diary-reminders.md) | F6 | AFK | [08](issues/08-preferences-localization.md), [10](issues/10-full-diary-editor.md) |
| 45 | [Configure and rearm complete Price Alerts](issues/45-price-alerts.md) | F6 | AFK | [20](issues/20-company-hub.md), [44](issues/44-diary-reminders.md) |
| 46 | [Receive authenticated realtime updates and reconcile on resume](issues/46-foreground-realtime.md) | F6 | AFK | [07](issues/07-account-security.md), [44](issues/44-diary-reminders.md), [45](issues/45-price-alerts.md) |
| 47 | [Add owner-bound device enrollment and server push delivery](issues/47-push-delivery-service.md) | F6 | AFK | [02](issues/02-shared-package-compatibility.md), [04](issues/04-native-acceptance-harness.md), [44](issues/44-diary-reminders.md), [45](issues/45-price-alerts.md) |
| 48 | [Receive native push and open authorized destinations](issues/48-native-push-links.md) | F6 | AFK | [05](issues/05-operator-release-inputs.md), [46](issues/46-foreground-realtime.md), [47](issues/47-push-delivery-service.md) |
| 49 | [Manage Partner invitations and independent sharing settings](issues/49-partner-relationships.md) | F7 | AFK | [06](issues/06-registration-guest-continuation.md), [08](issues/08-preferences-localization.md) |
| 50 | [Compare partner Diaries and read permitted Stock Notes](issues/50-partner-timeline.md) | F7 | AFK | [09](issues/09-safe-markdown-reader.md), [12](issues/12-diary-library-calendar.md), [21](issues/21-stock-notes.md), [49](issues/49-partner-relationships.md) |
| 51 | [Create, inspect and revoke scoped API keys](issues/51-scoped-api-keys.md) | F7 | AFK | [06](issues/06-registration-guest-continuation.md), [07](issues/07-account-security.md) |
| 52 | [Verify Agent ingestion, provenance and Partner integration](issues/52-agent-interoperability.md) | F7 | AFK | [22](issues/22-evidence-stock-timeline.md), [49](issues/49-partner-relationships.md), [50](issues/50-partner-timeline.md), [51](issues/51-scoped-api-keys.md) |
| 53 | [Read public articles, About and complete product guidance](issues/53-public-articles-guide.md) | F8 | AFK | [09](issues/09-safe-markdown-reader.md), [31](issues/31-public-tools-directory.md) |
| 54 | [Author and manage the complete article publishing lifecycle](issues/54-article-administration.md) | F8 | AFK | [07](issues/07-account-security.md), [53](issues/53-public-articles-guide.md), [58](issues/58-encrypted-authoring-drafts.md) |
| 55 | [Manage users, system statistics and authorized admin Diaries](issues/55-user-system-administration.md) | F8 | AFK | [07](issues/07-account-security.md), [15](issues/15-ledger-corrections-deletion.md) |
| 56 | [Administer ETF data and existing market jobs](issues/56-etf-market-administration.md) | F8 | AFK | [32](issues/32-etf-research-watchlist.md), [34](issues/34-market-rotation.md), [55](issues/55-user-system-administration.md) |
| 57 | [Implement receipt-based writes and optimistic concurrency in the API](issues/57-write-receipts-concurrency.md) | F0/F9 | AFK | [01](issues/01-freeze-parity-baseline.md), [02](issues/02-shared-package-compatibility.md), [04](issues/04-native-acceptance-harness.md) |
| 58 | [Extend encrypted draft persistence to complete-product authoring](issues/58-encrypted-authoring-drafts.md) | F0/F9 | AFK | [02](issues/02-shared-package-compatibility.md), [04](issues/04-native-acceptance-harness.md) |
| 59 | [Queue and deliver eligible user-authorized offline submissions](issues/59-encrypted-outbox.md) | F9 | AFK | [10](issues/10-full-diary-editor.md), [11](issues/11-quick-templates-context.md), [17](issues/17-review-reschedule-return.md), [21](issues/21-stock-notes.md), [57](issues/57-write-receipts-concurrency.md), [58](issues/58-encrypted-authoring-drafts.md) |
| 60 | [Resolve cross-client conflicts and preserve legacy uncertain attempts](issues/60-conflict-legacy-recovery.md) | F9 | AFK | [07](issues/07-account-security.md), [59](issues/59-encrypted-outbox.md) |
| 61 | [Prove encrypted draft and outbox continuity across native upgrades](issues/61-storage-upgrade-continuity.md) | F9 | AFK | [05](issues/05-operator-release-inputs.md), [60](issues/60-conflict-legacy-recovery.md) |
| 62 | [Build and audit the complete standalone Android candidate](issues/62-android-release-candidate.md) | F10 | AFK | [02](issues/02-shared-package-compatibility.md), [05](issues/05-operator-release-inputs.md), [48](issues/48-native-push-links.md), [54](issues/54-article-administration.md), [55](issues/55-user-system-administration.md), [56](issues/56-etf-market-administration.md), [61](issues/61-storage-upgrade-continuity.md), [63](issues/63-service-operations.md), [64](issues/64-account-data-support.md) |
| 63 | [Verify compatible hosting, jobs, deployment and restore](issues/63-service-operations.md) | F10 | AFK | [02](issues/02-shared-package-compatibility.md), [05](issues/05-operator-release-inputs.md), [47](issues/47-push-delivery-service.md), [57](issues/57-write-receipts-concurrency.md) |
| 64 | [Complete account recovery, deletion access and accurate support/privacy](issues/64-account-data-support.md) | F10 | AFK | [05](issues/05-operator-release-inputs.md), [07](issues/07-account-security.md), [55](issues/55-user-system-administration.md) |
| 65 | [Accept all full-product journeys on the Android release candidate](issues/65-full-android-parity-acceptance.md) | F10 | AFK | 01–64 except direct 05; full links in ticket |
| 66 | [Publish and support the accepted complete Android app](issues/66-android-public-launch.md) | F10 | HITL | [05](issues/05-operator-release-inputs.md), [65](issues/65-full-android-parity-acceptance.md), [69](issues/69-platform-release-decision.md) |
| 67 | [Build and verify the iOS native runtime foundation](issues/67-ios-native-foundation.md) | iOS | AFK | [02](issues/02-shared-package-compatibility.md), [03](issues/03-native-navigation-design.md), [04](issues/04-native-acceptance-harness.md), [05](issues/05-operator-release-inputs.md), [69](issues/69-platform-release-decision.md) |
| 68 | [Complete iOS feature parity and full-device acceptance](issues/68-ios-full-parity-acceptance.md) | iOS | AFK | [65](issues/65-full-android-parity-acceptance.md), [67](issues/67-ios-native-foundation.md) |
| 69 | [Record platform order and release-owner product decisions](issues/69-platform-release-decision.md) | F0 | HITL | None |
| 70 | [Publish and support the accepted complete iOS app](issues/70-ios-public-launch.md) | iOS | HITL | [64](issues/64-account-data-support.md), [68](issues/68-ios-full-parity-acceptance.md), [69](issues/69-platform-release-decision.md) |

## Requirement coverage

Every one of the 51 PRD/parity capability IDs is assigned below. Multiple tickets may jointly complete one requirement; a link is planning coverage, not acceptance evidence.

| Requirement | Implementation / verification tickets |
| --- | --- |
| A01: Register; login; renew/restore session; logout this client | [06](issues/06-registration-guest-continuation.md), [64](issues/64-account-data-support.md) |
| A02: Change password; logout all devices; session/role revocation | [07](issues/07-account-security.md), [64](issues/64-account-data-support.md) |
| A03: Profile/name, timezone, locale, theme, default workspace and investment preferences; holiday exclusion in statistics | [08](issues/08-preferences-localization.md) |
| A04: Full public/private/admin navigation, safe link continuation, errors, translations and accessibility | [03](issues/03-native-navigation-design.md), [06](issues/06-registration-guest-continuation.md), [08](issues/08-preferences-localization.md), [09](issues/09-safe-markdown-reader.md), [31](issues/31-public-tools-directory.md), [65](issues/65-full-android-parity-acceptance.md), [68](issues/68-ios-full-parity-acceptance.md) |
| D01: Full Diary create/read/edit/delete; title/body/tags/symbols; original thesis/risk/execution | [10](issues/10-full-diary-editor.md), [15](issues/15-ledger-corrections-deletion.md) |
| D02: Safe Markdown authoring/preview/reading, links/images, code and wide tables | [09](issues/09-safe-markdown-reader.md), [10](issues/10-full-diary-editor.md) |
| D03: Quick free writing, templates/snippets, create/append, related-trade/context discovery and source return | [11](issues/11-quick-templates-context.md), [25](issues/25-research-authoring-handoffs.md) |
| D04: Library plus Timeline search/filter/sort/pagination; monthly Calendar/day navigation | [12](issues/12-diary-library-calendar.md) |
| D05: BUY/SELL transaction create/edit/delete/corrections within Diary | [13](issues/13-buy-transactions.md), [14](issues/14-sell-transactions.md), [15](issues/15-ledger-corrections-deletion.md) |
| D06: Diary follow-up/reminder links and Review scheduling fields in authoring | [16](issues/16-diary-linked-reminders.md), [44](issues/44-diary-reminders.md) |
| D07: Diary Review outcome/reflections, complete/update, schedule/reschedule and return-to-queue | [16](issues/16-diary-linked-reminders.md), [17](issues/17-review-reschedule-return.md) |
| D08: Combined Review Queue: Diary and Thesis, buckets/counts/filters/pages | [17](issues/17-review-reschedule-return.md), [24](issues/24-thesis-review-queue.md) |
| D09: Trade Plan create/read/update/delete, filters, lifecycle, price/risk inputs and Diary link/unlink | [18](issues/18-trade-plans.md) |
| R01: Stock Watchlist add/edit/status/remove | [19](issues/19-stock-watchlist.md) |
| R02: Company Hub quote/history, position/research/activity projections and capture entrances | [20](issues/20-company-hub.md) |
| R03: Stock Note create/update/delete; current opinion and permitted partner reading | [21](issues/21-stock-notes.md), [50](issues/50-partner-timeline.md) |
| R04: Immutable Stock Timeline, provenance/source records, Evidence capture and supported management/link operations | [22](issues/22-evidence-stock-timeline.md) |
| R05: Investment Thesis CRUD/lifecycle/activation, Thesis Review and Portfolio Decision | [23](issues/23-investment-thesis.md), [24](issues/24-thesis-review-queue.md) |
| R06: Research → Evidence/Quick/Full Diary/Trade Plan handoffs and safe return | [25](issues/25-research-authoring-handoffs.md), [36](issues/36-position-sizing.md), [38](issues/38-relative-value.md), [39](issues/39-seasonality.md) |
| P01: Holdings, costs, realized/unrealized results and valuation coverage | [13](issues/13-buy-transactions.md), [14](issues/14-sell-transactions.md), [26](issues/26-portfolio-holdings.md) |
| P02: Allocation/beta, exposure/concentration and Portfolio attention actions | [27](issues/27-portfolio-risk-attention.md) |
| P03: Strategy Performance, transaction statistics/history and closed-trade export | [28](issues/28-strategy-performance.md), [29](issues/29-trade-export.md) |
| P04: Complete Overview/daily workspace: attention, reviews, decisions, plans, Portfolio and Watchlist | [30](issues/30-overview-workspace.md) |
| T01: Public tool index and signed-in research workspace | [06](issues/06-registration-guest-continuation.md), [31](issues/31-public-tools-directory.md) |
| T02: ETF research profile, quote/risk/valuation/relative-return and ETF Watchlist | [32](issues/32-etf-research-watchlist.md) |
| T03: Market State, sector breadth and supporting confirmation | [33](issues/33-market-state.md) |
| T04: Market Rotation scopes, signals, filters/sorts, qualified comparison dates and trends | [34](issues/34-market-rotation.md) |
| T05: Rotation CSV, table copy and PNG export | [35](issues/35-rotation-exports.md) |
| T06: Position Sizing, input/result copy/export and Diary/Plan handoff | [36](issues/36-position-sizing.md) |
| T07: Financial Freedom/FIRE assumptions, projections and source output actions | [37](issues/37-financial-freedom.md) |
| T08: Relative Value quotes/manual inputs/history/scenarios/copy/capture | [38](issues/38-relative-value.md) |
| T09: Seasonality fixed monthly reference, timezone, chart/table/interpretation/copy/capture | [39](issues/39-seasonality.md) |
| T10: SEC company search, filing filters/details, original documents, bounded downloads and ZIP packages | [40](issues/40-sec-filings-reader.md), [41](issues/41-sec-download-packages.md) |
| N01: Diary single/WEEK/MONTH reminders, root/child dismissal and time rules | [44](issues/44-diary-reminders.md) |
| N02: Price Alert thresholds/percentage/moving-average conditions, CRUD and explicit rearm | [45](issues/45-price-alerts.md) |
| N03: Authenticated foreground realtime, reconnect/foreground REST refresh and revocation | [46](issues/46-foreground-realtime.md), [47](issues/47-push-delivery-service.md) |
| N04: Discipline CRUD/reorder/random, import preview/merge, JSON export/share/public import | [42](issues/42-discipline-management.md), [43](issues/43-discipline-transfer-sharing.md) |
| S01: Partner invite/accept/withdraw/unlink and independent Diary/Note sharing settings | [49](issues/49-partner-relationships.md) |
| S02: Timeline Partner comparison, civil-date pairing and bounded history | [50](issues/50-partner-timeline.md) |
| S03: Scoped API-key create/display/revoke | [51](issues/51-scoped-api-keys.md) |
| S04: Agent Diary provenance, scoped research batch ingestion/idempotency, Notes/Watchlist and ordinary Partner integration | [52](issues/52-agent-interoperability.md) |
| C01: Public home/product information, About and Guide | [03](issues/03-native-navigation-design.md), [53](issues/53-public-articles-guide.md), [64](issues/64-account-data-support.md) |
| C02: Public article list/search/category, detail Markdown and sharing | [53](issues/53-public-articles-guide.md) |
| C03: Admin article draft/create/edit/preview/recovery, publish/update/archive/republish/delete/bulk | [54](issues/54-article-administration.md) |
| C04: Admin users/search/pagination/roles/delete, system statistics and authorized admin Diary list | [55](issues/55-user-system-administration.md) |
| C05: Admin ETF catalog/history and existing market batch triggers/status | [56](issues/56-etf-market-administration.md) |
| X01: Encrypted persistent drafts, process death, account isolation and upgrades | [10](issues/10-full-diary-editor.md), [11](issues/11-quick-templates-context.md), [21](issues/21-stock-notes.md), [54](issues/54-article-administration.md), [58](issues/58-encrypted-authoring-drafts.md), [59](issues/59-encrypted-outbox.md), [60](issues/60-conflict-legacy-recovery.md), [61](issues/61-storage-upgrade-continuity.md), [67](issues/67-ios-native-foundation.md), [68](issues/68-ios-full-parity-acceptance.md) |
| X02: Native push, device association, server delivery/receipts and notification links | [05](issues/05-operator-release-inputs.md), [47](issues/47-push-delivery-service.md), [48](issues/48-native-push-links.md), [67](issues/67-ios-native-foundation.md), [68](issues/68-ios-full-parity-acceptance.md) |
| X03: Offline authoring, eligible queued writes, receipt-based recovery and cross-client conflicts | [57](issues/57-write-receipts-concurrency.md), [59](issues/59-encrypted-outbox.md), [60](issues/60-conflict-legacy-recovery.md), [61](issues/61-storage-upgrade-continuity.md), [68](issues/68-ios-full-parity-acceptance.md) |
| X04: API compatibility, providers/jobs, Docker/K3s, health/logs, migrations, backup/restore and CI | [01](issues/01-freeze-parity-baseline.md), [02](issues/02-shared-package-compatibility.md), [04](issues/04-native-acceptance-harness.md), [05](issues/05-operator-release-inputs.md), [47](issues/47-push-delivery-service.md), [57](issues/57-write-receipts-concurrency.md), [63](issues/63-service-operations.md), [65](issues/65-full-android-parity-acceptance.md), [67](issues/67-ios-native-foundation.md), [68](issues/68-ios-full-parity-acceptance.md) |
| X05: Signed builds, native links/file sharing, updates, support/privacy and distribution | [04](issues/04-native-acceptance-harness.md), [05](issues/05-operator-release-inputs.md), [48](issues/48-native-push-links.md), [61](issues/61-storage-upgrade-continuity.md), [62](issues/62-android-release-candidate.md), [64](issues/64-account-data-support.md), [65](issues/65-full-android-parity-acceptance.md), [66](issues/66-android-public-launch.md), [67](issues/67-ios-native-foundation.md), [68](issues/68-ios-full-parity-acceptance.md), [69](issues/69-platform-release-decision.md), [70](issues/70-ios-public-launch.md) |

## Individual source-story traceability

The source identifiers refer to the numbered stories in the [diary-v3 PRD](../../../diary-v3/.scratch/diary-v3-rebuild/PRD.md). All 114 have at least one related ticket. Native push/offline extensions also have their own explicit X02/X03 requirement IDs; related source-story references do not imply those extensions already existed in Web.

| Source story | Related tickets |
| --- | --- |
| US-001 | [06](issues/06-registration-guest-continuation.md) |
| US-002 | [06](issues/06-registration-guest-continuation.md) |
| US-003 | [06](issues/06-registration-guest-continuation.md) |
| US-004 | [07](issues/07-account-security.md) |
| US-005 | [07](issues/07-account-security.md) |
| US-006 | [08](issues/08-preferences-localization.md) |
| US-007 | [08](issues/08-preferences-localization.md) |
| US-008 | [08](issues/08-preferences-localization.md) |
| US-009 | [06](issues/06-registration-guest-continuation.md), [07](issues/07-account-security.md), [64](issues/64-account-data-support.md) |
| US-010 | [06](issues/06-registration-guest-continuation.md), [07](issues/07-account-security.md), [64](issues/64-account-data-support.md) |
| US-011 | [10](issues/10-full-diary-editor.md) |
| US-012 | [09](issues/09-safe-markdown-reader.md), [10](issues/10-full-diary-editor.md) |
| US-013 | [10](issues/10-full-diary-editor.md) |
| US-014 | [10](issues/10-full-diary-editor.md) |
| US-015 | [11](issues/11-quick-templates-context.md) |
| US-016 | [11](issues/11-quick-templates-context.md) |
| US-017 | [11](issues/11-quick-templates-context.md), [57](issues/57-write-receipts-concurrency.md) |
| US-018 | [10](issues/10-full-diary-editor.md) |
| US-019 | [15](issues/15-ledger-corrections-deletion.md) |
| US-020 | [13](issues/13-buy-transactions.md), [14](issues/14-sell-transactions.md), [15](issues/15-ledger-corrections-deletion.md), [57](issues/57-write-receipts-concurrency.md) |
| US-021 | [16](issues/16-diary-linked-reminders.md) |
| US-022 | [12](issues/12-diary-library-calendar.md) |
| US-023 | [30](issues/30-overview-workspace.md) |
| US-024 | [12](issues/12-diary-library-calendar.md) |
| US-025 | [12](issues/12-diary-library-calendar.md) |
| US-026 | [12](issues/12-diary-library-calendar.md), [25](issues/25-research-authoring-handoffs.md), [30](issues/30-overview-workspace.md) |
| US-027 | [12](issues/12-diary-library-calendar.md), [30](issues/30-overview-workspace.md) |
| US-028 | [10](issues/10-full-diary-editor.md) |
| US-029 | [16](issues/16-diary-linked-reminders.md), [17](issues/17-review-reschedule-return.md) |
| US-030 | [24](issues/24-thesis-review-queue.md) |
| US-031 | [17](issues/17-review-reschedule-return.md) |
| US-032 | [17](issues/17-review-reschedule-return.md) |
| US-033 | [17](issues/17-review-reschedule-return.md) |
| US-034 | [18](issues/18-trade-plans.md) |
| US-035 | [18](issues/18-trade-plans.md) |
| US-036 | [18](issues/18-trade-plans.md) |
| US-037 | [18](issues/18-trade-plans.md) |
| US-038 | [13](issues/13-buy-transactions.md), [14](issues/14-sell-transactions.md), [26](issues/26-portfolio-holdings.md) |
| US-039 | [26](issues/26-portfolio-holdings.md) |
| US-040 | [13](issues/13-buy-transactions.md), [14](issues/14-sell-transactions.md), [26](issues/26-portfolio-holdings.md) |
| US-041 | [27](issues/27-portfolio-risk-attention.md) |
| US-042 | [27](issues/27-portfolio-risk-attention.md) |
| US-043 | [28](issues/28-strategy-performance.md) |
| US-044 | [29](issues/29-trade-export.md) |
| US-045 | [19](issues/19-stock-watchlist.md) |
| US-046 | [19](issues/19-stock-watchlist.md) |
| US-047 | [20](issues/20-company-hub.md) |
| US-048 | [21](issues/21-stock-notes.md) |
| US-049 | [22](issues/22-evidence-stock-timeline.md) |
| US-050 | [22](issues/22-evidence-stock-timeline.md), [25](issues/25-research-authoring-handoffs.md) |
| US-051 | [23](issues/23-investment-thesis.md) |
| US-052 | [23](issues/23-investment-thesis.md) |
| US-053 | [24](issues/24-thesis-review-queue.md) |
| US-054 | [20](issues/20-company-hub.md), [21](issues/21-stock-notes.md), [23](issues/23-investment-thesis.md) |
| US-055 | [44](issues/44-diary-reminders.md), [47](issues/47-push-delivery-service.md) |
| US-056 | [44](issues/44-diary-reminders.md) |
| US-057 | [44](issues/44-diary-reminders.md) |
| US-058 | [45](issues/45-price-alerts.md), [47](issues/47-push-delivery-service.md) |
| US-059 | [45](issues/45-price-alerts.md) |
| US-060 | [46](issues/46-foreground-realtime.md), [47](issues/47-push-delivery-service.md), [48](issues/48-native-push-links.md) |
| US-061 | [42](issues/42-discipline-management.md) |
| US-062 | [42](issues/42-discipline-management.md) |
| US-063 | [42](issues/42-discipline-management.md) |
| US-064 | [43](issues/43-discipline-transfer-sharing.md) |
| US-065 | [43](issues/43-discipline-transfer-sharing.md) |
| US-066 | [49](issues/49-partner-relationships.md) |
| US-067 | [49](issues/49-partner-relationships.md) |
| US-068 | [50](issues/50-partner-timeline.md) |
| US-069 | [50](issues/50-partner-timeline.md) |
| US-070 | [51](issues/51-scoped-api-keys.md) |
| US-071 | [52](issues/52-agent-interoperability.md) |
| US-072 | [52](issues/52-agent-interoperability.md) |
| US-073 | [52](issues/52-agent-interoperability.md) |
| US-074 | [49](issues/49-partner-relationships.md), [52](issues/52-agent-interoperability.md) |
| US-075 | [32](issues/32-etf-research-watchlist.md) |
| US-076 | [32](issues/32-etf-research-watchlist.md) |
| US-077 | [33](issues/33-market-state.md) |
| US-078 | [34](issues/34-market-rotation.md) |
| US-079 | [34](issues/34-market-rotation.md) |
| US-080 | [34](issues/34-market-rotation.md) |
| US-081 | [35](issues/35-rotation-exports.md) |
| US-082 | [33](issues/33-market-state.md), [34](issues/34-market-rotation.md) |
| US-083 | [36](issues/36-position-sizing.md) |
| US-084 | [37](issues/37-financial-freedom.md) |
| US-085 | [38](issues/38-relative-value.md) |
| US-086 | [39](issues/39-seasonality.md) |
| US-087 | [40](issues/40-sec-filings-reader.md) |
| US-088 | [41](issues/41-sec-download-packages.md) |
| US-089 | [20](issues/20-company-hub.md), [33](issues/33-market-state.md), [34](issues/34-market-rotation.md), [40](issues/40-sec-filings-reader.md), [41](issues/41-sec-download-packages.md) |
| US-090 | [53](issues/53-public-articles-guide.md) |
| US-091 | [53](issues/53-public-articles-guide.md) |
| US-092 | [09](issues/09-safe-markdown-reader.md), [53](issues/53-public-articles-guide.md) |
| US-093 | [54](issues/54-article-administration.md) |
| US-094 | [54](issues/54-article-administration.md) |
| US-095 | [54](issues/54-article-administration.md) |
| US-096 | [55](issues/55-user-system-administration.md) |
| US-097 | [56](issues/56-etf-market-administration.md) |
| US-098 | [03](issues/03-native-navigation-design.md), [31](issues/31-public-tools-directory.md), [48](issues/48-native-push-links.md), [58](issues/58-encrypted-authoring-drafts.md), [59](issues/59-encrypted-outbox.md), [65](issues/65-full-android-parity-acceptance.md), [68](issues/68-ios-full-parity-acceptance.md) |
| US-099 | [03](issues/03-native-navigation-design.md), [08](issues/08-preferences-localization.md), [65](issues/65-full-android-parity-acceptance.md), [68](issues/68-ios-full-parity-acceptance.md) |
| US-100 | [03](issues/03-native-navigation-design.md), [09](issues/09-safe-markdown-reader.md), [65](issues/65-full-android-parity-acceptance.md), [68](issues/68-ios-full-parity-acceptance.md) |
| US-101 | [61](issues/61-storage-upgrade-continuity.md), [62](issues/62-android-release-candidate.md), [68](issues/68-ios-full-parity-acceptance.md) |
| US-102 | [03](issues/03-native-navigation-design.md), [10](issues/10-full-diary-editor.md), [31](issues/31-public-tools-directory.md), [58](issues/58-encrypted-authoring-drafts.md), [59](issues/59-encrypted-outbox.md), [60](issues/60-conflict-legacy-recovery.md) |
| US-103 | [03](issues/03-native-navigation-design.md), [09](issues/09-safe-markdown-reader.md), [65](issues/65-full-android-parity-acceptance.md), [68](issues/68-ios-full-parity-acceptance.md) |
| US-104 | [02](issues/02-shared-package-compatibility.md), [06](issues/06-registration-guest-continuation.md), [62](issues/62-android-release-candidate.md), [67](issues/67-ios-native-foundation.md) |
| US-105 | [06](issues/06-registration-guest-continuation.md), [46](issues/46-foreground-realtime.md), [62](issues/62-android-release-candidate.md), [67](issues/67-ios-native-foundation.md) |
| US-106 | [02](issues/02-shared-package-compatibility.md), [62](issues/62-android-release-candidate.md) |
| US-107 | [02](issues/02-shared-package-compatibility.md), [57](issues/57-write-receipts-concurrency.md), [60](issues/60-conflict-legacy-recovery.md), [61](issues/61-storage-upgrade-continuity.md), [62](issues/62-android-release-candidate.md) |
| US-108 | [02](issues/02-shared-package-compatibility.md), [62](issues/62-android-release-candidate.md), [67](issues/67-ios-native-foundation.md) |
| US-109 | [05](issues/05-operator-release-inputs.md), [63](issues/63-service-operations.md) |
| US-110 | [05](issues/05-operator-release-inputs.md), [63](issues/63-service-operations.md) |
| US-111 | [05](issues/05-operator-release-inputs.md), [63](issues/63-service-operations.md) |
| US-112 | [05](issues/05-operator-release-inputs.md), [63](issues/63-service-operations.md) |
| US-113 | [04](issues/04-native-acceptance-harness.md), [63](issues/63-service-operations.md) |
| US-114 | [01](issues/01-freeze-parity-baseline.md), [04](issues/04-native-acceptance-harness.md), [64](issues/64-account-data-support.md), [65](issues/65-full-android-parity-acceptance.md), [66](issues/66-android-public-launch.md), [68](issues/68-ios-full-parity-acceptance.md), [69](issues/69-platform-release-decision.md), [70](issues/70-ios-public-launch.md) |

## Route coverage and acceptance ownership

All 52 registered source routes have explicit native or platform mappings in the [parity matrix](../../docs/feature-parity.md). Capability tickets own their mapped operations. Ticket 01 freezes the operation-level source evidence, and 65/68 verify route/capability closure on the actual platform builds.

Admin APIs, Agent ingestion, ledger correction, import/export, scheduler/realtime, push and offline support must be checked even when they have no independent route. Website SEO/PWA/redirect mechanics keep explicit native equivalents rather than being counted as omitted features.

## Status maintenance

Update the individual ticket's `Execution:` and append findings/results to its Evidence/Comments. Keep this index consistent when splitting scope or changing dependencies. Do not mark a ticket complete because a predecessor is complete or an earlier beta test passed.

Current validation: planning coverage/dependency audits plus recorded F0/F1 acceptance and F2 #10–#13 API/Android acceptance. #14 API and selected Android scenarios passed; native no-holding and integrated verification are pending. All other tickets retain their individual recorded execution states.

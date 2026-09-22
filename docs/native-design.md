# Native foundation design

F0 implementation contract, 2026-09-22. Read before extending a screen.

## Navigation

Five stable destinations: Overview, Diary, Portfolio, Research, More. Diary keeps the existing Timeline route and its state; Calendar and Review remain reachable from Diary. More contains Account, Review, Plans and support. Tab history preserves the originating destination when returning from a secondary screen. Quick Diary is a header action on every primary destination and opens the existing owner-bound draft controller. Returning from the editor must preserve its draft and the originating tab. Never submit from a navigation action.

Overview initially offers working Diary shortcuts. Portfolio and Research explicitly describe unavailable functionality; they show no invented balances, charts or enabled future actions. The complete daily workspace is ticket 30. Future routes are catalogued in `src/navigation/destinations.ts`; only implemented routes are actionable. Admin destinations require a currently verified ADMIN session. A recoverable session may reopen existing local authoring but does not advertise administrative access. Server authorization remains mandatory.

Guest access to public content/tools belongs to ticket 06/31/53. Until implemented, guests see sign-in and cannot enter the private shell. The destination catalog records public access separately from readiness.

## Visual and interaction rules

- System sans-serif; body 16/25, supporting text 14/21, section title 22/30, page title 28/36. Respect font scaling. No fixed-height text containers.
- Spacing scale 4, 8, 12, 16, 24, 32. Screen padding 16; cards 16; radius 14; minimum touch target 48. Stack actions on narrow layouts.
- Shell uses semantic light/dark tokens, following the device. Existing authoring screens retain their baseline styling until preference integration in ticket 08; this is not a claim of complete theme parity.
- Primary navigation uses text labels with accessible names. Above font scale 1.4, use a two-row navigation grid with short visible labels and full accessible names; keep all five destinations reachable without clipped text. Decorative icons do not scale. Respect bottom and side safe areas. Shell copy supports device English, Traditional Chinese and Simplified Chinese; account locale preferences join in F1.
- Loading, empty, unavailable and failed states must be distinct. A future destination is informational, never a disabled imitation of a live financial dashboard.
- Forms keep visible labels, field-level errors and a keyboard-safe scroll path. Navigation never resets drafts. Confirm destructive dismissal; never retry an uncertain write implicitly.
- Future tables use horizontal scrolling with a persistent row identity and an equivalent textual summary. Charts must expose values, units, observation time and missing-data state without relying on color. They must not interpolate missing financial data.

## Acceptance budgets

Provisional regression targets, not measured promises: 360 dp minimum width; font scale 1.0 and 2.0; 48 dp controls; no clipped primary action; primary-tab warm transition p95 below 300 ms on the recorded emulator; synthetic API list p95 below 500 ms for 100 records on local PostgreSQL; 10,000-character draft remains editable without losing text. Measure cold start, tab transitions and list responses separately. Record OS, build and sample count. Chart measurements begin when a real chart is implemented; a placeholder cannot establish chart performance.

SDK references read before implementation: [Expo 57](https://docs.expo.dev/versions/v57.0.0/) and [Expo Router 57](https://docs.expo.dev/versions/v57.0.0/sdk/router/). Import navigation APIs from Expo Router.

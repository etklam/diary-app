# F1 account and reading design

Implement issues 06–09 as one account/preferences/reader phase, using the F0 shell. Forms use visible labels, a scrollable keyboard-safe layout, 48 dp actions, inline recoverable failures and explicit submission. Account links to Preferences and Security. Public start/guide screens remain accessible signed out; private continuations use an allowlist, never arbitrary URLs or automatic writes. Full Tools and Articles remain their product tickets.

Registration succeeds into an explicit sign-in step. Password change and logout-all require confirmation, flush encrypted drafts, revoke all sessions through the authoritative API, and retain owner-bound drafts for reauthentication. Uncertain security writes sign this device out without retrying the mutation. Passwords are never persisted.

Preferences edit an isolated snapshot; late reads cannot overwrite edits. Decimal fields remain strings through schema validation; zero is meaningful. Locale, timezone, workspace and investment preferences are server-owned; theme follows the source's device-local system/light/dark model. Preference storage is scoped by API environment and owner. Existing screens adopt reactive locale/theme; civil dates remain civil and instants use the account timezone.

Markdown uses a native tree, never HTML/WebView execution. Keep stored text unchanged, support GFM tables/lists/code, constrain image sizes, preserve failed-image alt text, and validate external/internal links. Wide code/tables scroll independently and remain readable with large text.

Acceptance requires host race/validation tests, disposable two-client security/settings tests, native registration/continuation/preferences/restart/Markdown/security flows, and updated evidence. Expo 57 exact docs were read before implementation.

Cold native links enter the root authentication gate through Expo Router's `+native-intent`, carrying only validated route/date/ID context. This avoids losing context before the private navigator has exposed its pathname. Warm links retain ordinary routing. A restored or edited Quick draft keeps its original date; the screen explains when a requested date was not applied instead of silently changing saved work. The development launcher is an extra selection step in emulator acceptance; standalone intent handling remains a release check.

## Native transport follow-up

Native acceptance reproduced an unexpected end-of-stream on fast logout-all and preference writes after reads. The API observer saw no matching mutation in those failures; a later explicit action succeeded. The existing one-shot body correctly prevented hidden HTTP replay but could not recover a stale idle connection. F1 evicts idle OkHttp connections before marked writes, preserving active reads, request cancellation, timeout handling and the one-shot body. This trades a possible fresh connection/TLS handshake for reliable first transmission; it does not add a retry or exactly-once guarantee. The config plugin updates existing generated blocks idempotently and fails closed on an unrecognized block. [OkHttp's implementation](https://raw.githubusercontent.com/square/okhttp/parent-4.12.0/okhttp/src/main/kotlin/okhttp3/ConnectionPool.kt) defines eviction as closing idle connections.

Acceptance must use the rebuilt APK with the ordinary short-lived local API connections and immediate confirmation. A separate committed-response-loss probe must still observe exactly one mutation and an uncertain UI outcome. Signed-device HTTPS latency and connection behavior remain release checks.

# F0 write and draft protocol

Status: ticket 58's additive encrypted authoring-draft foundation and ticket 57's opt-in API protocol are in progress. Tickets 59 and 60 remain specified but unimplemented. Existing single-attempt Quick/Review behavior remains mandatory. No automatic replay is enabled.

## Current evidence and compatibility

The `diary-v3` service now implements the opt-in protocol described below. Agent batch idempotency remains separately scoped and is not reused. Receipt-backed client dispatch is still disabled until the disposable-PostgreSQL integration suite proves concurrency, rollback, response-loss recovery, expiry and prior-client compatibility. GET returning matching content is not a durable receipt. The current client retains its conservative uncertain-attempt rules; no migration may attach a new operation ID to an old attempted write.

All current and previous native client requests continue to work during protocol rollout. Non-protocol Web/native mutations must increment the same aggregate version as protocol mutations, or conflict detection is unsound. Expose capability negotiation before enabling any client outbox. Unsupported deployments keep encrypted drafts and explicit online submission.

## Proposed opt-in wire contract

The following additive endpoints and headers are implemented in `diary-v3`; ticket 57 remains open pending its database acceptance run.

| Operation | Request | Version source | Receipt result |
| --- | --- | --- | --- |
| Quick/content-only Diary create or append | `POST /api/diaries` with `Idempotency-Key` | No base version; owner/day uniqueness still applies | Created Diary projection and version |
| Content-only Diary update | `PUT /api/diaries/{id}` with `Idempotency-Key` and `If-Match` | `ETag` from owner-authorized Diary detail | Updated Diary projection and version |
| Diary Review | `PATCH /api/diaries/{id}/review` with both headers | `ETag` from owner-authorized Review read | Updated Review projection and Diary version |
| Stock Note create | `POST /api/stocks/{symbol}/notes` with `Idempotency-Key` | No base version | Created note projection and version |
| Stock Note update | `PUT /api/stocks/{symbol}/notes/{id}` with both headers | `ETag` from owner-authorized note detail | Updated note projection and version |

Diary receipt mode accepts title, content, tags and date, including Quick append. Transactions, reminders, symbol associations and thesis/risk/execution fields remain online-only. An opted-in update without `If-Match` returns `428`; requests without either protocol header retain the prior behavior. The API adds `ETag` without changing existing strict response bodies. Database triggers advance Diary and Stock Note versions for old Web/API writers too. The Agent evidence endpoint remains on its existing source-defined idempotency scope.

- Each user-confirmed queued submission freezes a UUID operation ID, operation type, target, exact validated payload, base version and owner/environment. Later edits create another explicit submission; never mutate an attempted envelope.
- Opt-in request headers: `Idempotency-Key: <uuid>` and `If-Match: "<decimal-string-version>"` for updates. The API advertises supported operation types/protocol version. Creates use owner/day uniqueness plus the operation ID, not a fabricated base version.
- Server hashes a canonical validated envelope including method, target, payload and precondition. Preserve decimal strings, civil dates and exact instants; do not hash floating-point conversions or locale-formatted text. The server computes its own hash.
- Unique receipt key: `(owner_id, operation_id)`. Reserve/check it under the same PostgreSQL transaction and serialization policy as the domain mutation. Concurrent identical requests return the same committed result; different envelopes for the same key return `409 OPERATION_ID_MISMATCH` without a second mutation.
- Successful receipt and mutation commit atomically. Record operation type, payload hash, target ID, resulting version, terminal status and stable result projection. A lost HTTP response is recovered by owner-authorized `GET /api/operations/{id}`. Receipt access never includes another owner's result.
- Version conflict: `412 VERSION_CONFLICT`, current version and an authorized minimal current projection. Missing precondition for an opted-in update: `428 PRECONDITION_REQUIRED`. Validation/permission rejection is definitive only if the server explicitly returns the protocol's terminal rejection receipt.
- `404` receipt does not prove the original transaction failed. The client may resubmit the **same immutable operation ID** only when that exact operation is advertised as idempotent; never switch to an ordinary mutation fallback. In-progress responses remain pending and provide a bounded retry delay.
- Revoked credentials stop dispatch. Reauthentication must resolve to the same owner/environment before resume. Rate limiting and connectivity errors retain the envelope and use bounded backoff; no financial writes replay through an automatic session retry wrapper.

## Retention and recovery

Client queue eligibility remains unimplemented; the proposal is 30 days from explicit submission. The service retains full successful receipts for 90 days, then lazily clears the response body while keeping the owner/operation/hash/result-ID tombstone until account deletion. A tombstone returns `410 OPERATION_RECEIPT_EXPIRED` and prevents a second mutation. A client never invents a new ID to work around expiry. Service retention behavior still requires the ticket 57 PostgreSQL run and privacy review in ticket 64 before it is a product guarantee.

Per-target updates are ordered. Dependent operations wait for the preceding authoritative ID/version; unrelated targets may progress independently. A conflict freezes dependants. Show base/local/current values and allow keep server, save local as a separate eligible record, or manually merge and explicitly submit against the new version. Never automatically merge ledger rows, deletes or administration.

## Operation eligibility

The complete endpoint inventory is in `evidence/f0/source-baseline.json`; this table governs classes of operations, including operations without a dedicated screen.

| Class | Draft behavior | Dispatch rule |
| --- | --- | --- |
| Quick create/append; content-only Full Diary create/update; Diary Review; Stock Note create/update | Encrypted editable draft; immutable submitted envelope | Eligible only after operation-specific receipts, versions and concurrency fixtures pass |
| Full Diary with transactions/reminders | Preserve complete aggregate draft | Online authoritative ledger/linked-record validation; do not split aggregate writes |
| Trade Plan, Thesis/review/decision and article authoring | Encrypted draft with source version | Explicit online submission initially; queue support requires its own protocol acceptance |
| Delete, historical correction, account/password/session, API key, Partner sharing, ADMIN and provider/job mutations | Do not persist passwords/API secrets as drafts | Online only, current permission and authoritative confirmation; no background replay |
| Reminders, price alerts, Discipline imports/reorder and Watchlist changes | Preserve supported non-secret form input | Online initially; no inferred queue support from ordinary CRUD |
| Agent ingestion | Existing source-defined scoped protocol | External service responsibility; no app replay of another producer's operations |
| Reads, calculations, exports/downloads | Deliberately retained scoped data only | Show freshness; no implied live quote, successful download or complete offline cache |
| Pre-protocol uncertain Quick/Review attempts | Preserve original attempt unchanged | Existing locked/manual recovery path; never migrate into a replayable queue |

## Draft schema evolution

Ticket 58 extends the existing SQLCipher database and SecureStore key. Use additive, transactional schema versions; never rotate the key, clear storage or uninstall on migration failure. Preserve current Quick and per-Diary Review tables until exact old-row fixtures have migrated successfully.

New draft identity is `(environment, API origin, owner ID, entity kind, entity key)`, with schema version, editor payload, base version, timestamps and optional immutable pending-operation reference. Keep editable drafts separate from immutable submission envelopes. Store only supported non-secret input. Logout/discard must explain unsent versus uncertain work and delete only the selected owner's records after confirmation. Account changes fence asynchronous callbacks before they can write local state.

Open migrations in a transaction, verify every transformed row, then advance schema version and commit. On failure roll back and retain old bytes/key; surface recovery rather than opening an empty replacement. Forward-incompatible schema opens read-only recovery or fails closed. Test install-over upgrade with the actual signed native artifact in ticket 61.

### Current ticket 58 foundation

The app adds an `authoring_drafts` table to the existing SQLCipher database. Its key is `(scope, owner_id, entity_type, entity_id)`; `scope` contains the app environment and API origin. The table is additive and leaves `quick_drafts` and `review_drafts` unchanged. Each record carries its payload schema version, monotonically increasing editor revision and update time. Reads do not create rows or persist a migrated payload. A caller must provide each step of a schema migration; a missing migration, invalid payload or newer stored version fails closed and leaves the row in place. Writes update only when the submitted revision is newer, and explicit deletion shares the repository queue with saves.

Session expiry and owner changes do not expire or delete authoring drafts. Drafts have no automatic age-based deletion; they remain until a confirmed-save cleanup or an explicit user discard. Logout checks for these records and removes only the confirmed account/environment after the existing discard confirmation. Payload object keys that could hold passwords, tokens, credentials, API keys or authorization data are rejected. Native runtime coexistence, process-death and corruption evidence, and adoption by authoring screens remain open acceptance work.

## Required implementation proofs

Ticket 57: simultaneous identical requests, same ID/different payload, commit-before-response-loss, transaction rollback, delayed commit, receipt expiry/tombstone, cross-owner receipt access, old-client writes invalidating versions and server restart. Integration coverage is written; it has not run because the local disposable PostgreSQL at `127.0.0.1:55433` is unavailable. Ticket 58: real old Quick/Review rows, failed migrations, process death, owner/origin switching, missing keys and no plaintext leakage. Tickets 59–60: explicit submit, reconnect, dependency ordering, revocation, conflict resolution and a legacy uncertain attempt that never enters the new outbox.

No endpoint/header/schema in this proposal may be called by product code until its capability and compatibility tests pass.

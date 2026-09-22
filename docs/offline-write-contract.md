# F0 write and draft protocol

Status: specified for implementation in tickets 57–60; **not implemented or enabled**. Existing single-attempt Quick/Review behavior remains mandatory. F0 does not authorize automatic replay.

## Current evidence and compatibility

The selected API has no general Diary/Review operation receipt or aggregate version precondition. Agent batch idempotency has a different scope. GET returning matching content is not a durable receipt. The current client retains its conservative uncertain-attempt rules; no migration may attach a new operation ID to an old attempted write.

All current and previous native client requests continue to work during protocol rollout. Non-protocol Web/native mutations must increment the same aggregate version as protocol mutations, or conflict detection is unsound. Expose capability negotiation before enabling any client outbox. Unsupported deployments keep encrypted drafts and explicit online submission.

## Proposed opt-in wire contract

The precise endpoint/schema names are an implementation proposal for ticket 57, not available APIs.

- Each user-confirmed queued submission freezes a UUID operation ID, operation type, target, exact validated payload, base version and owner/environment. Later edits create another explicit submission; never mutate an attempted envelope.
- Opt-in request headers: `Idempotency-Key: <uuid>` and `If-Match: "<decimal-string-version>"` for updates. The API advertises supported operation types/protocol version. Creates use owner/day uniqueness plus the operation ID, not a fabricated base version.
- Server hashes a canonical validated envelope including method, target, payload and precondition. Preserve decimal strings, civil dates and exact instants; do not hash floating-point conversions or locale-formatted text. The server computes its own hash.
- Unique receipt key: `(owner_id, operation_id)`. Reserve/check it under the same PostgreSQL transaction and serialization policy as the domain mutation. Concurrent identical requests return the same committed result; different envelopes for the same key return `409 OPERATION_ID_MISMATCH` without a second mutation.
- Successful receipt and mutation commit atomically. Record operation type, payload hash, target ID, resulting version, terminal status and stable result projection. A lost HTTP response is recovered by owner-authorized `GET /api/operations/{id}`. Receipt access never includes another owner's result.
- Version conflict: `412 VERSION_CONFLICT`, current version and an authorized minimal current projection. Missing precondition for an opted-in update: `428 PRECONDITION_REQUIRED`. Validation/permission rejection is definitive only if the server explicitly returns the protocol's terminal rejection receipt.
- `404` receipt does not prove the original transaction failed. The client may resubmit the **same immutable operation ID** only when that exact operation is advertised as idempotent; never switch to an ordinary mutation fallback. In-progress responses remain pending and provide a bounded retry delay.
- Revoked credentials stop dispatch. Reauthentication must resolve to the same owner/environment before resume. Rate limiting and connectivity errors retain the envelope and use bounded backoff; no financial writes replay through an automatic session retry wrapper.

## Retention and recovery

Initial proposed queue eligibility: 30 days from explicit submission. Retain full terminal receipts at least 90 days, then retain compact owner/operation/hash/result-ID tombstones until account deletion. A tombstone returns `410 RECEIPT_EXPIRED` and must still prevent a second mutation. A client never invents a new ID to work around expiry. Final retention values require implementation and privacy review in tickets 57/64; there is no implied current service guarantee.

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

## Required implementation proofs

Ticket 57: simultaneous identical requests, same ID/different payload, commit-before-response-loss, transaction rollback, delayed commit, receipt expiry/tombstone, cross-owner receipt access, old-client writes invalidating versions and server restart. Ticket 58: real old Quick/Review rows, failed migrations, process death, owner/origin switching, missing keys and no plaintext leakage. Tickets 59–60: explicit submit, reconnect, dependency ordering, revocation, conflict resolution and a legacy uncertain attempt that never enters the new outbox.

No endpoint/header/schema in this proposal may be called by product code until its capability and compatibility tests pass.

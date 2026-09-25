# Phase 6 — Trading Journal

## Status
IMPLEMENTED & FULLY VERIFIED

## Implemented Functionality
*   **Journal Entries**: Users can create, read, update, and delete journal entries linked to their trading activity.
*   **Context Logging**: Users can log emotions, setups, entry/exit reasons, mistakes, and rule adherence.
*   **Periodic Reviews**: Supported through `reviewType` (TRADE, DAILY, WEEKLY, MONTHLY).
*   **Tags**: Normalized tagging system implemented via the `JournalTag` model, strictly scoped per user.
*   **Attachments**: URL-based metadata storage implemented via the `JournalAttachment` model.
*   **Trade Linking**: Entries can link manually to a `Strategy`, `Order`, or `Position` (with strict ownership enforcement).

## Data Model
*   `JournalEntry`: Core document table.
*   `JournalTag`: Normalized tags linked to `JournalEntry`.
*   `JournalAttachment`: Metadata records for attachments.

## API Endpoints
*   `POST /api/v1/journal` — Create a new entry.
*   `GET /api/v1/journal` — List entries (supports tag and type filters, pagination).
*   `GET /api/v1/journal/:id` — Get entry details.
*   `PATCH /api/v1/journal/:id` — Update an entry.
*   `DELETE /api/v1/journal/:id` — Delete an entry.

## Ownership & Security
*   All endpoints protected by `AuthGuard`.
*   Strict user isolation: User A cannot read, edit, or interact with User B's entries, tags, or attachments.
*   Nested validation: When linking an `Order`, `Position`, or `Strategy`, the backend explicitly verifies that the target object belongs to the authenticated user (preventing IDOR).
*   Cascading deletion respects architectural boundaries: Deleting a `JournalEntry` cascades to its tags and attachments, but explicitly leaves the financial `Order` and `Position` untouched.
*   No `any` types used in the module API.

## Deferred Functionality
The following items were excluded from Phase 6 as per the architecture review and source limitations:
*   **Automatic background journal generation**: (e.g., via OrderFill hooks) deferred due to undefined event semantics in source specs.
*   **Broker feed imports**: Deferred to Live Trading phases.
*   **AI journal analysis / Mistake detection**: Deferred to AI-specific phases.
*   **Public/social sharing**: Journals remain strictly private.
*   **Cloud Storage Integration**: Attachment metadata is saved, but direct S3/cloud uploads are deferred until a standard provider is established.

## Known Limitations
*   Linking currently relies on manually providing the object ID (e.g., from the Paper Trading UI). True unified UI "Create Journal" buttons on the Paper Dashboard will be integrated when the unified dashboard is completed.
*   No standalone `ClosedTrade` abstraction. Financial truth relies fully on Phase 2 `Position` and `Order` semantics.

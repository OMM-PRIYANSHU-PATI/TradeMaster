# Phase 6 — Trading Journal Architecture

## 1. Executive Summary

Phase 6 implements the Trading Journal module to support TradeMaster's core product loop. The architecture safely bridges qualitative trading context (emotions, setups, mistakes, reviews) with the existing deterministic Phase 2 Paper Trading system, without altering financial semantics or exposing raw execution data to social/public boundaries.

## 2. Source Requirements

| Capability | Source Feature | Source Requirement | Phase 6? |
| ---------- | -------------- | ------------------ | -------- |
| Manual/imported trade entry | `095` | "Manual, imported, or automatic trade entry... linked paper-trading trades" | YES |
| Entry/exit reason | `096` | "Entry/exit reason" | YES |
| Strategy linking | `096` | "strategy" | YES |
| Setup | `096` | "setup" | YES |
| Emotion | `096` | "emotion" | YES |
| Confidence | `096` | "confidence" | YES |
| Market condition | `096` | "market condition" | YES |
| Screenshots | `097` | "Screenshots" | YES |
| Tags | `097` | "tags" | YES |
| Notes | `097` | "notes" | YES |
| Mistake tracking | `098` | "Mistake tracking" | YES (Free text) |
| Rule adherence | `098` | "rule adherence" | YES (Free text) |
| Post-trade review | `099` | "Post-trade review (daily, weekly, monthly)" | YES |
| Broker feed import | `095` | "broker feed" | DEFERRED (Phase 7+) |
| AI analysis | `107, 111`| "Journal patterns, repeated mistakes... AI" | DEFERRED (Phase 10) |

## 3. Existing Architecture

The existing Phase 2 (Paper Trading) handles financial state:
*   **Order**: Intent to execute.
*   **OrderFill**: Actual execution slice.
*   **Position**: Aggregated ledger of current holdings.

The existing Phase 3 (Backtesting) handles:
*   **BacktestRun** and **BacktestTrade**.

The Phase 4 (Strategy):
*   **Strategy**.

## 4. Trade Abstraction Analysis

Phase 6 **does NOT** introduce a `ClosedTrade` model.
Phase 6 **does NOT** change Phase 2 trading semantics or create a second financial trade ledger.

**Resolution:**
A `JournalEntry` acts conceptually as the "trade review" container. Because Phase 2 lacks a discrete round-trip `ClosedTrade` abstraction, `JournalEntry` will optionally link to either:
*   `Order` (to journal a specific entry or exit decision).
*   `Position` (to journal the campaign/lifecycle of holding the asset).

If a unified generic trade abstraction becomes necessary for advanced analytics later, it is explicitly documented as a **FUTURE ARCHITECTURAL DEPENDENCY**.

## 5. Manual vs Imported Entry Decision

*Source context:* Feature 095 cites "Manual, imported, or automatic trade entry".

**Resolution:**
*   **Manual**: User creates a journal entry manually from the UI.
*   **Imported**: User selects an existing Paper Trading `Order` or `Position` via the UI and clicks "Create Journal Entry", which links the object IDs.
*   **Automatic background hooks**: DEFERRED — SOURCE REQUIREMENT INSUFFICIENT. The source specs do not define whether "automatic" triggers on `Order` creation, `OrderFill`, or `Position` close. To avoid unintended side-effects and database bloat, automatic background generation is deferred.

## 6. JournalEntry Model

| Field | Type | Required | Purpose | Validation | Source Requirement |
| ----- | ---- | -------- | ------- | ---------- | ------------------ |
| `id` | String | YES | Primary Key (cuid) | UUID/cuid | Standard PK |
| `userId` | String | YES | Ownership | Valid User | Base requirement |
| `title` | String | NO | Review naming (e.g., "Week 42") | Max 255 chars | 099 (reviews) |
| `notes` | String | NO | Unstructured journal text | String | 097 (notes) |
| `entryReason` | String | NO | Why the trade was taken | String | 096 (entry reason) |
| `exitReason` | String | NO | Why the trade was closed | String | 096 (exit reason) |
| `setup` | String | NO | Trade setup identified | String | 096 (setup) |
| `emotion` | String | NO | Psychological state | String | 096 (emotion) |
| `confidence` | String | NO | Confidence level | String | 096 (confidence) |
| `marketCondition` | String | NO | Context (e.g., Choppy) | String | 096 (market condition) |
| `mistakes` | String | NO | Documented errors | String | 098 (mistake tracking) |
| `ruleAdherence`| String | NO | Did user follow rules | String | 098 (rule adherence) |
| `reviewType` | String | YES | Distinguish entry types | Enum: TRADE, DAILY, WEEKLY, MONTHLY | 099 (review types) |
| `strategyId` | String | NO | Linked strategy | Valid Strategy | 096 (strategy) |
| `orderId` | String | NO | Linked paper order | Valid Order | 095 (linked trades) |
| `positionId` | String | NO | Linked paper position | Valid Position | 095 (linked trades) |
| `createdAt` | DateTime | YES | Timestamp of entry | Date | Standard |
| `updatedAt` | DateTime | YES | Timestamp of update | Date | Standard |

*   **Indexes**: `[userId]`, `[reviewType]`, `[createdAt]`
*   **Delete Behavior**: Cascade on `User` deletion.

## 7. JournalTag Model

**Decision**: Option B (Normalized `JournalTag` linked to `JournalEntry`).

| Field | Type | Required | Purpose |
| ----- | ---- | -------- | ------- |
| `id` | String | YES | Primary Key (cuid) |
| `name` | String | YES | The tag text (e.g., "Breakout") |
| `journalEntryId`| String | YES | Link to parent entry |
| `userId` | String | YES | Ownership (prevents leaking tags to other users) |

*   **Unique Constraint**: `@@unique([journalEntryId, name])`
*   **Cascade Behavior**: Cascade delete when `JournalEntry` is deleted.
*   **Sharing**: Tags are strictly private and NOT shared between users.

## 8. JournalAttachment Model

**Decision**: Normalized metadata model. File upload implementations (S3, etc.) are deferred if not already established; UI can capture standard URL strings.

| Field | Type | Required | Purpose |
| ----- | ---- | -------- | ------- |
| `id` | String | YES | Primary Key (cuid) |
| `journalEntryId`| String | YES | Parent entry |
| `fileUrl` | String | YES | Storage reference/URL |
| `fileName` | String | NO | Original filename |
| `fileType` | String | NO | MIME type (e.g., image/png) |
| `createdAt` | DateTime | YES | Upload timestamp |

*   **Ownership**: Inherited from `JournalEntry`.
*   **Deletion Behavior**: Cascade delete when `JournalEntry` is deleted.
*   **Access Control**: Private. Verified via parent `JournalEntry` ownership.

## 9. Relationship Matrix

*   **User -> JournalEntry**: 1:N (Required). User owns the entry. Cascade delete.
*   **JournalEntry -> JournalTag**: 1:N. Owned by entry. Cascade delete.
*   **JournalEntry -> JournalAttachment**: 1:N. Owned by entry. Cascade delete.
*   **JournalEntry -> Strategy**: N:1 (Optional). Strategy must belong to the same `userId`. Null set on Strategy deletion.
*   **JournalEntry -> Position**: N:1 (Optional). Position must belong to an account owned by the `userId`. Set null on Position deletion.
*   **JournalEntry -> Order**: N:1 (Optional). Order must belong to an account owned by the `userId`. Set null on Order deletion.
*   **JournalEntry -> BacktestTrade**: NOT INCLUDED. Source 095 strictly targets "paper-trading / broker feed".

## 10. Ownership/Security Model

*   **Authentication**: All endpoints require `AuthGuard`.
*   **IDOR Protection**: The API will verify that the `userId` of the requesting user matches the `userId` of the `JournalEntry`.
*   **Nested Validation**: When linking a `strategyId`, `orderId`, or `positionId` via POST/PATCH, the backend MUST verify that the target object also belongs to the requesting `userId`.
*   **Anonymous**: Returns `401 Unauthorized`.
*   **Unauthorized Object Access**: Returns `403 Forbidden` or `404 Not Found`.

## 11. Private/Public Boundary

*   **Private by Default**: All journal entries, tags, and attachments are strictly private.
*   **Social Deferment**: Phase 6 does NOT implement public journals, follower access, social feeds, or likes.

## 12. API Proposal

*   `POST /api/v1/journal`
    *   **Body DTO**: `reviewType`, `notes`, `emotion`, `setup`, `strategyId`, `orderId`, `positionId`, `tags` (string array).
    *   **Validation**: Verify linked IDs belong to `userId`.
*   `GET /api/v1/journal`
    *   **Filtering**: `reviewType`, `strategyId`, `tags`, `startDate`, `endDate`.
    *   **Pagination**: `limit`, `offset`.
    *   **Response**: Array of `JournalEntryDto`.
*   `GET /api/v1/journal/:id`
    *   **Response**: `JournalEntryDto` with tags and attachments.
    *   **Security**: Ownership check.
*   `PATCH /api/v1/journal/:id`
    *   **Body DTO**: Partial update of fields.
    *   **Security**: Ownership check.
*   `DELETE /api/v1/journal/:id`
    *   **Security**: Ownership check.

*(Note: Raw Prisma entities will not be returned; Prisma errors will be caught and mapped to standard HTTP exceptions).*

## 13. Frontend Proposal

*   `/journal` — List view with filters (Type, Date, Tags, Setup, Emotion).
*   `/journal/new` — Creation form with contextual tabs (Context, Psychology, Review).
*   `/journal/:id` — Detail view rendering all qualitative data and attached screenshots.
*   **Paper Trading UI Hooks**: Add a "Journal this" action to the existing `Position` and `Order` UI components to pre-fill the `orderId` or `positionId`.

## 14. Phase Boundaries

Phase 6 **does NOT** implement:
*   Live trading / real money / broker execution.
*   Copy trading.
*   Social feed / trader following / public journals.
*   AI journal analysis / mistake detection / autonomous recommendations.
*   A new historical P&L execution engine.
*   `ClosedTrade` historical reconstruction.

## 15. Deferred Items

*   Automatic background journal creation (e.g., via OrderFill hooks).
*   Broker feed imports.
*   Cloud storage integration (unless a provider exists in the repo, UI uses standard URLs).
*   AI-driven insights.

## 16. Open Architectural Questions

*   NONE. All requirements are deterministically resolved or explicitly deferred based on source insufficiencies.

# Phase 6 — Trading Journal Scope

## A. Source Feature Mapping

The following exact feature specifications from `trademaster-features/features_md/` define the scope of Phase 6:

*   **095-manual-imported-or-automatic-trade-entry.md** (Manual, imported, or automatic trade entry)
*   **096-entry-exit-reason-strategy-setup-emotion-confidence-market-condition.md** (Entry/exit reason, strategy, setup, emotion, confidence, market condition)
*   **097-screenshots-tags-notes.md** (Screenshots, tags, notes)
*   **098-mistake-tracking-and-rule-adherence.md** (Mistake tracking & rule adherence)
*   **099-post-trade-review.md** (Post-trade review (daily, weekly, monthly))

## B. Phase 6 Objective

The objective of Phase 6 is to provide users with a comprehensive Trading Journal to support the platform's core product loop (Learn → Practice → Analyze → Discover → Follow → Copy → Review → Improve). It enables users to manually or automatically enter trade records, log contextual decisions (emotions, reasons, setups), track mistakes, and perform structured daily/weekly/monthly post-trade reviews.

## C. Functional Requirements

Based strictly on the source specifications, the implemented capabilities must include:

1.  **Trade Entry Creation**: Create journal entries manually, or automatically imported from linked paper-trading trades.
2.  **Context Logging**: Add entry reason, exit reason, setup, emotion, confidence, and market condition to journal entries.
3.  **Media & Organization**: Attach screenshots, assign custom tags, and add unstructured notes.
4.  **Behavioral Tracking**: Log mistakes and track rule adherence.
5.  **Review Rituals**: Create post-trade reviews structured by frequency (daily, weekly, monthly).
6.  **Data Operations**: Standard CRUD (Create, Read, Update, Delete) operations for the user's own journal entries.

## D. Journal Data Model

**Proposed Entities:**

### 1. `JournalEntry`
*   **Purpose**: The core record for a single journalized event (either a specific trade or a time-based review).
*   **Fields**: `id`, `title`, `notes`, `entryReason`, `exitReason`, `setup`, `emotion`, `confidence`, `marketCondition`, `mistakes`, `ruleAdherence`, `reviewType` (e.g., TRADE, DAILY, WEEKLY, MONTHLY), `createdAt`, `updatedAt`
*   **Ownership**: `userId` (relation to `User`)
*   **Relationships**: `strategyId` (optional relation to `Strategy`), `positionId` (optional relation to Paper Trading `Position`), `orderId` (optional relation to Paper Trading `Order`)
*   **Indexes**: `[userId]`, `[createdAt]`
*   **Deletion**: Cascade on User deletion.

### 2. `JournalTag`
*   **Purpose**: Categorization for journal entries.
*   **Fields**: `id`, `name`, `journalEntryId`
*   **Ownership**: Indirect via `journalEntryId`
*   **Deletion**: Cascade on `JournalEntry` deletion.

### 3. `JournalAttachment`
*   **Purpose**: Store references to screenshots or media.
*   **Fields**: `id`, `url`, `fileType`, `journalEntryId`
*   **Ownership**: Indirect via `journalEntryId`
*   **Deletion**: Cascade on `JournalEntry` deletion.

## E. Existing Model Dependencies

*   **`User`**: Needs a one-to-many relationship to `JournalEntry`.
*   **`Strategy`**: Needs a one-to-many relationship to `JournalEntry`.
*   **`Position` (Paper Trading)**: Needs a one-to-many relationship to `JournalEntry`.
*   **`Order` (Paper Trading)**: Needs a one-to-many relationship to `JournalEntry`.

**Architectural Dependency Note**: 
The source specification calls for "linked paper-trading trades". However, Phase 2 Paper Trading does not produce a `ClosedTrade` abstraction (only `Position` and `Order`). Phase 6 must therefore link journal entries directly to `Position` or `Order` records, unless a new `ClosedTrade` aggregation layer is built (which is out of scope for discovery).

## F. API Proposal

*   **`POST /api/v1/journal`**: Create a new journal entry (manual or linked).
*   **`GET /api/v1/journal`**: List user's journal entries (supports filtering by `reviewType`, `strategyId`, date).
*   **`GET /api/v1/journal/:id`**: Retrieve a specific journal entry.
*   **`PATCH /api/v1/journal/:id`**: Update a journal entry (tags, notes, fields).
*   **`DELETE /api/v1/journal/:id`**: Delete a journal entry.
*   **`POST /api/v1/journal/:id/attachments`**: Add an attachment (screenshot URL).
*   **`DELETE /api/v1/journal/attachments/:id`**: Remove an attachment.

**Authentication & Ownership**: All endpoints require authentication. Users can only read, update, or delete entries where `userId` matches the authenticated session.

## G. UI Proposal

*   **Journal Dashboard**: A high-level view of recent journal entries and reviews.
*   **Journal Entry Editor / Detail**: A dedicated form to log context (emotion, setup, mistakes, etc.) and view screenshots.
*   **Post-Trade Review Interface**: A specialized view for Daily/Weekly/Monthly reflection.
*   **Journal List / Search**: A table or card layout with filters for tags, date, and review type.

## H. Security & Ownership

*   **Anonymous**: `401 Unauthorized`.
*   **Owner**: Has full CRUD access to their own `JournalEntry` records.
*   **Other Authenticated User**: `403 Forbidden` or `404 Not Found` when attempting to access another user's journal.
*   **Privacy**: Journal entries are completely private by default. The source specifications do not mandate public sharing or social feeds for this module.

## I. Search/Filtering

Supported filtering capabilities via API and UI:
*   Date ranges (`createdAt`)
*   Review type (Trade vs Daily vs Weekly vs Monthly)
*   Strategy (`strategyId`)
*   Tags
*   Emotions / Setups (basic exact-match filtering)

## J. Attachments

*   **Screenshots**: Supported via `JournalAttachment`. 
*   **Storage**: A URL reference will be stored. (Cloud storage bucket implementation is deferred unless pre-established by the repository).

## K. Analytics Boundary

*   Phase 6 handles the **persistence** of qualitative data (mistakes, emotions, rules).
*   Phase 6 does NOT generate quantitative financial metrics (P&L, Drawdown, Expectancy). It relies on Phase 5 for any financial performance data displayed during a journal review.
*   Any aggregated reporting of mistakes or emotions (e.g., "Win rate when feeling Fear") bridges both modules, but Phase 6 is strictly responsible for capturing the qualitative side.

## L. AI Boundary

*   Features such as "Journal patterns, repeated mistakes, rule violations" (Feature 111) and "Trading concept Q&A, journal analysis" (Feature 107) belong explicitly to **Module N. AI Trading Coach**.
*   **Phase 6 is strictly deterministic.** AI mistake detection, pattern discovery, and automatic trade explanations are DEFERRED to later AI phases.

## M. Explicit Exclusions

Phase 6 will **NOT** implement:
*   Public journals, trader following, or social feeds.
*   Copy trading.
*   Live broker execution integrations.
*   AI analysis or autonomous trading.
*   A new `ClosedTrade` financial tracking engine.
*   Guaranteed returns or fabricated market data.

## N. Implementation Order

1.  **Database Migration**: Add `JournalEntry`, `JournalTag`, `JournalAttachment` models. Add relationships to `User`, `Strategy`, `Position`, `Order`.
2.  **Backend CRUD**: Implement `JournalController` and `JournalService`.
3.  **Backend Tests**: Write unit/e2e tests guaranteeing ownership isolation and validation.
4.  **Frontend Integration**: Build the Journal Dashboard, Editor, and List pages.
5.  **Paper Trading Linking**: Implement the "automatic/imported" creation of a journal entry from an executed paper order or position.

## O. Acceptance Criteria

*   Prisma schema updated with new Journal models.
*   Journal entries can be created manually and linked to a Phase 2 Paper Trading entity.
*   Qualitative fields (emotion, setup, mistakes, rule adherence) can be persisted and retrieved.
*   Post-trade review types (Daily, Weekly, Monthly) are supported.
*   Strict ownership isolation is enforced (no cross-user access).
*   Static audit passes (0 `any`, `ts-ignore`, etc.).
*   Full E2E regression suite passes.

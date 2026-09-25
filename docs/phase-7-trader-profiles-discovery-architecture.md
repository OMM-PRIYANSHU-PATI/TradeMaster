# Phase 7 — Trader Profiles + Discovery Architecture

## 1. Executive Summary
Phase 7 introduces Trader Profiles and Discovery mechanisms by surfacing existing Phase 5 analytics, strategies, and user identity information. All social mechanisms (Following, Copying, Comments) are strictly deferred. Where the source specifications are silent on formulas (e.g., Trending) or infrastructure (e.g., Avatar storage, URL slugs), those implementation details are deferred to prevent inventing unapproved logic.

## 2. Exact Source Feature Mapping
| Feature ID | Title | Phase 7 Relevance | Requirements Summary |
|---|---|---|---|
| 009 | Profile (name, avatar, bio) | Core | Profile fields. |
| 010 | Trading profile | Core | Experience, markets, risk. |
| 060 | Search / filter / sort traders | Core | Discovery via search, filters, sorting. |
| 061 | Trending traders... | Core | Discovery categorizations. |
| 062 | Strategy categories... | Core | Filter categories. |
| 063 | Historical performance... | Core | Analytics display. |
| 064 | Followers & public activity | Deferred | Following is Phase 8. |
| 065 | Saved traders | Core | Bookmarking profiles. |
| 066 | Compare traders | Core | Multi-trader comparison. |
| 067 | Profile, bio, experience... | Core | Extended bio/trading preferences. |
| 068 | Performance history... | Core | Profile-level risk and stats. |
| 069 | Trade history & portfolio... | Core | Optional position exposure. |
| 070 | Recent posts, education... | Deferred | Content is deferred. |
| 071 | Followers / following | Deferred | Following is Phase 8. |
| 072 | Verification status... | Core | Badges and legal texts. |
| 073 | Copy eligibility | Deferred | Copying is deferred. |
| 074 | Strategy statistics... | Core | Public strategy stats. |

## 3. Existing Architecture
The existing architecture contains `User`, `Profile` (first/last name), `Strategy`, `PaperTradingAccount`, `PaperTradingLedger`, `BacktestRun`, and Phase 5 analytics engines. It does not contain an avatar storage service, username system, or live-trading performance engine.

## 4. Trader Profile Architecture
Profiles act as a public-facing read-only aggregation of a user's Phase 1 identity and Phase 5 analytics. No new analytics engine will be built.

## 5. Profile Field Matrix
| Field | Existing/New | Model | Type | Required | Public | Source Feature | Notes |
| ----- | ------------ | ----- | ---- | -------- | ------ | -------------- | ----- |
| firstName | Existing | Profile | String | Yes | Yes | 009 | SOURCE-DEFINED. |
| lastName | Existing | Profile | String | Yes | Yes | 009 | SOURCE-DEFINED. |
| avatarUrl | New | Profile | String | No | Yes | 009 | SOURCE-DEFINED (Field only). |
| bio | New | Profile | String | No | Yes | 067 | SOURCE-DEFINED. |
| experienceLevel | New | Profile | String | No | Yes | 010 | SOURCE-DEFINED. |
| riskPreference | New | Profile | String | No | Yes | 010 | SOURCE-DEFINED. |
| marketsTraded | New | Profile | String[] | No | Yes | 067 | SOURCE-DEFINED. |
| isVerified | New | Profile | Boolean | Yes | Yes | 072 | SOURCE-DEFINED. |
| isPublic | New | Profile | Boolean | Yes | No | Implicit | ARCHITECTURAL DECISION REQUIRED BECAUSE SOURCE IS SILENT. Controls public visibility. |

## 6. Public/Private Visibility Matrix
| Data | Owner | Authenticated Users | Unauthenticated Users | Never Public | Source |
| ---- | ----: | ------------------: | --------------------: | -----------: | ------ |
| Display name | Yes | Yes | Yes | - | 009 |
| Avatar, Bio, Experience | Yes | Yes | Yes | - | 009, 067 |
| Email / Phone | Yes | - | - | Yes | Phase 1 |
| User UUID | Yes | Yes | Yes | - | API necessity |
| Paper Account Balance | Yes | - | - | Yes | 069 (Raw bal private) |
| Position / Trade History | Yes | Opt-in | Opt-in | - | 069 |
| Analytics (Backtest/Paper)| Yes | Opt-in | Opt-in | - | 068 |
| Strategy Metadata | Yes | Opt-in | Opt-in | - | 086, 074 |
| Strategy Code/Rules | Yes | - | - | Yes | Implicit Privacy |
| Journal Entries | Yes | - | - | Yes | Phase 6 |
| Saved Traders | Yes | - | - | Yes | 065 |

## 7. Identity / URL Architecture
- **Requirement search:** Features do not define `username`, `slug`, `handle`, `profile URL`, etc.
- **Classification:** DEFERRED — SOURCE INSUFFICIENT
- **Architecture:** The API will use the existing stable `userId` (UUID/CUID) for public routing. No schema changes will be made to invent a username system.

## 8. Discovery Architecture
- **Search capability:** SOURCE-DEFINED (060).
- **Filter capability:** SOURCE-DEFINED (062).
- **Sort capability:** SOURCE-DEFINED (060).
- **Compare capability:** SOURCE-DEFINED (066).

## 9. Search Architecture
- **What can users search:** Names.
- **Classification:** SOURCE-DEFINED (060).
- **Architecture:** Basic SQL `ILIKE` on `firstName` and `lastName`.
- **Full-text search (Elasticsearch):** DEFERRED — SOURCE INSUFFICIENT.

## 10. Filter Architecture
- **What can users filter by:** Strategy categories, risk categories, time horizon, markets.
- **Classification:** SOURCE-DEFINED (062).
- **Architecture:** Database `WHERE` clauses matching the `Profile` array/enum fields.

## 11. Sort Architecture
- **What can users sort by:** Basic fields like creation date.
- **Classification:** SOURCE-DEFINED (060).
- **Architecture:** Basic sorting on database columns.

## 12. Trending Trader Architecture
- **What is required:** "Trending traders" categorization.
- **Classification:** 
  - UI capability: SOURCE-DEFINED
  - Ranking algorithm: DEFERRED — SOURCE INSUFFICIENT
- **Architecture:** The API will not implement an undocumented trending math engine. No undocumented ranking formula may enter the database or API.

## 13. Performance Architecture
- **Paper Trading Performance:** SOURCE-DEFINED (Phase 5). Exposed via profile API.
- **Backtest Performance:** SOURCE-DEFINED (Phase 5). Exposed via profile API.
- **Real-Money Performance:** DEFERRED — broker execution not implemented.
- **Architecture:** No new analytics engine will be created. 

## 14. Strategy Visibility
- **Public fields exposed:** Strategy name, description, type, Phase 5 backtest results. (SOURCE-DEFINED).
- **Private fields:** Actual trading rules, code, parameters.
- **Cloning/Copying:** DEFERRED.

## 15. SavedTrader Architecture
- **Source feature:** 065-saved-traders.md
- **Exact requirement:** "Saved traders" capability for discovery.
- **Why SavedTrader is required:** To persist a many-to-many bookmark relationship.
- **Confirmation:** SavedTrader != Following. Following remains deferred.
- **Classification:** SOURCE-DEFINED.

## 16. Following Boundary
- **Source-defined features:** 081 "Follow / unfollow trader" is in Module J (Following).
- **Classification:** DEFERRED — SOURCE INSUFFICIENT for Phase 7 (Modules G & H). No `Follow` or `SocialGraph` models will be created.

## 17. Avatar / Storage Boundary
- **Source feature:** 009 requires an "Avatar".
- **Existing infrastructure:** Phase 6 attachments use raw URLs with no upload provider. No approved storage abstraction exists.
- **Classification:** DEFERRED — no existing approved storage abstraction.
- **Architecture:** The profile will include an `avatarUrl` String field, but file upload APIs and storage infrastructure will not be introduced.

## 18. Security / Privacy Architecture
- User A cannot modify User B profile.
- User A cannot access User B private profile/trading/journal data.
- User A can only manage User A SavedTrader records.
- Public profile responses contain only approved public fields.

## 19. Data Model
### New models
**Model:** `SavedTrader`
**Purpose:** Bookmark traders (Feature 065).
**Fields:**
- `id` (String, Required, @id)
- `userId` (String, Required)
- `savedUserId` (String, Required)
- `createdAt` (DateTime, Required)
**Indexes:** `userId`, `savedUserId`
**Unique constraints:** `[userId, savedUserId]`
**Relations:** Belongs to `User` (owner), belongs to `User` (savedTrader).
**Ownership:** Owned by `userId`.
**Cascade behavior:** Cascade delete if `User` is deleted.
**Source feature:** 065

### Existing models requiring changes
**Model:** `Profile`
**Field/relation:** Add `avatarUrl`, `bio`, `experienceLevel`, `riskPreference`, `marketsTraded`, `isVerified`, `isPublic`.
**Reason:** To support public profile requirements.
**Source feature:** 009, 010, 067, 072.

## 20. Relationship Matrix
- `User` 1:n `SavedTrader` (as owner)
- `User` 1:n `SavedTrader` (as target)

## 21. API Architecture
```http
GET    /api/v1/traders                 (Public/Auth - Search/filter public profiles)
GET    /api/v1/traders/:id             (Public/Auth - View public profile & stats)
GET    /api/v1/traders/:id/strategies  (Public/Auth - View public strategies)
POST   /api/v1/traders/saved/:id       (Auth - Save trader)
DELETE /api/v1/traders/saved/:id       (Auth - Unsave trader)
GET    /api/v1/traders/saved           (Auth - List saved traders)
PATCH  /api/v1/profile/trading-prefs   (Auth - Update own bio/markets/risk)
```
- **Validation:** Standard DTOs.
- **Public fields only:** `GET /traders/:id` drops email and raw balances. No Prisma models exposed directly.

## 22. Frontend Architecture
- `/traders`: Directory with search/filters and trader cards.
- `/traders/[id]`: Profile detail view (bio, stats, strategies).
- `/profile/edit`: Add tabs for Bio, Avatar URL, and Preferences.
- `/traders/compare`: UI to select and view metrics side-by-side.

## 23. Deferred Items
- Trending Traders Formula
- Public Profile Identifier (slug/username)
- Avatar Storage Provider
- Following, Followers, Social Graph
- Posts, Comments, Feeds
- Copy Trading
- Real-Money Performance

## 24. Architectural Decisions
Decision: Trending Trader Formula
Status: DEFERRED / SOURCE-DEFINED (UI capability only)
Reason: Feature 061 requires trending discovery, but provides no mathematical formula.

Decision: Public Profile Identifier
Status: DEFERRED — SOURCE INSUFFICIENT
Reason: Source is entirely silent on usernames/slugs. We will use the existing `userId` UUID.

Decision: Avatar Storage
Status: DEFERRED / EXISTING ABSTRACTION (URL string only)
Reason: Feature 009 requires an avatar, but no approved storage abstraction exists. We will store an `avatarUrl` string without introducing S3/Supabase.

Decision: SavedTrader
Status: REQUIRED
Reason: Feature 065 explicitly requires saving/bookmarking traders.

## 25. Remaining Source-Blocked Questions
- NONE (All missing source details have been formally deferred, leaving the architecture fully unblocked for safe implementation).

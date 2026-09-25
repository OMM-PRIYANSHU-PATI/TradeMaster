# Phase 7 — Trader Profiles + Discovery Scope

## 1. Executive Summary
Phase 7 focuses strictly on Trader Profiles and Trader Discovery. It exposes existing user identity, trading preferences, and Phase 5 analytics metrics (Backtest and Paper Trading) into a public or discoverable directory. It explicitly defers all social mechanics (Following, Copying, Feeds) to later phases while establishing the core visibility boundary for a trader's performance and strategies.

## 2. Exact Source Feature Mapping
| Feature ID | Filename | Title | Phase 7 Relevance | Requirements Summary |
|---|---|---|---|---|
| 009 | `009-profile.md` | Profile (name, avatar, bio) | Core | Basic identity fields (name, avatar, bio) |
| 010 | `010-trading-profile.md` | Trading profile | Core | Experience level, markets traded, risk preference |
| 060 | `060-search-filter-sort-traders.md` | Search / filter / sort traders | Core | Discovering traders via search, filtering, and sorting |
| 061 | `061-trending-traders-new-traders-verified-traders.md` | Trending traders, new traders, verified traders | Core | Categorization and discovery buckets |
| 062 | `062-strategy-categories-risk-categories-time-horizon-markets.md` | Strategy categories, risk... | Core | Filtering traders by their strategies and preferences |
| 063 | `063-historical-performance-drawdown-volatility-consistency-metrics.md` | Historical performance... | Core | Exposing Phase 5 metrics on trader profiles |
| 064 | `064-followers-and-public-activity.md` | Followers & public activity | Deferred | Social follower tracking (Deferred to Phase 8) |
| 065 | `065-saved-traders.md` | Saved traders | Core | Bookmarking/saving traders for quick reference |
| 066 | `066-compare-traders.md` | Compare traders | Core | Side-by-side metric comparison |
| 067 | `067-profile-bio-experience-markets-strategy-description.md` | Profile, bio, experience... | Core | Extended bio and market preferences |
| 068 | `068-performance-history-risk-metrics-drawdown-volatility.md` | Performance history... | Core | Profile-level risk and performance display |
| 069 | `069-trade-history-and-portfolio-composition.md` | Trade history & portfolio... | Core | Optional exposure of trading ledgers and positions |
| 070 | `070-recent-posts-education-content.md` | Recent posts, education... | Deferred | Content/posts (Deferred to Content phase) |
| 071 | `071-followers-following.md` | Followers / following | Deferred | Following mechanism (Deferred to Phase 8) |
| 072 | `072-verification-status-and-disclosure-statements.md` | Verification status & discl... | Core | Badges/flags for verified traders and legal text |
| 073 | `073-copy-eligibility.md` | Copy eligibility | Deferred | Copy trading status (Deferred to Copy phase) |
| 074 | `074-strategy-statistics-and-performance-periods.md` | Strategy statistics... | Core | Display of specific strategy performance |

## 3. Existing Architecture Analysis
The current architecture contains:
- `User` and `Profile` (Basic identity, authentication)
- `PaperTradingAccount`, `PaperTradingLedger`, `Position`, `Order` (Phase 2 simulated trading)
- `BacktestRun`, `BacktestMetric`, `Strategy` (Phase 3/4 testing and metrics)
- Analytics engines (Phase 5) which can dynamically calculate missing stats.

Existing data is sufficient to support basic profiles and performance rendering without duplicating financial records. 

## 4. Trader Profile Definition
| Field | Type | Required | Source Feature | Existing Source | Purpose |
|---|---|---|---|---|---|
| Name | String | Yes | 009 | `Profile.firstName/lastName` | Identity |
| Avatar | String | No | 009 | None (New) | Visual identity |
| Bio | String | No | 067 | None (New) | Identity context |
| Experience Level | Enum | No | 010 | None (New) | Trading preference |
| Risk Preference | Enum | No | 010 | None (New) | Trading preference |
| Markets Traded | String[] | No | 067 | None (New) | Trading preference |
| Is Verified | Boolean | Yes | 072 | None (New) | Trust/compliance |
| Performance | Derived | No | 068 | Phase 5 Analytics | Profile stats |

## 5. Identity Architecture
- **Username system:** Not explicitly defined by source features. Traders are identified by `firstName` and `lastName`.
- **URL Routing:** Profiles should be routed by the underlying database `User ID` or a deterministic, system-generated un-editable `slug` (e.g. `john-doe-1234`).
- **Uniqueness:** Names are not unique. IDs are unique.

## 6. Public/Private Visibility Matrix
| Data | Public | Private | Owner-only | Deferred |
|---|:---:|:---:|:---:|:---:|
| Display name | Yes | - | - | - |
| Avatar / Bio | Yes | - | - | - |
| Experience / Markets | Yes | - | - | - |
| Email / Phone | - | - | Yes | - |
| Raw Paper Balance | - | - | Yes | - |
| P&L / Drawdown (Opt-in) | Yes | - | - | - |
| Strategy Rules/Code | - | - | Yes | - |
| Strategy Metrics | Yes | - | - | - |
| Follower count | - | - | - | Yes |
| Posts / Feed | - | - | - | Yes |

## 7. Discovery Requirements
- **Source-supported:** Search by name (060), Filter by strategy categories/risk/markets (062), Compare traders (066), Saved traders (065).
- **Not source-supported:** Copy-trading filters, AI matchmaking.
- **Deferred:** Following, feed-based discovery.

## 8. Search Architecture
`simple database search`
TradeMaster currently requires basic filtering (e.g., `WHERE riskPreference = 'HIGH' AND markets CONTAINS 'CRYPTO'`) and substring matching on names. Dedicated search engines (Elasticsearch) are NOT justified by the source requirements and should not be introduced.

## 9. Ranking/Sorting Analysis
Feature 061 calls for "Trending traders". 
**DO NOT INVENT A RANKING FORMULA.**
The source does not specify the metric, formula, timeframe, or risk-adjustment required to define "Trending". This is an architectural dependency that must be resolved by Product/Business before implementation. Discovery will default to basic creation-date or alphabetical sorting until a formula is provided.

## 10. Performance Data Architecture
Supported data sources:
- `Paper Trading performance` (Simulated live performance)
- `Backtest performance` (Historical simulation)
TradeMaster has **no broker/live execution phase**. Real-money performance DOES NOT EXIST and cannot be displayed. Performance views will strictly proxy Phase 5 analytics engines and clearly demarcate "Simulated" vs "Backtest" metrics to satisfy feature 114 (No fabricated data).

## 11. Strategy Visibility
Profiles can expose `strategies` and `strategy statistics` (086, 074).
- **Ownership:** Belongs to the profile owner.
- **Visibility:** Public metadata and Phase 5 performance metrics only.
- **Configuration:** Strategy source code and internal parameters remain Private/Owner-only.
- **Cloning:** Copying/cloning is DEFERRED to the Copy Trading phase.

## 12. Following Boundary
Following is DEFERRED to Phase 8.
Do not create `Follow`, `Follower`, or `SocialGraph` models. 

## 13. Security/Privacy Model
- User A cannot modify User B's profile.
- User A cannot expose User B's private financial data.
- User A cannot use another user's strategy/profile IDs to access private data.
- Opt-in privacy: Performance data must require explicit user opt-in (default private) before becoming public.

## 14. Proposed New Models
- `SavedTrader`
  - Purpose: Feature 065 (Bookmark/save a trader for later)
  - Fields: `id` (String), `userId` (String), `savedUserId` (String), `createdAt` (DateTime)
  - Relations: Belongs to `User` (owner) and `User` (target)
  - Unique Constraint: `[userId, savedUserId]`

## 15. Existing Models Requiring Relationships
- `Profile`: Requires schema expansion to support Phase 7 fields (`avatarUrl`, `bio`, `experienceLevel`, `riskPreference`, `marketsTraded`, `isVerified`, `isPublic`). 
- `User`: Will relate to `SavedTrader`.

## 16. API Proposal
```http
GET    /api/v1/traders                 (Search/filter public profiles)
GET    /api/v1/traders/:id             (View public profile & stats)
GET    /api/v1/traders/:id/strategies  (View public strategies)
POST   /api/v1/traders/saved/:id       (Save trader - Feature 065)
DELETE /api/v1/traders/saved/:id       (Unsave trader)
PATCH  /api/v1/profile/trading-prefs   (Update own bio/markets/risk)
```

## 17. Frontend Proposal
- `/traders`: Discovery directory, search bar, market/risk filters, list of trader cards.
- `/traders/[id]`: Public profile, displaying bio, badges, simulated performance charts (via Phase 5 APIs), and public strategies.
- `/profile/edit`: Existing page expanded with new tabs for Bio, Avatar, and Trading Preferences.
- `/traders/compare`: Side-by-side metric comparison view (Feature 066).

## 18. Phase Boundaries
Phase 7 explicitly DOES NOT implement: live trading, broker integration, copy trading, social feeds, comments, likes, messaging, trader following, or AI recommendations. 

## 19. Deferred Items
- Following and Followers (Phase 8)
- Posts and Education Content (Content Phase)
- Copy Trading (Copy Phase)
- Real-money performance (Live Trading Phase)

## 20. Open Architectural Questions
- What is the exact mathematical formula and timeframe for sorting "Trending traders" (Feature 061)?
- Should profiles use an un-editable system-generated slug for URLs, or just the UUID?
- Are trader avatars uploaded to local storage, or do we rely on an external provider (e.g. Gravatar)?

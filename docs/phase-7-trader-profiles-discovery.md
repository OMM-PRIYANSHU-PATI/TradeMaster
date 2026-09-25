# Phase 7 — Trader Profiles + Discovery

## Implemented Profile Fields
The `Profile` model has been extended with the following public-facing fields:
- `avatarUrl` (String, optional): URL to the trader's avatar.
- `bio` (String, optional): Short biographical text.
- `experienceLevel` (String, optional): Enum/string for experience (e.g. BEGINNER, INTERMEDIATE, EXPERT).
- `riskPreference` (String, optional): Enum/string for risk tolerance (e.g. LOW, MEDIUM, HIGH).
- `marketsTraded` (String[], optional): Array of markets the trader operates in (e.g. CRYPTO, FOREX, STOCKS).
- `isVerified` (Boolean, default false): Indicates if the trader has been verified by the platform.
- `isPublic` (Boolean, default false): Controls whether the profile is discoverable in the public directory.

## Public / Private Boundary
The API strictly enforces the public/private boundary:
- **Public endpoints** (`GET /api/v1/traders/:id`) only return approved public fields (firstName, lastName, bio, experience, markets, etc.) and explicitly drop `email`, `passwordHash`, and internal identifiers.
- **Private data** (financial transactions, raw account balances, private journal entries) is protected by AuthGuard and owner-only checks.
- A user must set `isPublic: true` via `/api/v1/profile/trading-prefs` to appear in search results.

## Discovery & Search
- Traders can be searched by name (`firstName` or `lastName` using a case-insensitive `contains` query).
- Search only returns profiles with `isPublic: true`.

## Filters
Users can filter the public trader directory by:
- `experienceLevel`
- `riskPreference`
- `market` (checks if the market exists in the `marketsTraded` array)

## Sorting
Traders can be sorted using `sortBy`:
- `newest` (Creation date descending)
- `oldest` (Creation date ascending)
- `alphabetical` (First name ascending)

## SavedTrader
- Implemented the `SavedTrader` model representing a bookmarking (many-to-many) relationship.
- Users can save a trader, view their saved list, and remove saved traders.
- Self-saving and duplicate saving is explicitly prevented.
- A user cannot modify another user's SavedTrader list.

## API Endpoints
- `PATCH /api/v1/profile/trading-prefs`: Update public trading preferences.
- `GET /api/v1/traders`: Search and filter public profiles (pagination supported).
- `GET /api/v1/traders/saved`: List authenticated user's saved traders.
- `GET /api/v1/traders/:id`: Get a specific public profile.
- `GET /api/v1/traders/:id/strategies`: Get public strategies for a trader.
- `POST /api/v1/traders/saved/:id`: Save a trader profile.
- `DELETE /api/v1/traders/saved/:id`: Remove a saved trader profile.

## Frontend Routes
- `/traders`: Directory with search/filters and trader cards.
- `/traders/[id]`: Profile detail view (bio, stats, strategies).
- `/profile/edit`: Edit Trading Profile UI.

## Security
- All modifications are protected by `AuthGuard`.
- IDOR is prevented by relying on `@CurrentUser()` to extract the authenticated user's ID for all mutation and private read operations.
- Cross-user mutation is impossible because the `userId` in `WHERE` clauses is strictly derived from the session token.

## Deferred Items
The following items were explicitly deferred according to the architecture review because the source requirements did not sufficiently define their mechanics:
- **Trending Traders Formula**: No mathematical formula was provided. The UI/API structure exists (sort), but an undocumented algorithm was not invented.
- **Public Profile Identifier**: The UUID is used in URLs (e.g., `/traders/[id]`). No custom `slug` or `username` system was invented.
- **Avatar Storage Provider**: The `avatarUrl` is stored as a String reference. No S3/Supabase infrastructure was introduced.
- **Following, Followers, Social Graph**: Deferred to Phase 8.
- **Posts, Comments, Feeds**: Deferred.
- **Copy Trading**: Deferred.
- **Real-Money Performance**: Deferred.

## Tests
- End-to-end tests exist in `apps/api/test/traders.e2e-spec.ts`.
- Tests verify profile update/read, cross-user isolation, public exposure boundary, search, filtering, sorting, pagination, and SavedTrader mechanics.

## Known Limitations
- The trader directory relies on standard PostgreSQL indices. It does not use Elasticsearch or similar full-text search engines.
- `marketsTraded` filter expects an exact case-sensitive string match for the array element (e.g., 'CRYPTO').

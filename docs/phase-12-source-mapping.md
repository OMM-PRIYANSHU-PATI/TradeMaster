# Phase 12: Live Market Data — Source Mapping & Boundary Audit

## 1. Source-Defined Requirements (IMPLEMENTED + VERIFIED)
- **Market Data Integration (Feature 041):** Requires retrieving external quotes.
  - *Result:* Built `MarketDataService` to query provider and fallback to cache.
  - *Note:* The source does not specify a mandatory external vendor (like Polygon or Alpaca). We built a configurable `MarketDataProvider` abstraction and a strict `MockMarketProvider` for testing boundaries without forcing vendor lock-in.
- **Position Management & Watchlists (Feature 043 & 084):** Requires watchlist creation, update, delete, adding/removing instruments, and listing.
  - *Result:* Built `WatchlistController` and `WatchlistService` with strict ownership (IDOR) checks. Tests cover full CRUD.

## 2. Source Does Not Define (DEFERRED)
- **OHLCV Data & Historical Aggregation:** Not mentioned in any Phase 12 sources. Phase 3 backtesting relies on deterministic injected historical data which remains unchanged.
- **WebSocket / Streaming Quotes:** Source only mentions "integration" and "display". REST polling is sufficient and implemented.
- **Market Status (Open/Close):** Not explicitly requested in the features.
- **Price Alerts:** Mentioned in future scope, but not part of Phase 12 core specs.
- **Frontend UI (Market Watch, Search, Charts):** Backend endpoints exist, but frontend implementation is deferred to subsequent frontend phases as no specific React code was defined in the base markdown for Phase 12.

## 3. Implementation Policy (NOT SOURCE DEFINED)
The original source features **do not define a specific stale-data threshold or provider timeout policy**. 
To ensure system resilience without inventing arbitrary financial rules, we established the following *Implementation Policy*:
- **Stale Data Threshold:** Defaults to 5 minutes but is entirely configurable via `MARKET_DATA_STALE_THRESHOLD_MS`.
- **Explicit API States:** The API response includes a strict `state` property (`LIVE`, `CACHED`, `STALE`, `UNAVAILABLE`). Stale/cached prices will *never* silently pretend to be `LIVE`.
- **Zero Fabrication:** The service will explicitly throw a 404 `UNAVAILABLE` rather than fabricating a fake `$0` price if both the provider and cache fail.

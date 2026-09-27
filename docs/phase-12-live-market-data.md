# Phase 12: Live Market Data

This phase establishes the foundational Market Data module for TradeMaster, providing strict financial precision quotes and user-owned watchlists.

## Capabilities (IMPLEMENTED + VERIFIED)
- **Quotes API**: Fetch real-time market data quotes formatted flawlessly to avoid Javascript floating-point mutation.
- **Provider Fallbacks**: Graceful degradation to previous database states if network failures occur.
- **Watchlists**: Full IDOR-protected lifecycle management (Create, Rename, Read, Delete, Add/Remove Instruments).

## Deferred Scope (SOURCE DOES NOT DEFINE)
- **WebSockets/Streaming**: External updates happen via polling.
- **Historical Data**: Phase 3 backtesting relies on separate deterministic models.
- **UI Integrations**: Deferred to frontend phases.

## Implementation Policy (STALE CACHE)
Since the original features (`041`, `043`) did not define explicit cache eviction policies, an *Implementation Policy* was instituted:
- `MARKET_DATA_STALE_THRESHOLD_MS` defines the boundary between `CACHED` and `STALE` quotes (default: 5 minutes).
- Responses explicitly denote `MarketDataState` avoiding fabricated LIVE statuses.

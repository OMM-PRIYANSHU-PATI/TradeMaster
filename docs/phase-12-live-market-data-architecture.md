# Phase 12: Live Market Data Architecture

## High-Level Data Flow

```text
[ EXTERNAL PROVIDER / MOCK ]
        ↓
MarketDataService 
  (Validation: > 0, Bid <= Ask, Time Checks)
        ↓
   MarketPrice (Cache Storage)
        ↓
MarketController (Formatting -> .toFixed())
        ↓
      USER
```

## Core Abstractions

1. **MarketDataProvider**: Defines a strict `getQuote` interface for any external data vendor.
2. **MockMarketProvider**: Explicitly delineated for test environments. Implements simulated 500s (`ERROR`), timeouts (`TIMEOUT`), and invalid structures (`MALFORMED`). This must never act as a production provider without a conscious deployment configuration.
3. **MarketDataState**: Identifies the exact origin of a price.
   - `LIVE`: Fresh from provider.
   - `CACHED`: From DB within configurable threshold.
   - `STALE`: From DB beyond threshold.
   - `UNAVAILABLE`: Complete provider + cache failure.

## Financial Isolation Rules
The Market module serves as a unidirectional reading and caching pipe. **It does not emit events to or mutate Phase 2's Order or Position entities.** Any integration where live prices trigger limit orders is reserved for the paper execution scheduler, ensuring Phase 2 deterministic backtesting environments remain pristine.

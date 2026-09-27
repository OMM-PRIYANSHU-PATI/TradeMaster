# Phase 17 - Live Virtual Strategy Trading

## Architecture Overview

Phase 17 builds upon the canonical `StrategyExecutionEngine` established in Phase 16 by introducing live, stateful virtual trading. A strategy can be started with an initial capital, and real-time market updates stream in to evaluate buy/sell/hold decisions iteratively without lookahead bias. 

## Virtual Strategy Controller & Service
- `VirtualStrategyModule`: Handles standard CRUD operations and active market data updates for virtual trading.
- Endpoint POST `/api/v1/virtual-strategies/sessions`: Initializes a new virtual trading session linked to a paper trading account and creates a snapshot of the strategy's current configuration.
- Endpoint POST `/api/v1/virtual-strategies/sessions/:id/market-update`: Appends a new market bar to the session's internal `historyBuffer` (using `HistoricalBar`), invokes the `StrategyExecutionEngine` using `historyToNow` (which includes the new bar to satisfy `evaluate` condition requirements), and executes trade intents.

## PaperExecutionAdapter
- Fully replaces the unimplemented `PaperExecutionAdapter` from Phase 16.
- In `apps/api/src/backtest/canonical/paper-execution.adapter.ts`, `executeIntent` opens a `PENDING` order within a Prisma transaction via `PaperExecutionService.executeOrderInternal`, bridging the canonical signal execution with existing Phase 2 paper ledger mechanisms.

## Security & Constraints
- Duplicate concurrent execution processing on `market-update` is rejected with `409 Conflict`.
- Out of order updates reject with `400 Bad Request` to strictly enforce no-lookahead.
- Strategy states are snapshotted (`strategySnapshot`), so subsequent updates to the same strategy do not modify existing sessions.
- Users can pause or stop sessions securely via IDOR constraints (validated against the session's `userId`).

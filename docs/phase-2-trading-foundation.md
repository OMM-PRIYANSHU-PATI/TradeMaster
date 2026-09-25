# TradeMaster Phase 2: Trading Foundation

## Architecture
This phase introduces the core trading abstraction and paper execution engine. The backend serves as the absolute source of truth. All calculations use deterministic decimal arithmetic (via Decimal.js through Prisma). 

## Database Entities
- **Instrument**: Central master of all tradable assets.
- **MarketPrice**: Holds the internal 'PAPER' quotes.
- **PaperTradingAccount**: Holds cash balances for users.
- **PaperTradingLedger**: Immutable ledger representing all balance-changing events.
- **Order**: Represents client intent (MARKET/LIMIT).
- **OrderFill**: Represents execution outputs.
- **Position**: Represents aggregated ownership of an instrument.

## Paper Execution Flow
1. Fetch latest internal price for the requested instrument.
2. Calculate gross value and fees.
3. Validate sufficient cash (BUY) or sufficient position (SELL).
4. Persist Order, OrderFill, Ledger entry, Position, and updated Cash Balance within a **strict database transaction**.
5. Roll back all state if any constraint fails.

## P&L Formulas
- **Market Value**: positionQuantity * currentMarketPrice
- **Cost Basis**: positionQuantity * averageEntryPrice
- **Unrealized P&L**: marketValue - costBasis
- **Realized P&L**: accumulated upon SELL soldQuantity * (executionPrice - averageEntryPrice)

## Fee Policy
- Flat 0.1% fee on the gross value of all paper executions.

## Known Limitations
- THIS IS PAPER TRADING ONLY. NO REAL MONEY IS INVOLVED.
- No live broker integration.
- No short selling, margin, or options.

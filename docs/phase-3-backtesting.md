# Phase 3: Backtesting & Strategy Simulation

## Architecture
- **HistoricalDataProvider**: Abstracts historical market data, providing chronological OHLCV bars.
- **StrategyEngine**: Generates buy/sell signals based on deterministic rules configured via DSL (e.g. `MOVING_AVERAGE_CROSSOVER`).
- **BacktestEngine**: Iterates historical data chronologically, executing strategy signals using Phase 2 PnL & Fee primitives, maintaining a strict no-lookahead boundary.

## Strategy DSL
Strategies are configured via JSON properties in the `Strategy` model. Supported types include `BUY_AND_HOLD` and `MOVING_AVERAGE_CROSSOVER`. No arbitrary code execution (eval, JavaScript functions) is permitted.

## Historical Data Model
Phase 3 utilizes a deterministic synthetic data fixture for verification (`Math.sin` curve logic bounded over a ~100 day range).

## Execution Convention
- **No-Lookahead Rule**: At Bar N, the strategy can only see data from Bar 0 to Bar N.
- **Execution Timing**: A signal generated at the close of Bar N is executed at the exact Open price of Bar N+1.

## Fee Policy & P&L Formulas
- **Fees**: Reuses the strict `0.1%` commission rate (Phase 2 model).
- **Formulas**:
  - `Net P&L = Final Equity - Initial Capital`
  - `Gross Profit = Sum of positive trade PnLs`
  - `Gross Loss = Sum of negative trade PnLs`
  - `Win Rate = (Winning Trades / Total Trades) * 100`
  - `Profit Factor = Gross Profit / ABS(Gross Loss)`
  - `Max Drawdown = Peak Equity - Trough Equity`

## Limitations
- Timeframes are static (1D simulated).
- Only fixed synthetic dataset supported for Phase 3 integration testing.
- No live routing, margin, or leverage.


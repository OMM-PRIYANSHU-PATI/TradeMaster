# TradeMaster Phase 4 - Strategy & Indicator Engine

## Architecture
Phase 4 introduces a deterministic, $O(N)$ indicator engine and an expanded strategy execution boundary that integrates cleanly with the Phase 3 Backtest loop.

### Indicator Engine
- **Stateless/Incremental calculation**: Calculations use an incremental single-pass mechanism. This achieves $O(1)$ calculations per-bar per-indicator when appending new data, avoiding $O(N^2)$ recalculations while strictly preserving the no-lookahead constraint.
- **Formulas**:
  - `SMA`: sum(close) / period
  - `EMA`: Starts with SMA for initialization, then `price * k + prev * (1-k)` where `k = 2 / (period + 1)`
  - `RSI`: Wilder's Smoothing. Initial RS uses simple average gain/loss. Subsequent periods use `(prev * (period - 1) + current) / period`.
  - `MACD`: EMA(fast) - EMA(slow). Signal is EMA(MACD, signalPeriod). Histogram is MACD - Signal.
  - `Bollinger Bands`: SMA(period) for middle band. StdDev uses population standard deviation. Upper/Lower = SMA ± (StdDev * multiplier).
  - `ATR`: True Range is max(High-Low, |High-PrevClose|, |Low-PrevClose|). Smoothed using Wilder's method.
- **Missing Data**: All indicators cleanly return `null` for indices where there is insufficient data (e.g., first `period - 1` bars of an SMA).

### Strategy Types & Rule DSL
- `BUY_AND_HOLD`: Buys immediately on the first available bar.
- `MOVING_AVERAGE_CROSSOVER`: Crosses between fast and slow SMA.
- `RSI_THRESHOLD`: Triggers when RSI crosses predefined `oversold` / `overbought` levels.
- `MACD_CROSSOVER`: Triggers when MACD line crosses the Signal line.
- `BOLLINGER_BAND`: Triggers on closing price breaking the lower (buy) or upper (sell) band.
- `CUSTOM_RULE_COMBINATION`: A fully deterministic JSON DSL.

#### Custom Rule DSL
Supports up to a maximum depth of 10 to prevent stack exhaustion or abuse.
- **Operators**: `GREATER_THAN`, `LESS_THAN`, `EQUAL`, `CROSSES_ABOVE`, `CROSSES_BELOW`, `AND`, `OR`, `NOT`.
- **Operands**: `CONSTANT`, `PRICE`, `INDICATOR`.
- **Security**: Zero dynamic code execution. `eval()`, `new Function`, and arbitrary code are strictly prohibited and technically impossible within the DSL evaluator.

### Phase 3 Integration
The Strategy Engine remains a pure evaluator. It receives the `HistoricalBar[]` (sliced to current `N` to guarantee no lookahead), the current position, and the stateless `IndicatorEngine`. It emits `BUY`, `SELL`, or `HOLD` signals.

The `BacktestEngine` handles all execution, simulated fills, multi-entry fee accounting, P&L generation, and metric calculations using the exact Phase 3 primitives.

### Validation
- Strict structural parsing using discriminated unions.
- Strong rejection of `Infinity`, `-Infinity`, `NaN`, zero/negative periods, and decimal periods.
- Periods enforce `Number.isInteger()`.

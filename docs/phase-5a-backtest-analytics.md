# Phase 5A: Backtest Analytics

## Architecture
Phase 5A implements deterministic Performance Analytics & Metrics exclusively for Backtests, deriving risk, return, and trade statistics from authoritative execution data.
Analytics are derived dynamically downstream of the core engine.

```text
AnalyticsController (api/v1/analytics/backtests/:id)
        ↓
AnalyticsService (Math and Logic mapping)
        ↓
Database (Reads authoritative Phase 3 BacktestTrade and BacktestEquityPoint)
```

## Data Sources
- **BacktestTrade**: Authoritative source for all trade P&L (grossPnl, fees, netPnl).
- **BacktestEquityPoint**: Authoritative source for the equity curve (cash, positionValue, equity, timestamp).

## Implemented Metrics
* **Return / P&L**: Net P&L, Total Return, Gross Profit, Gross Loss, Fees.
* **Drawdown**: Peak Equity, Max Drawdown, Max Drawdown %, Recovery Period.
* **Trade Statistics**: Total Trades, Winning Trades, Losing Trades, Win Rate, Average Win, Average Loss, Profit Factor, Expectancy, Risk/Reward.
* **Portfolio Metrics**: Exposure (Time in Market).

## Formulas
* **Win Rate**: `winning trades / total trades`
* **Profit Factor**: `gross profit / ABS(gross loss)`
* **Expectancy**: `(win rate * average win) - ((1 - win rate) * average loss)`
* **Exposure**: `total duration where positionValue > 0 / total duration of backtest`
* **Recovery Period**: `elapsed days between a drawdown's start (peak) and the timestamp where equity fully recovers`

## Edge Cases Handled
* **Zero Initial Capital**: Total return is `null`.
* **Zero Trades**: Trade statistics (Win Rate, Averages, Profit Factor) return `null`.
* **Zero Gross Loss**: Profit factor returns `null` to avoid `Infinity`.
* **Zero Gross Profit**: Averages and Ratios handle safely.
* **Never Recovered Drawdown**: Recovery period returns `null`.
* **Zero exposure**: Explicitly returns `0` rather than crashing.

## API Endpoint
`GET /api/v1/analytics/backtests/:id`

**Response format:**
JSON containing structured subsets:
- `returns`: `{ netPnl, totalReturn, grossProfit, grossLoss, fees }`
- `drawdown`: `{ peakEquity, maxDrawdown, maxDrawdownPercent, recoveryPeriod }`
- `trades`: `{ total, winning, losing, winRate, averageWin, averageLoss, profitFactor, riskReward, expectancy }`
- `portfolio`: `{ exposure, turnover, concentration, strategyContribution }`

## Authorization
- Endpoints use the standard `AuthGuard`.
- Requires authenticated user.
- If the backtest belongs to another user, responds with `403 Forbidden` or `404 Not Found`.

## Testing
- **E2E Tests**: Found in `apps/api/test/analytics.e2e-spec.ts`.
- **Methodology**: Exact mathematical determinism tested. Direct DB seeding with known values for Mock Instrument, BacktestRun, Trades, and Equity Curve.
- All JSON serializations return deterministic values containing no `NaN` or `Infinity`.

## Frontend
Located at `apps/web/src/app/(dashboard)/analytics/page.tsx`.
- Displays selectable backtest ID.
- Displays key KPI blocks.
- Distinguishes clearly unsupported/deferred metrics.

## Deferred Metrics & Known Limitations
- Sharpe Ratio, Sortino Ratio, Volatility, and Annualized Return are **DEFERRED** because their annualization constraints (e.g. daily, 252) are NOT defined in the feature specs.
- Paper Analytics are **DEFERRED** due to missing `PaperEquitySnapshot` infrastructure.
- No real-money, copy-trading, or social analytics are implemented.

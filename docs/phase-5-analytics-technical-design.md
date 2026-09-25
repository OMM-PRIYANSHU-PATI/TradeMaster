# Phase 5 Technical Design: Analytics (Module M)

## 1. Phase Objective
Phase 5 implements deterministic Performance Analytics & Metrics, deriving risk, return, and trade statistics from authoritative execution data. It unifies analytics for Backtests (Phase 5A) and Paper Trading (Phase 5B), strictly avoiding any duplication of the underlying P&L, fee, or position-management engines.

## 2. Phase 5A / Phase 5B Boundary & Metric Deferrals
To strictly adhere to existing architectures without inventing missing data or undefined mathematical constants, Phase 5 is split into two logical capability groups: **Phase 5A (Backtest Analytics)** and **Phase 5B (Paper Analytics)**. 

Furthermore, metrics requiring arbitrary annualization/sampling constants have been explicitly marked as **DEFERRED**.

| Capability            | Backtest (Phase 5A)                   | Paper (Phase 5B)                       |
| --------------------- | ------------------------------------- | -------------------------------------- |
| Net P&L               | Phase 5A                              | If authoritative source exists         |
| Total Return          | Phase 5A                              | Only if required inputs exist          |
| Win Rate              | Phase 5A                              | If closed trades can be determined     |
| Average Win/Loss      | Phase 5A                              | If closed trades can be determined     |
| Profit Factor         | Phase 5A                              | If closed trades can be determined     |
| Expectancy            | Phase 5A                              | If closed trades can be determined     |
| Risk / Reward         | Phase 5A                              | If closed trades can be determined     |
| Max Drawdown          | Phase 5A                              | Deferred if equity history unavailable |
| Volatility            | Deferred pending frequency            | Deferred                               |
| Sharpe                | Deferred pending frequency            | Deferred                               |
| Sortino               | Deferred pending frequency            | Deferred                               |
| Annualized Return     | Deferred pending frequency            | Deferred                               |
| Recovery Period       | Phase 5A if equity series supports it | Deferred if no equity history          |
| Exposure              | Phase 5A / existing data              | Current-state only if supported        |
| Turnover              | Phase 5A / existing data              | If sufficient execution history        |
| Strategy contribution | Phase 5A                              | Not applicable unless defined          |

### Phase 5A: Backtest Analytics
Backtests already possess authoritative data (`BacktestTrade`, `BacktestEquityPoint`, `BacktestMetric`). This allows us to calculate Drawdown, Recovery Period, and all Trade Statistics deterministically. 
**Status: READY FOR IMPLEMENTATION**

### Phase 5B: Paper Analytics
Paper trading currently lacks a persisted historical equity series (e.g. `PaperEquitySnapshot`). 
* Time-series paper analytics (Drawdown, Recovery Period) are marked **DEFERRED — PAPER EQUITY HISTORY REQUIRED**. We will NOT silently introduce an ad-hoc reconstruction.
* Trade-derived analytics (Win Rate, Profit Factor, Realized P&L) will only be implemented if the existing data (Order, OrderFill, Position, PaperTradingLedger) provides the inputs unambiguously.
**Status: PARTIALLY DEFERRED**

### Sampling-Dependent Metrics
The source specifications do NOT define return sampling frequency (daily, weekly, per-bar) or annualization constants (e.g., 252, 365). 
* Metrics requiring these constants (Sharpe, Sortino, Volatility, Annualized Return) are marked **DEFERRED — SAMPLING POLICY REQUIRED**.
* We will NOT silently assume daily data or invent constants like `sqrt(252)`.

## 3. Data-Source Mapping

| Analytics Input | Existing Model/Service | Authoritative? | Reason |
| --------------- | ---------------------- | -------------- | ------ |
| Backtest Trades | `BacktestTrade` | Yes | Direct persistence of Phase 3 execution. |
| Backtest Equity | `BacktestEquityPoint` | Yes | Direct persistence of Phase 3 equity curve. |
| Paper Fills | `OrderFill` (joined to `Order`) | Yes | Persisted execution record in Phase 2. |
| Paper Positions | `Position` | Yes | Real-time state of Paper Accounts. |
| Paper P&L | `Position.realizedPnl` & `PaperTradingLedger` | Yes | Tracks realized gains strictly via Phase 2 PnlService. |
| Paper Fees | `OrderFill.fee` & `PaperTradingLedger` | Yes | Financial truth for costs. |
| Paper Equity | **UNDEFINED** | No | DEFERRED. System currently does **NOT** persist historical paper equity series. |

## 4. Exact Formulas (Phase 5A Authorized List)
*Metrics not listed here remain DEFERRED.*

### Return / P&L
* **Net P&L**: `End Equity - Start Equity` (Decimal)
* **Total Return**: `Net P&L / Start Equity` (Float)

### Drawdown
* **Peak Equity**: `MAX(Equity_0...Equity_t)` (Decimal)
* **Max Drawdown**: `Peak Equity - Lowest Equity after Peak` (Decimal)
* **Drawdown %**: `Max Drawdown / Peak Equity` (Float)
* **Recovery Period**: `Days elapsed between Peak and when Equity > Peak` (Integer)

### Trade Statistics
* **Win Rate**: `Winning Trades (netPnl > 0) / Total Trades` (Float)
* **Average Win**: `Sum of positive Net P&L / Winning Trades` (Decimal)
* **Average Loss**: `Sum of ABS(negative Net P&L) / Losing Trades` (Decimal)
* **Risk/Reward**: `Average Win / Average Loss` (Float)
* **Expectancy**: `(Win Rate * Average Win) - ((1 - Win Rate) * Average Loss)` (Decimal)
* **Profit Factor**: `Sum of positive Gross P&L / Sum of ABS(negative Gross P&L)` (Float)

### Portfolio Metrics
* **Exposure**: `Time in Market / Total Time` (Float)
* **Concentration**: `Top Asset Value / Total Portfolio Value` (Float)
* **Turnover**: `Total Volume Traded / Avg Portfolio Value` (Float)

## 5. Analytics Must Not Change Financial Semantics
```text
Phase 2/3/4 (OrderFill, Position, BacktestTrade, BacktestEquityPoint)
    ↓
[ Authoritative financial state ]
    ↓
Phase 5 Analytics Service
    ↓
[ Derived statistics ]
```
Phase 5 Analytics STRICTLY consumes authoritative values. It must **not** reinterpret realized P&L, unrealized P&L, fees, trade cost basis, position quantity, or execution price.

## 6. Analytics Architecture (Phase 5A)
```text
AnalyticsController
        ↓
AnalyticsService (Phase 5A focus: Backtests)
        ├── ReturnMetricsService (Net P&L, Total Return)
        ├── DrawdownMetricsService (Max Drawdown, Drawdown %, Recovery Period)
        ├── TradeMetricsService (Win Rate, Profit Factor, Expectancy, Risk/Reward)
        └── PortfolioMetricsService (Exposure, Turnover, Concentration)
        ↓
Prisma Client (Reads authoritative Phase 3 data)
```

## 7. Precision Policy
* **Financial Values**: `Prisma.Decimal` is STRICTLY used for prices, fees, P&L, equity values, cash, monetary exposure, and average win/loss.
* **Statistical Values**: `number` (IEEE 754 Float) is used for dimensionless analytical values (Percentages, Ratios).
* **Conversion Boundary**: `Prisma.Decimal` values are extracted and converted to `number` strictly at the final step before statistical division occurs. 

## 8. Edge-Case Policy
* **Zero Denominators**: Profit Factor returns `null` if Gross Loss is 0. Risk/Reward returns `null` if Average Loss is 0.
* **Zero Trades**: All trade statistics (Win rate, avg win, expectancy) return `0` or `null` cleanly without crashing.
* **Missing Data**: Will NOT invent or synthesize missing data. If an input is absent, the metric evaluates to `null`.

## 9. API Specification
**Phase 5A Target:** `GET /api/v1/analytics/backtests/:id`
* **Params**: `id` (UUID). 
* **Response**: Returns JSON containing `performance`, `risk`, `trades`, and `exposure` blocks.
* DEFERRED metrics (Sharpe, Sortino, Volatility, Annualized Return) are explicitly excluded from the payload or marked `null`.

**Phase 5B Target:** `GET /api/v1/analytics/paper-accounts/:id`
* DEFERRED until exact supported paper-account metric set is separately defined.

## 10. Authorization Model
* Anonymous: `401 Unauthorized`
* Authenticated Non-Owner: `403 Forbidden` (User tries to query a Backtest belonging to another UUID).
* Authenticated Owner: `200 OK`

## 11. Frontend Specification (Phase 5A)
* `apps/web/src/app/(dashboard)/analytics/page.tsx`
* Built around backtest analytics first.
* Components: `EquityCurveChart`, `KeyMetricsGrid`, `DrawdownChart`.
* **Important:** Metrics that are unavailable due to undefined sampling contracts (Sharpe, Volatility) will be clearly labeled as unavailable. No fabricated data will be displayed.

## 12. Testing Specification
* **Unit Tests**: Exact known-value tests for every implemented metric.
  * exact P&L consistency, exact fee consistency, exact win/loss classification, exact win rate, exact profit factor, exact expectancy, exact risk/reward, exact drawdown, exact drawdown percentage, exact recovery period, exact exposure, exact turnover.
  * Deterministic repeated calculations.
  * No `NaN` or `Infinity`.
  * Correct `null` behavior.
* **Regression**: Phase 1/2/3/4 regression tests must pass alongside Phase 5A tests.
* **Prohibition**: Do not test deferred metrics as though they were implemented.

## 13. Determinism Requirements
Given identical arrays of `BacktestTrade` and `BacktestEquityPoint`, the Analytics engine must produce byte-for-byte identical JSON outputs regardless of environment.

## 14. Dependencies
* `Module A` (Auth)
* `Module E` (Paper Execution, PnlService)
* `Module E` (Backtest Engine, BacktestTrade, BacktestEquityPoint)

## 15. Out-of-Scope Features
* Live brokerage execution / real-money trading.
* Any fallback analytics database or test-only cache layer.
* Any metric requiring sampling frequencies (Sharpe, Sortino).
* Any paper-portfolio metrics requiring historical equity.

## 16. Acceptance Criteria
* `GET /api/v1/analytics/backtests/:id` returns HTTP 200 with permitted fields populated.
* Edge cases (flat equity, zero trades) explicitly return `null` instead of crashing.
* Zero `NaN` or `Infinity` returned in JSON payload.
* NO sampling assumptions (e.g. `252` trading days) are present in the codebase.

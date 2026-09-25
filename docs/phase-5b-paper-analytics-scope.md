# TradeMaster Phase 5B — Paper Analytics Scope

## A. Current Data Model

The current Paper Trading implementation (Phase 2) persists the following core models and fields relevant to analytics:

* **`PaperTradingAccount`**: `initialBalance`, `cashBalance`, `status`
* **`PaperTradingLedger`**: `type` (e.g. BUY_EXECUTION, SELL_EXECUTION, FEE), `amount`
* **`Order`**: `side`, `type`, `status`, `filledQuantity`, `averageFillPrice`
* **`OrderFill`**: `quantity`, `price`, `fee`, `executedAt`
* **`Position`**: `quantity`, `averageEntryPrice`, `realizedPnl`
* **`MarketPrice`**: `price` (latest snapshot per instrument)

Critically, the data model does **not** persist a historical equity series, nor does it persist individual `ClosedTrade` entities with round-trip P&L calculations.

---

## B. Implementable Metrics

The following metrics can be calculated reliably and deterministically using the current source of truth without inventing missing data:

| Metric | Source | Formula | Why Supported |
|--------|--------|---------|---------------|
| **Current Portfolio Value** | `PaperTradingAccount.cashBalance`, `Position.quantity`, `MarketPrice.price` | `cashBalance + SUM(Position.quantity * MarketPrice)` | Current cash and positions are persisted; live prices are available. |
| **Net P&L** | `PaperTradingAccount.initialBalance`, Current Portfolio Value | `Current Portfolio Value - initialBalance` | Both initial balance and current portfolio constituents are persisted. |
| **Total Return** | Net P&L, `initialBalance` | `Net P&L / initialBalance` | Derived directly from Net P&L. |
| **Unrealized P&L** | `Position.averageEntryPrice`, `Position.quantity`, `MarketPrice` | `SUM((MarketPrice - averageEntryPrice) * quantity)` | Real-time calculation supported by persisted average entry prices. |
| **Realized P&L** | `Position.realizedPnl` | `SUM(Position.realizedPnl)` | Phase 2 engine aggregates realized P&L incrementally onto the Position record during SELL executions. |
| **Total Fees** | `OrderFill.fee` | `SUM(OrderFill.fee)` | Tracked on every fill. |
| **Execution Count** | `OrderFill` | `COUNT(OrderFill)` | Every execution is recorded. Serves as a proxy for trade frequency. |

---

## C. Deferred Metrics

The following metrics **must remain deferred** because their calculation requires historical reconstructions, guessing, or data that is entirely unpersisted:

| Metric | Why Unsupported | Missing Data | Required Future Model/Data |
|--------|-----------------|--------------|----------------------------|
| **Historical Equity Curve** | No historical portfolio snapshots exist. | Time-series equity values. | `PaperEquitySnapshot` (recorded daily/on-event). |
| **Maximum Drawdown / Recovery** | Drawdown is peak-to-trough; we have no historical peaks. | Historical portfolio values. | `PaperEquitySnapshot`. |
| **Winning / Losing Trades** | Phase 2 aggregates P&L into `Position.realizedPnl` rather than discrete trades. | Round-trip trade records. | `ClosedTrade` (pairing entry and exit fills). |
| **Win Rate / Avg Win / Avg Loss** | Depends on discrete trade classification. | Individual trade net/gross P&L. | `ClosedTrade`. |
| **Profit Factor / Expectancy** | Depends on discrete trade gross/net outcomes. | Individual trade gross P&L. | `ClosedTrade`. |
| **Sharpe / Sortino / Volatility** | Require variance calculation over a periodic return series. | Daily/periodic returns. | `PaperEquitySnapshot`. |
| **Time-based Exposure** | Requires knowing when positions were open vs flat historically. | Historical position tracking. | `PaperEquitySnapshot` or complex ledger event-sourcing. |
| **Turnover** | Requires Time-Weighted Average Equity as a denominator. | Historical equity values. | `PaperEquitySnapshot`. |

---

## D. API Proposal

**Target Endpoint:** `GET /api/v1/analytics/paper-accounts/:id`

The API should expose only the implementable metrics in a typed DTO. It must not return dummy values for deferred metrics.

**Proposed Response DTO:**
```json
{
  "accountId": "cuid...",
  "returns": {
    "initialBalance": "100000.00",
    "currentPortfolioValue": "105000.00",
    "netPnl": "5000.00",
    "totalReturn": 0.05,
    "realizedPnl": "2500.00",
    "unrealizedPnl": "2500.00",
    "totalFees": "45.00"
  },
  "positions": [
    {
      "instrumentId": "uuid...",
      "symbol": "AAPL",
      "quantity": "10.00000000",
      "averageEntryPrice": "150.00000000",
      "currentPrice": "155.00000000",
      "marketValue": "1550.00",
      "unrealizedPnl": "50.00",
      "realizedPnl": "100.00"
    }
  ],
  "activity": {
    "executionCount": 12
  }
}
```

---

## E. Security

The API will strictly enforce ownership:
* **Anonymous Requests**: 401 Unauthorized
* **Authenticated Owner**: 200 OK
* **Authenticated Non-Owner**: 403 Forbidden (or 404 Not Found to prevent enumeration)
* **Nonexistent Account**: 404 Not Found

Redis will **not** be used as a fallback source of truth. If PostgreSQL is unavailable, the API will fail.

---

## F. Numeric Semantics

* **Financial/Monetary Values**: (Cash, P&L, Market Value, Prices, Fees) calculated precisely using `Prisma.Decimal` and returned as `string` in the JSON response to prevent JS floating-point degradation.
* **Ratios**: (Total Return) returned as IEEE 754 `number` (float).
* **Counts**: (Execution Count) returned as `number` (integer).

---

## G. Future Historical Analytics

To eventually unlock the deferred metrics (Phase 5B+), the following architectural additions would be required:

1. **`PaperEquitySnapshot` (For Portfolio Metrics)**: 
   A scheduled CRON job or an event-driven listener must persist the account's total equity, cash, and position value at a defined frequency (e.g., end-of-day). This unlocks Drawdown, Recovery Period, Volatility, Sharpe, and Sortino.
2. **`PaperClosedTrade` (For Trade Statistics)**: 
   The execution engine (in `paper-execution.service.ts`) must be modified to pair SELL executions against existing BUY quantities (e.g., via FIFO/LIFO matching) and persist a discrete `PaperClosedTrade` record containing `grossPnl`, `netPnl`, `entryPrice`, and `exitPrice`. This unlocks Win Rate, Average Win/Loss, Expectancy, and Profit Factor.

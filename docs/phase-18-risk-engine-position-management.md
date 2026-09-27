# Phase 18 — Risk Engine & Position Management

## Architecture Overview
Phase 18 introduces a production-grade risk-management layer acting as a strict safety boundary between the `StrategyExecutionEngine` (which generates unconstrained trading intents) and the `ExecutionAdapter` (which submits orders to the broker or paper ledger).

The flow is firmly unidirectional and immutable:
`StrategyExecutionEngine` -> `OrderIntent` -> `RiskEngine` -> `RiskDecision` (APPROVED | REJECTED | MODIFIED) -> `ExecutionAdapter`

## Risk Model & Capabilities
The `RiskEngine` continuously evaluates positions and incoming intents against a defined `RiskConfiguration`.

### Implemented Features
- **Risk Per Trade:** Dynamically scales position sizes based on a configured percentage of available equity.
- **Maximum Position Size:** Caps the notional value of any single position.
- **Maximum Portfolio Exposure:** Prevents total open exposure from exceeding a defined percentage of total equity.
- **Maximum Concurrent Positions:** Hard limit on the number of simultaneous active trades.
- **Daily Loss Limit:** Halts new entries (while allowing exits) if the account's realized daily P&L breaches the maximum loss threshold.
- **Maximum Drawdown:** Halts new entries if the current equity falls below the peak equity by the specified drawdown percentage.
- **Stop Loss & Take Profit:** Evaluates price updates and automatically intercepts to generate exit `OrderIntent`s when thresholds are reached, utilizing the same unified execution pipeline.
- **Trailing Stop:** Dynamically adjusts the stop loss upwards (for LONG positions) as the price moves favorably.
- **Emergency Stop:** A global circuit breaker that blocks all new entries across all strategies immediately upon activation.

### Implementation Constraints
- **Long-Only Operations:** The system explicitly supports LONG positions. Short selling logic is deferred.
- **Strict Decimal Mathematics:** All financial valuations, P&L calculations, and limit validations are processed using `Prisma.Decimal` to avoid JavaScript floating-point inaccuracies.
- **Separation of Concerns:** The `RiskEngine` does **not** directly mutate positions, cash, or the ledger. It strictly evaluates and modifies `OrderIntent` payloads.

## Integration
- **Virtual Trading (`Phase 17`):** The `PaperExecutionAdapter` has been updated to pipe all intents through the `RiskEngine` before passing them to the paper execution service. Continuous price updates in `VirtualStrategyService` trigger SL/TP evaluation loops.
- **Backtesting:** (Deferred/Limited) Native strategy signal-generation operates symmetrically, though real-time trailing stops intra-candle are approximated.

## APIs & User Interface
- APIs exposed under `GET/PUT /api/v1/risk/config` and `POST /api/v1/risk/emergency-stop`.
- UI implemented at `/risk` ("Risk Center") providing a professional, dark-themed summary of equity, drawdown, exposure, active limits, and a comprehensive configuration form.

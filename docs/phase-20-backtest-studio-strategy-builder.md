# TRADEMASTER — PHASE 20: BACKTEST STUDIO & STRATEGY BUILDER

## Overview
Phase 20 introduces the complete professional Backtest Studio and manual Strategy Builder for TradeMaster. 
It transforms the backtesting engine (built in Phase 3) and Strategy Engine (Phase 4) into a cohesive, professional UI workstation, strictly integrating with canonical execution (Phase 16) and risk/cost layers (Phase 18, 19).

## Architecture

* **UI Layer**: Built with Next.js, Tailwind CSS, providing high-density panels.
* **Strategy API**: Enhanced Strategy model featuring `version`, `tags`, `assetClass`, and `defaultTimeframe`. Uses immutable updates where existing runs are attached (creating new versions via `parentId`).
* **Canonical Execution**: Uses the exact `StrategyCompiler` and `BacktestAdapter`. No separate execution path is utilized.
* **Validation**: Leverages `zod` for API boundary validation.

## Manual Strategy Builder
- **Route**: `/strategies/new`
- **Capabilities**:
  - Defines visual entry and exit conditions.
  - Combines indicators securely via pre-defined operands.
  - Links up to the Backtest Engine.
  - Preserves snapshots immutably upon editing if dependencies exist.

## Backtest Studio
- **Route**: `/backtest`
- **Workstation Layout**:
  - **Left Panel**: Configuration (Strategy, capital, dates, fees).
  - **Center Panel**: Advanced charting (placeholder ready), equity curves.
  - **Right Panel**: Detailed metrics and analytics integration (Phase 19).
- **History Table**: Bottom persistent area for raw trade outputs.

## Virtual Handoff
- Supports "Run Virtually" by forwarding the `strategyId` which correctly references the strictly versioned snapshot inside the backend.

## Security & No-Lookahead
- **No-Lookahead**: Regressed and validated via Canonical Engine rules.
- **IDOR**: Prevented using User UUID associations and auth guards across API endpoints.

## Testing & Audit
- Static audits successfully prevented unsafe `eval` and `any` constructs.
- Regression passed for all Phases (1 - 20).
- Typecheck and Build successfully completed.

## Known Limitations
- Strategy indicator visual validation currently maps only a static list of indicators; dynamic plugin loading is deferred.
- Advanced multi-instrument strategies are deferred to future portfolio-level features.

# TradeMaster Phase 11 — Advanced Strategy Lab Architecture

## Architectural Audit

An architectural review was initiated to design the Advanced Strategy Lab on top of the Phase 3 Backtesting Engine and Phase 4 Strategy DSL.

However, the source requirement audit (`docs/phase-11-source-mapping.md`) revealed that the Advanced Strategy Lab (and its component features: visual builder, risk management rules, strategy versioning, position sizing, optimization, and templates) is entirely absent from the authoritative source feature list (Features 1–142).

## Core Directives Enforced
1. **No Invented Requirements:** "Do not invent requirements where the source does not define them." Since the source does not define these features, no new entities (e.g., `StrategyVersion`, `RiskRule`) were introduced to the schema.
2. **Reuse Existing Engines:** No new execution engines or backtest wrappers were created. The Phase 3 and Phase 4 systems remain untouched.
3. **No Arbitrary User Code:** The prohibition on `eval()` and `new Function()` remains strictly enforced across the codebase.

## Resulting Architecture
The system architecture remains unchanged. Strategies continue to rely on the Phase 4 Engine (`Strategy`, `Condition`, `Indicator`) and backtesting continues to rely on the Phase 3 Engine (`BacktestRun`, `BacktestMetric`). The Advanced Strategy Lab UI and backend orchestration layer were **DEFERRED / CANCELLED** due to lack of source requirement support.

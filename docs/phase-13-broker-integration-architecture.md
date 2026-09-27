# Phase 13: Broker Integration & Execution Architecture

## 1. High-Level Flow
```text
User 
  ↓ (Auth/Token)
BrokerController
  ↓ (Validates LIVE_DISABLED guard)
BrokerService (Idempotency & Safety Logic)
  ↓
BrokerProvider (Interface for external vendors)
  ↓
MockBrokerProvider (or specific future vendor like Alpaca/Zerodha)
```

## 2. Broker Connection Abstraction
Because the source features do not define a specific broker, we built a generic robust abstraction:
- **`BrokerProvider` Interface:** Defines `connect`, `placeOrder`, `cancelOrder`, `disconnect`.
- **`BrokerConnection` Model:** Stores `userId`, `provider`, `status`, and encrypted tokens.
- **`BrokerAccount` Model:** Tracks the external cash/equity balance synced from the provider.

## 3. Order Safety & State Machine
- **Live Execution Guard:** New broker connections are created with `liveExecutionEnabled = false`. All live orders are rejected with a 403 unless explicitly armed. This fulfills Feature 117 (`Restricted high-risk actions, no autonomous live trading by default`).
- **Idempotency:** Every order submission requires a `clientOrderId`. Before calling the external broker, the service asserts no existing `BrokerOrder` shares this ID, mitigating double-spending from network retries.
- **Timeout Safety:** If a provider SDK throws a timeout (e.g., `RequestTimeoutException`), the system catches it and records the local order as `UNKNOWN`. It does NOT blindly retry.
- **Partial Fills:** Broker execution payloads are normalized. If a broker returns partial fill events, they are logged as independent `BrokerFill` rows and aggregated onto the `BrokerOrder.filledQuantity`.

## 4. Financial Isolation
To ensure backtesting and simulated paper-trading performance remain completely deterministic, Phase 13 broker models (`BrokerOrder`, `BrokerFill`, `BrokerAccount`) are stored structurally parallel to but completely isolated from Phase 2 models (`Order`, `OrderFill`, `PaperTradingAccount`). A live broker execution does NOT accidentally pollute the user's paper-trading P&L leaderboard.

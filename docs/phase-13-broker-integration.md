# Phase 13: Broker Integration & Execution

This phase builds the foundational execution layer required to connect TradeMaster to real-money brokerages safely.

## Key Features & Safety Mechanisms (IMPLEMENTED + VERIFIED)

1. **Broker Connectivity**
   - OAuth/Token-based connection endpoints (`POST /api/v1/broker/connect`).
   - Secure disconnection removing provider access (`POST /api/v1/broker/connections/:id/disconnect`).

2. **Idempotent Execution (`POST /api/v1/broker/accounts/:id/orders`)**
   - Submits `MARKET`, `LIMIT`, and `STOP` orders.
   - Idempotency guarantees prevent duplicate client requests from multiplying live orders.

3. **Live Execution Guard (Feature 117)**
   - No execution can occur by default. Live execution must be explicitly authorized (`POST /api/v1/broker/connections/:id/arm`).
   - Ensures autonomous AI or unexpected strategy loops cannot drain real-money accounts.

4. **Timeout Safety**
   - Automatically shifts orders into an `UNKNOWN` status pending reconciliation if the upstream broker times out during request.

## Unimplemented / Deferred

Since the original source features (`trademaster-features/**/*.md`) provided no explicit definitions of vendor logic or advanced features:
- **Specific Vendors:** Left abstracted via `BrokerProvider`. (Uses `MockBrokerProvider`).
- **Webhooks:** Source does not define. Deferred to subsequent phases.
- **Order Modification:** Source does not define. Deferred to subsequent phases.
- **Frontend UI:** Deferred.

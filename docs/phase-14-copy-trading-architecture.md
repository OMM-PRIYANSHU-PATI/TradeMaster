# Phase 14: Copy Trading Architecture

## Core Flow
1. **Source Event**: A trader executes a paper order through `PaperExecutionService`.
2. **Event Emission**: `PaperExecutionService` emits `paper-order.executed`.
3. **Capture**: `CopyExecutionService` listens for `paper-order.executed`.
4. **Validation**: Checks `activeConfigs` for the source user. If followers exist, upserts a `CopyEvent`.
5. **Iteration**: Iterates over enabled `CopyConfiguration` records.
6. **Risk Controls**: Validates `maxExposure` and `maxDrawdown` before permitting execution.
7. **Copy Execution**: Submits a deterministic order to `PaperExecutionService` mapped to the follower's designated `targetAccountId`.

## Idempotency
- Managed via `CopyTrade` which forms a unique composite constraint across `eventId` + `configId`.

## Recursion Protection
- `activeConfigs` check specifically skips issuing new `CopyEvent` triggers if the emitting user has no followers, breaking the chain.

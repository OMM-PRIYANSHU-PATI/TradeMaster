# TradeMaster Phase 10: Advanced AI Trading Intelligence

## Architecture

```text
AUTHORITATIVE TRADING DATA (Prisma DB / Phase 2-6-9 Services)
        |
Context Builder Services (READ-ONLY)
        |
Normalized Context String + GenAI responseSchema
        |
GeminiService.generateStructuredContent()
        |
Zod Runtime Validation (safeParse -> reject or return)
        |
Structured AI response (AiInsightResponse | AiTradeReviewResponse)
```

## Endpoints

| Endpoint | Schema | Status |
|---|---|---|
| POST /api/v1/ai/coach | AiInsightResponse | IMPLEMENTED, VERIFIED |
| POST /api/v1/ai/journal/analyze | AiInsightResponse | IMPLEMENTED, VERIFIED |
| POST /api/v1/ai/backtests/:id/explain | AiInsightResponse | IMPLEMENTED, VERIFIED |
| POST /api/v1/ai/strategies/:id/explain | AiInsightResponse | IMPLEMENTED, VERIFIED |
| POST /api/v1/ai/trades/:id/review | AiTradeReviewResponse | IMPLEMENTED, VERIFIED |

## Runtime Validation

- Gemini output uses responseMimeType: application/json + responseSchema
- Response is JSON.parse'd then zodSchema.safeParse'd -- never trusted via TS cast
- Invalid output -> 502 Bad Gateway

## Rate Limiting: 20 per 15 min on api/v1/ai/* -- VERIFIED with real E2E test

## Trade Review

- REAL paper trade lifecycle via Phase 2 API
- Context contains authoritative: instrument, side, quantity, entryPrice, fees
- exitPrice/grossPnl/netPnl marked UNAVAILABLE for single-leg orders
- IDOR: User B -> 404, User A -> 200

## Prompt Injection: Defense-in-depth (NOT absolute guarantee)

## Coach Personalization: userId-scoped portfolio context

## Strategy Context: Exact Phase 4 fields only (no fabricated fields)

## Backtest Context: Exact stored BacktestMetric values (no recomputation)

## No Financial Mutation: READ ONLY (zero create/update/delete in AI code)

## Deferred: Features 110 (courses), 112 (weekly), 113 (custom plans)

## Test Evidence: 12 suites, 135 tests, all pass

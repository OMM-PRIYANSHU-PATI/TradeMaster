# RELEASE CHECKLIST

## 1. Feature Acceptance
- [x] Register / Login Journey: PASS
- [x] Create Strategy: PASS
- [x] Run Backtest: PASS
- [x] Run Virtual Session: PASS
- [x] Risk Controls applied: PASS
- [x] Social Feed Sharing: PASS

## 2. Financial Correctness
- [x] Prisma.Decimal usage strictly enforced: PASS
- [x] Number()/parseFloat() not used for financial math: PASS
- [x] Gross P&L and Net P&L logic correct: PASS
- [x] Transaction Costs / Fees / Slippage deterministic: PASS

## 3. Architecture
- [x] Single Strategy Execution Engine: PASS
- [x] ExecutionAdapter isolates Backtest from Virtual: PASS
- [x] Gemini AI restricted from financial execution: PASS

## 4. Security
- [x] IDOR protection on controllers via `@CurrentUser`: PASS
- [x] No `eval()`, `new Function()`, `child_process`: PASS
- [x] Rate limiting configured on endpoints: PASS
- [x] API tokens and keys loaded from `process.env`: PASS

## 5. Database
- [x] Schema synchronized and fully migrated: PASS
- [x] Indexes present for highly queried fields: PASS
- [x] Idempotency mapped properly on executions: PASS

## 6. Frontend
- [x] Pages responsive and accessible: PASS
- [x] No missing loading or error states: PASS
- [x] Tailwind UI structure unified: PASS

## 7. Build and Testing
- [x] `pnpm typecheck` successfully clears: PASS
- [x] `pnpm lint` effectively clears: PASS
- [x] `pnpm build` creates output: PASS

## 8. Deployment
- [x] `.env.example` provides template keys: PASS
- [x] No hardcoded environment credentials: PASS
- [x] Turborepo caching functioning correctly: PASS

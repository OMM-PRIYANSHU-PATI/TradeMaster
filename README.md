# TradeMaster

TradeMaster is a comprehensive, AI-enhanced algorithmic and paper-trading platform designed to facilitate the full product loop: **Learn ? Practice ? Analyze ? Discover ? Follow ? Copy ? Review ? Improve**.

Built with a modern enterprise tech stack, TradeMaster ensures deterministic financial execution, strict accounting principles, and modular phase-based architecture.

## ?? Tech Stack
* **Monorepo:** Turborepo & pnpm workspace
* **Frontend:** Next.js (React), Tailwind CSS
* **Backend:** NestJS (Node.js)
* **Database:** PostgreSQL via Prisma ORM
* **Caching:** Redis
* **AI Engine:** Google Gemini SDK (`@google/genai`)

---

## ?? Implementation Status

The platform architecture has been developed and strictly verified across multiple phases:

* **Phase 0: Foundation** (VERIFIED) - Monorepo, core apps, database schema, and Docker infrastructure.
* **Phase 1: Authentication & Security** (VERIFIED) - Secure HTTP-only cookie sessions, Argon2 hashing, RBAC, Helmet, CORS, and rate limiting.
* **Phase 2: Paper Trading** (VERIFIED) - Deterministic order execution, transaction ledgers, position tracking, cash balance constraints, and 0.1% fees.
* **Phase 3: Backtesting** (VERIFIED) - Historical market data processing, deterministic backtest portfolio generation, and run metrics.
* **Phase 4: Strategy & Indicator Engine** (VERIFIED) - Core computational engine for financial indicators (SMA, EMA, RSI, MACD, etc.) and algorithmic strategy signals.
* **Phase 5A: Backtest Analytics** (VERIFIED) - Performance analysis, win rate, equity curves, and P&L visualizations.
* **Phase 5B: Paper Analytics** (VERIFIED) - Real-time paper trading performance evaluation.
* **Phase 6A: Trading Journal** (VERIFIED) - Trade tracking, manual logging, and strategy reflections.
* **Phase 7A: Trader Profiles + Discovery** (VERIFIED) - Public/private profile boundaries, trader discovery, search, sorting, and pagination.
* **Phase 8: AI Trading Coach / Gemini** (FULLY VERIFIED) - Deep integration with the Gemini API for strategic explanations, backtest analysis, and journal coaching.
* **Phase 9: Challenges & Skill Development** (FULLY VERIFIED) - Platform-wide trading challenges, deterministic challenge accounts, idempotently awarded achievements/badges, and progress tracking securely isolated from standard trading accounts.

---

## ??? Getting Started

### Prerequisites
* Node.js (v18+)
* pnpm (v8+)
* Docker & Docker Compose (for PostgreSQL and Redis)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Set up environment variables:
   Copy `.env.example` to `.env` and fill in your database credentials and `GEMINI_API_KEY`.
4. Start infrastructure:
   ```bash
   docker-compose up -d
   ```
5. Apply database migrations:
   ```bash
   cd packages/database
   pnpm prisma db push
   ```
6. Start development servers:
   ```bash
   pnpm dev
   ```

### Testing
TradeMaster maintains an extensive, strictly validated test suite (over 120 E2E tests). Run the full regression suite via:
```bash
pnpm test --force
```

## ?? Security & Determinism
TradeMaster never hallucinates financial data. The AI integration strictly layers on top of the deterministic Phase 2 financial ledger. Deposits are not simulated as profit, and Challenge evaluations natively execute actual market orders, guaranteeing P&L arithmetic mathematically reconciles down to the tick precision and fee allocations.

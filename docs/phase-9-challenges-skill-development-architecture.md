# Phase 9 — Challenges & Skill Development Architecture

## A. Challenge Definition
A `Challenge` represents a trading competition or learning milestone.
Attributes: `id`, `title`, `description`, `category` (beginner, strategy, risk), `status` (DRAFT, PUBLISHED, ARCHIVED).
Rules: `startingCapital`, `targetReturn`, `maxDrawdown`, `durationDays`, `minTrades`.

## B. Challenge Participation
Users join a PUBLISHED challenge, creating a `ChallengeParticipant` record.
Attributes: `id`, `userId`, `challengeId`, `status` (ACTIVE, COMPLETED, FAILED), `accountId` (links to a new isolated `PaperTradingAccount`).
Only authenticated users can join. One active participation per challenge per user.

## C. Challenge Rules
Enforced deterministically.
- `startingCapital`: Initialized in the linked `PaperTradingAccount`.
- `targetReturn`: Evaluated via Paper Trading analytics (Final Equity > Target).
- `maxDrawdown`: Evaluated via Analytics engine.
- `durationDays`: End date calculated at join time.

## D. Challenge Progress
Derived dynamically by querying the linked `PaperTradingAccount` and comparing it to the rules. No redundant P&L engine.

## E. Challenge State
Participant state transitions: ACTIVE -> (rules met?) -> COMPLETED | FAILED.

## F. Challenge Results
Stored on the `ChallengeParticipant` upon transition out of ACTIVE.

## G. Skill Development & H. Achievement/Milestone Handling
Modeled via `Achievement`.
When a participant reaches COMPLETED status, they receive an `Achievement` record.
Attributes: `id`, `userId`, `type` (e.g., CHALLENGE_COMPLETED), `referenceId` (challengeId).

## I. Leaderboard Behavior
Leaderboards sort `ChallengeParticipant` records for a specific challenge by `currentEquity` or `returnPercent`.
Privacy: Only expose user ID / name (if public), keeping exact trade details private unless specifically authorized.

## J. Security/Ownership
- User A can only see and join their own participations.
- No arbitrary code eval for rules.
- Leaderboards filter out private data.

## K-N. Inter-Phase Relationships
- **Paper Trading**: Challenges spawn isolated Paper Trading Accounts.
- **Backtesting**: Not directly used by challenges (challenges are forward-simulated).
- **Analytics**: Uses Phase 5 logic to calculate drawdown/returns.
- **AI**: Phase 8 AI can explain challenge rules/progress, but cannot award completion.

# 63. Historical performance, drawdown, volatility, consistency metrics

**Module:** G. Trader Discovery
**Module category:** Trader Discovery

## Purpose
"Historical performance, drawdown, volatility, consistency metrics" is a feature within the G. Trader Discovery module of TradeMaster, supporting the platform's
core product loop (Learn → Practice → Analyze → Discover → Follow → Copy → Review → Improve).
It gives users the specific capability described by this feature name without requiring
them to leave the app or piece the functionality together manually.

## What it does
- Implements the behavior named: "Historical performance, drawdown, volatility, consistency metrics".
- Reads and writes the data relevant to this feature (trader profile index, performance metrics, search/filter indices).
- Surfaces in the Trader Discovery section of the product, and where
  relevant, contributes a summary or shortcut to the Main Dashboard.
- Where this feature involves copy trading, live money, or regulated financial activity,
  it is built subject to legal, regulatory, brokerage, and jurisdictional validation,
  with appropriate disclosures and audit trails.

## Key capabilities
1. Core behavior — delivers "Historical performance, drawdown, volatility, consistency metrics" as specified.
2. Data handling — persists and retrieves trader profile index, performance metrics, search/filter indices.
3. Presentation — exposed via the relevant screen(s) in the Trader Discovery module.
4. Safety/compliance — where applicable (copy trading, AI coach, billing), includes
   guardrails, disclosures, and audit logging appropriate to a financial platform.

## User story
As a TradeMaster user, I want "Historical performance, drawdown, volatility, consistency metrics" so that I can get the benefit this feature is
named for as part of my learning, practice, analysis, discovery, following, copying,
reviewing, or improving workflow.

## Data requirements
- Primary inputs: trader profile index, performance metrics, search/filter indices
- Storage: feature-specific records linked to the user's account/profile ID
- Update frequency: real-time for trading/social actions, on-demand or scheduled for
  reports and summaries

## Integrations
- internal search index over Trader Profile + Analytics data

## Dependencies
- Authentication & Account (Module A)
- User Profile (Module B)
- Where relevant: Paper Trading (Module E) and/or Analytics (Module M) as the underlying
  data source

## Acceptance criteria (Definition of Done)
- [ ] Feature is reachable from its module's section of the app
- [ ] Required data source (manual entry, simulated feed, or integration) is connected
- [ ] Core logic for "Historical performance, drawdown, volatility, consistency metrics" is implemented and tested
- [ ] Empty states, loading states, and error states are handled
- [ ] Any regulatory/compliance disclosures required for this feature are included

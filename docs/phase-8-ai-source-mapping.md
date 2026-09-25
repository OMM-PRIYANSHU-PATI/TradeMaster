# Phase 8 — AI Source Mapping

This document maps the Phase 8 AI feature implementation to the source feature specifications.

| Feature File | Required Behavior | User Inputs | Required Outputs | Data Sources | Auth | Ownership | Gemini Appropriate? | Deterministic Logic? | Implemented | Missing | Deferred |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `107-trading-concept-qanda-journal-analysis-trade-review.md` | Provide trading concept Q&A, journal analysis, and trade review. | User queries | Chat responses and trade/journal insights | LLM, Journal entries, Analytics | Yes | Yes (owns journal) | Yes | Yes (for underlying data) | Partially | Connect actual journal context | Advanced trade review |
| `108-learning-recommendations-performance-explanations-risk-education.md` | Recommend learning topics and explain risk/performance. | User queries | Explanations of risk and performance | LLM, Performance data, Education data | Yes | Yes (owns performance) | Yes | Yes (Performance data) | Partially | Detailed risk education | Curated learning topics |
| `109-strategy-documentation-assistance.md` | Help document and explain user strategies. | Strategy ID | Strategy explanations | Strategy configurations | Yes | Yes (owns strategy) | Yes | Yes (strategy state) | Yes | None | None |
| `111-journal-patterns-repeated-mistakes-rule-violations-behavioral-patterns.md` | Identify repeated mistakes, rule violations, and behavioral patterns in journals. | Journal ID/entries | Summary of patterns and mistakes | Journal entries | Yes | Yes (owns journal) | Yes | No | Yes | None | None |
| `114-no-guaranteed-returns-no-fabricated-market-data.md` | Disclaimers: no guaranteed returns, no fabricated market data. | N/A (System prompt) | Safe, bounded responses | System Prompts | N/A | N/A | Yes | N/A | Yes | None | None |
| `117-restricted-high-risk-actions-no-autonomous-live-trading-by-default.md` | Restrict autonomous trading, executing trades, and modifying positions. | N/A (Architecture) | Access denied to financial mutation APIs | System architecture | N/A | N/A | No (must be enforced outside LLM) | Yes (enforced by API design) | Yes | None | None |

## Conclusion
The AI integration correctly aligns with the feature corpus, bounded to explanation and analysis. It heavily relies on existing deterministic data (Strategies, Backtests, Journals) without granting the AI mutation capabilities.

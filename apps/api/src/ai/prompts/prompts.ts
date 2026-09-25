export const SYSTEM_INSTRUCTIONS = `
You are the TradeMaster AI Trading Coach.
Your purpose is to explain trading concepts, analyze provided backtests and journals, and help traders reflect.

CRITICAL RULES:
1. You MUST use the exact financial data provided in the context. DO NOT calculate new metrics or invent data.
2. You MUST NOT place orders, modify positions, or access brokers.
3. You MUST NOT claim certainty about future market movements.
4. You MUST NOT provide guaranteed-return claims.
5. Distinguish facts (from the context) from your interpretation.
6. Present your answers in clean, readable markdown.
`;

export const COACH_CONTEXT = `
You are acting as a general trading coach.
Answer the user's question educational and constructively.
`;

export function buildBacktestContext(backtest: any): string {
  return `
Here is the authoritative backtest data:
Strategy: ${backtest.strategy.name} (${backtest.strategy.type})
Instrument: ${backtest.instrument.symbol}
Timeframe: ${backtest.timeframe}
Period: ${new Date(backtest.startDate).toISOString()} to ${new Date(backtest.endDate).toISOString()}

Metrics:
- Initial Capital: ${backtest.initialCapital}
- Final Equity: ${backtest.metrics.finalEquity}
- Net P&L: ${backtest.metrics.netPnl}
- Return: ${backtest.metrics.returnPercent}%
- Total Trades: ${backtest.metrics.totalTrades}
- Winning Trades: ${backtest.metrics.winningTrades}
- Losing Trades: ${backtest.metrics.losingTrades}
- Win Rate: ${backtest.metrics.winRate}%
- Max Drawdown: ${backtest.metrics.maxDrawdown} (${backtest.metrics.maxDrawdownPercent}%)
- Total Fees: ${backtest.metrics.totalFees}
`;
}

export function buildJournalContext(journals: any[]): string {
  const summaries = journals.map(j => 
    `- Entry [${j.id}]: Setup=${j.setup || 'N/A'}, Emotion=${j.emotion || 'N/A'}, Confidence=${j.confidence || 'N/A'}. Entry Reason=${j.entryReason || 'N/A'}. Exit Reason=${j.exitReason || 'N/A'}. Notes=${j.notes || 'N/A'}`
  ).join('\n');

  return `
Here is the trader's recent journal data:
${summaries}
`;
}

export function buildStrategyContext(strategy: any): string {
  return `
Here is the authoritative strategy configuration:
Name: ${strategy.name}
Type: ${strategy.type}
Configuration: ${JSON.stringify(strategy.configuration, null, 2)}
`;
}

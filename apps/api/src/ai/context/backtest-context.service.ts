import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';

// Matches getBacktest() which includes { strategy, instrument, metrics }
type BacktestWithRelations = Prisma.BacktestRunGetPayload<{
  include: { strategy: true; instrument: true; metrics: true };
}>;

@Injectable()
export class BacktestContextService {
  buildContext(backtest: BacktestWithRelations): string {
    return JSON.stringify({
      id: backtest.id,
      strategyId: backtest.strategyId,
      strategyName: backtest.strategy.name,
      strategyType: backtest.strategy.type,
      instrument: backtest.instrument.symbol,
      timeframe: backtest.timeframe,
      status: backtest.status,
      initialCapital: backtest.initialCapital.toNumber(),
      metrics: backtest.metrics
        ? {
            totalReturn: backtest.metrics.totalReturn.toNumber(),
            netPnl: backtest.metrics.netPnl.toNumber(),
            grossProfit: backtest.metrics.grossProfit.toNumber(),
            grossLoss: backtest.metrics.grossLoss.toNumber(),
            fees: backtest.metrics.totalFees.toNumber(),
            winRate: backtest.metrics.winRate.toNumber(),
            profitFactor: backtest.metrics.profitFactor?.toNumber() ?? null,
            maxDrawdown: backtest.metrics.maxDrawdown.toNumber(),
            maxDrawdownPercent: backtest.metrics.maxDrawdownPercent.toNumber(),
            totalTrades: backtest.metrics.totalTrades,
            winningTrades: backtest.metrics.winningTrades,
            losingTrades: backtest.metrics.losingTrades,
          }
        : null,
    });
  }
}

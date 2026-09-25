import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { BacktestEngine } from './backtest.engine';

@Injectable()
export class BacktestService {
  constructor(private readonly engine: BacktestEngine) {}

  async createStrategy(userId: string, data: { name: string; description?: string; type: string; configuration: unknown }) {
    return prisma.strategy.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        type: data.type,
        configuration: data.configuration as Prisma.InputJsonValue,
      }
    });
  }

  async getStrategies(userId: string) {
    return prisma.strategy.findMany({ where: { userId } });
  }
  
  async getStrategy(userId: string, id: string) {
    const s = await prisma.strategy.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    if (s.userId !== userId) throw new ForbiddenException();
    return s;
  }

  async runBacktest(userId: string, data: { strategyId: string; instrumentId: string; startDate: string; endDate: string; initialCapital: string }) {
    const strategy = await this.getStrategy(userId, data.strategyId);
    
    // Make sure instrument exists
    const instrument = await prisma.instrument.findUnique({ where: { id: data.instrumentId } });
    if (!instrument) throw new NotFoundException('Instrument not found');

    const initialCapital = new Prisma.Decimal(data.initialCapital);
    const commissionRate = new Prisma.Decimal('0.001'); // Fixed fee policy

    const run = await prisma.backtestRun.create({
      data: {
        userId,
        strategyId: strategy.id,
        instrumentId: instrument.id,
        timeframe: '1D',
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        initialCapital,
        commissionRate,
        status: 'RUNNING'
      }
    });

    try {
      const result = await this.engine.runBacktest(
        instrument.id,
        run.startDate,
        run.endDate,
        initialCapital,
        commissionRate,
        { type: strategy.type, config: strategy.configuration }
      );
      
      // Save results
      await prisma.$transaction(async (tx) => {
        for (const t of result.trades) {
          await tx.backtestTrade.create({
            data: {
              backtestRunId: run.id,
              instrumentId: t.instrumentId,
              side: t.side,
              quantity: t.quantity,
              entryPrice: t.entryPrice,
              exitPrice: t.exitPrice,
              grossPnl: t.grossPnl,
              entryFee: t.entryFee,
              exitFee: t.exitFee,
              fees: t.fees,
              netPnl: t.netPnl,
              openedAt: t.openedAt,
              closedAt: t.closedAt
            }
          });
        }
        
        // chunk equity curve saves if large, but we only have 100 for Phase 3 tests
        for (const eq of result.equityCurve) {
          await tx.backtestEquityPoint.create({
            data: {
              backtestRunId: run.id,
              timestamp: eq.timestamp,
              cash: eq.cash,
              positionValue: eq.positionValue,
              equity: eq.equity,
              drawdown: eq.drawdown,
              drawdownPercent: eq.drawdownPercent
            }
          });
        }
        
        await tx.backtestMetric.create({
          data: {
            backtestRunId: run.id,
            totalReturn: result.totalReturn,
            netPnl: result.netPnl,
            grossProfit: result.grossProfit,
            grossLoss: result.grossLoss,
            totalFees: result.totalFees,
            winRate: result.winRate,
            profitFactor: result.profitFactor,
            maxDrawdown: result.maxDrawdown,
            maxDrawdownPercent: result.maxDrawdownPercent,
            totalTrades: result.totalTrades,
            winningTrades: result.winningTrades,
            losingTrades: result.losingTrades,
            averageWin: result.averageWin,
            averageLoss: result.averageLoss
          }
        });

        await tx.backtestRun.update({
          where: { id: run.id },
          data: { status: 'COMPLETED', completedAt: new Date() }
        });
      });

      return await this.getBacktest(userId, run.id);
    } catch (e: Error | unknown) {
      await prisma.backtestRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', errorMessage: e instanceof Error ? e.message : String(e), completedAt: new Date() }
      });
      throw e;
    }
  }

  async getBacktests(userId: string) {
    return prisma.backtestRun.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  async getBacktest(userId: string, id: string) {
    const b = await prisma.backtestRun.findUnique({ where: { id }, include: { strategy: true, instrument: true, metrics: true } });
    if (!b) throw new NotFoundException();
    if (b.userId !== userId) throw new ForbiddenException();
    return b;
  }

  async getBacktestTrades(userId: string, id: string) {
    await this.getBacktest(userId, id);
    return prisma.backtestTrade.findMany({ where: { backtestRunId: id }, orderBy: { closedAt: 'asc' } });
  }

  async getBacktestMetrics(userId: string, backtestId: string) {
    const run = await prisma.backtestRun.findUnique({ where: { id: backtestId } });
    if (!run) throw new NotFoundException();
    if (run.userId !== userId) throw new ForbiddenException();
    const metrics = await prisma.backtestMetric.findUnique({ where: { backtestRunId: backtestId } });
    if (!metrics) throw new NotFoundException();
    return metrics;
  }

  async getBacktestEquity(userId: string, id: string) {
    await this.getBacktest(userId, id);
    return prisma.backtestEquityPoint.findMany({ where: { backtestRunId: id }, orderBy: { timestamp: 'asc' } });
  }
}

import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { HistoricalDataProvider } from './historical-data.provider';
import { StrategyCompiler } from './canonical/strategy.compiler';
import { BacktestAdapter } from './canonical/backtest.adapter';
import { StrategyExecutionEngine } from './canonical/strategy-execution.engine';
import { IndicatorEngine } from './indicators/indicator.engine';

@Injectable()
export class BacktestService {
  constructor(
    private readonly dataProvider: HistoricalDataProvider,
    private readonly strategyCompiler: StrategyCompiler,
    private readonly backtestAdapter: BacktestAdapter,
    private readonly strategyExecutionEngine: StrategyExecutionEngine,
  ) {}

  async createStrategy(userId: string, data: any) {
    // Validate strategy configuration at creation time
    this.strategyCompiler.compile({ type: data.type, config: data.configuration }, 'TEMP', '1D', data.type);
    
    return prisma.strategy.create({
      data: {
        userId,
        name: data.name,
        description: data.description,
        type: data.type,
        configuration: data.configuration as Prisma.InputJsonValue,
        assetClass: data.assetClass,
        defaultTimeframe: data.defaultTimeframe,
        tags: data.tags || [],
        version: 1
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

  async runBacktest(userId: string, data: { strategyId: string; instrumentId: string; startDate: string; endDate: string; initialCapital: string; costProfileId?: string }) {
    const strategy = await this.getStrategy(userId, data.strategyId);
    
    // Make sure instrument exists
    const instrument = await prisma.instrument.findUnique({ where: { id: data.instrumentId } });
    if (!instrument) throw new NotFoundException('Instrument not found');

    const initialCapital = new Prisma.Decimal(data.initialCapital);
    const commissionRate = new Prisma.Decimal('0.001'); // Fixed fee policy

    // Compile the strategy to get the canonical representation
    const compiledStrategy = this.strategyCompiler.compile(
      { type: strategy.type, config: strategy.configuration },
      instrument.symbol,
      '1D',
      strategy.type
    );

    // Get cost profile if specified
    let costProfile = null;
    if (data.costProfileId) {
      costProfile = await prisma.financialCostProfile.findUnique({ where: { id: data.costProfileId } });
      if (!costProfile) throw new NotFoundException('Cost profile not found');
    }

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
        status: 'RUNNING',
        strategySnapshot: compiledStrategy.rawConfiguration as Prisma.InputJsonValue,
        costProfileId: costProfile?.id || null,
      }
    });

    try {
      const bars = await this.dataProvider.getBars(instrument.id, run.startDate, run.endDate);
      
      const result = await this.backtestAdapter.execute(compiledStrategy, bars, {
        instrumentId: instrument.id,
        initialCapital,
        commissionRate,
        startDate: run.startDate,
        endDate: run.endDate,
        costProfile: costProfile ? {
          brokerageModel: costProfile.brokerageModel,
          brokerageValue: costProfile.brokerageValue,
          exchangeFeeModel: costProfile.exchangeFeeModel,
          exchangeFeeValue: costProfile.exchangeFeeValue,
          taxModel: costProfile.taxModel,
          taxValue: costProfile.taxValue,
          slippageModel: costProfile.slippageModel,
          slippageValue: costProfile.slippageValue,
        } : null,
      });

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
              closedAt: t.closedAt,
              totalCosts: t.totalCosts,
              brokerage: t.brokerage,
              exchangeFees: t.exchangeFees,
              taxes: t.taxes,
              slippage: t.slippageCost,
            }
          });
        }
        
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
            totalCosts: result.totalCosts,
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
    return prisma.backtestRun.findMany({ 
      where: { userId }, 
      orderBy: { createdAt: 'desc' },
      include: { strategy: true, instrument: true, metrics: true }
    });
  }

  async getBacktest(userId: string, id: string) {
    const b = await prisma.backtestRun.findUnique({ where: { id }, include: { strategy: true, instrument: true, metrics: true, costProfile: true } });
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

  async validateStrategyConfiguration(configuration: { type: string; config: unknown }, type: string) {
    return this.strategyCompiler.compile(configuration, 'TEMP', '1D', type);
  }

  async compareStrategies(userId: string, strategyIds: string[]) {
    const strategies = await prisma.strategy.findMany({
      where: {
        id: { in: strategyIds },
        userId
      },
      include: {
        backtests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            metrics: true
          }
        }
      }
    });

    return strategies.map(strategy => {
      const latestBacktest = strategy.backtests[0] || null;
      return {
        strategy: {
          id: strategy.id,
          name: strategy.name,
          version: strategy.version,
          assetClass: strategy.assetClass,
          defaultTimeframe: strategy.defaultTimeframe
        },
        metrics: latestBacktest?.metrics || null
      };
    });
  }

}
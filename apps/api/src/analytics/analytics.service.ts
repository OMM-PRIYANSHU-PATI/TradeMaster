import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { PaperAccountService } from '../trading/paper-account.service';

export interface BacktestAnalyticsResult {
  backtestId: string;
  returns: {
    netPnl: string;
    totalReturn: number | null;
    grossProfit: string;
    grossLoss: string;
    fees: string;
  };
  drawdown: {
    peakEquity: string;
    maxDrawdown: string;
    maxDrawdownPercent: number;
    recoveryPeriod: number | null;
  };
  trades: {
    total: number;
    winning: number;
    losing: number;
    winRate: number | null;
    averageWin: string | null;
    averageLoss: string | null;
    profitFactor: number | null;
    riskReward: number | null;
    expectancy: string | null;
  };
  portfolio: {
    exposure: number;
    turnover: number | null;
    concentration: number | null;
    strategyContribution: Record<string, string> | null;
  };
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly paperAccountService: PaperAccountService) {}

  async getBacktestAnalytics(userId: string, backtestId: string): Promise<BacktestAnalyticsResult> {
    const backtest = await prisma.backtestRun.findUnique({
      where: { id: backtestId },
      include: {
        trades: true,
        equityCurve: {
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!backtest) {
      throw new NotFoundException('Backtest not found');
    }

    if (backtest.userId !== userId) {
      throw new ForbiddenException('You do not have access to this backtest');
    }

    const initialCapital = backtest.initialCapital;
    
    let grossProfit = new Prisma.Decimal(0);
    let grossLoss = new Prisma.Decimal(0);
    let fees = new Prisma.Decimal(0);
    let netPnl = new Prisma.Decimal(0);
    
    let winningTrades = 0;
    let losingTrades = 0;
    let netWinTotal = new Prisma.Decimal(0);
    let netLossTotal = new Prisma.Decimal(0);

    for (const trade of backtest.trades) {
      fees = fees.add(trade.fees);
      
      // Pure gross metrics
      if (trade.grossPnl.gt(0)) {
        grossProfit = grossProfit.add(trade.grossPnl);
      } else if (trade.grossPnl.lt(0)) {
        grossLoss = grossLoss.add(trade.grossPnl);
      }

      // Pure net classification and metrics
      if (trade.netPnl.gt(0)) {
        winningTrades++;
        netWinTotal = netWinTotal.add(trade.netPnl);
      } else {
        losingTrades++;
        netLossTotal = netLossTotal.add(trade.netPnl);
      }
    }

    if (backtest.equityCurve.length > 0) {
      const finalEquity = backtest.equityCurve[backtest.equityCurve.length - 1].equity;
      netPnl = finalEquity.sub(initialCapital);
    }

    const totalTrades = winningTrades + losingTrades;

    let totalReturn: number | null = null;
    if (initialCapital.gt(0)) {
      totalReturn = netPnl.div(initialCapital).toNumber();
    }

    // Averages (using Net P&L for coherence)
    let averageWin: Prisma.Decimal | null = null;
    if (winningTrades > 0) {
      averageWin = netWinTotal.div(winningTrades);
    }
    
    let averageLoss: Prisma.Decimal | null = null;
    if (losingTrades > 0) {
      averageLoss = netLossTotal.abs().div(losingTrades);
    }

    let winRate: number | null = null;
    if (totalTrades > 0) {
      winRate = winningTrades / totalTrades;
    }

    let profitFactor: number | null = null;
    if (!grossLoss.isZero()) {
      profitFactor = grossProfit.div(grossLoss.abs()).toNumber();
    }

    let riskReward: number | null = null;
    if (averageWin && averageLoss && !averageLoss.isZero()) {
      riskReward = averageWin.div(averageLoss).toNumber();
    }

    let expectancy: Prisma.Decimal | null = null;
    if (winRate !== null && totalTrades > 0) {
      const wrDec = new Prisma.Decimal(winRate);
      const lossRateDec = new Prisma.Decimal(1 - winRate);
      const awDec = averageWin || new Prisma.Decimal(0);
      const alDec = averageLoss || new Prisma.Decimal(0);
      expectancy = wrDec.mul(awDec).sub(lossRateDec.mul(alDec));
    }

    // Drawdown & Equity Curve
    let peakEquity = initialCapital;
    let maxDrawdown = new Prisma.Decimal(0);
    let maxDrawdownPercent = 0;
    
    let recoveryPeriod: number | null = null;
    let currentDrawdownStartTimestamp: Date | null = null;
    let maxRecoveryDurationMs = 0;
    let currentlyInDrawdown = false;

    let timeInMarketMs = 0;
    let totalTimeMs = 0;
    
    // Evaluate intervals and points
    for (let i = 0; i < backtest.equityCurve.length; i++) {
      const point = backtest.equityCurve[i];
      
      // Calculate exposure using strict timestamp intervals governed by position state at start of interval
      if (i < backtest.equityCurve.length - 1) {
        const nextPoint = backtest.equityCurve[i + 1];
        const diffMs = nextPoint.timestamp.getTime() - point.timestamp.getTime();
        totalTimeMs += diffMs;
        if (point.positionValue.gt(0)) {
          timeInMarketMs += diffMs;
        }
      }

      // Drawdown and Recovery calculation
      if (point.equity.gte(peakEquity)) {
        if (currentlyInDrawdown && currentDrawdownStartTimestamp) {
          const duration = point.timestamp.getTime() - currentDrawdownStartTimestamp.getTime();
          if (duration > maxRecoveryDurationMs) {
            maxRecoveryDurationMs = duration;
          }
          currentlyInDrawdown = false;
        }
        if (point.equity.gt(peakEquity)) {
          peakEquity = point.equity;
          currentDrawdownStartTimestamp = point.timestamp;
        }
      } else if (point.equity.lt(peakEquity)) {
        currentlyInDrawdown = true;
        const drawdown = peakEquity.sub(point.equity);
        if (drawdown.gt(maxDrawdown)) {
          maxDrawdown = drawdown;
          maxDrawdownPercent = drawdown.div(peakEquity).toNumber();
        }
      }
    }

    if (maxRecoveryDurationMs > 0) {
      // Specified in days per typical product semantics. Could be sub-day if timestamps permit,
      // but specification requests standard days or explicit representation. Returning ms directly or days.
      recoveryPeriod = maxRecoveryDurationMs / (1000 * 60 * 60 * 24); 
    }

    let exposure = 0;
    if (totalTimeMs > 0) {
      exposure = timeInMarketMs / totalTimeMs;
    }

    // Turnover - Deferred due to lack of source feature specification definition
    const turnover = null;

    // Strategy Contribution - Deferred/Unsupported as we map 1 strategy per BacktestRun
    const strategyContribution = null;
    const concentration = null;

    return {
      backtestId,
      returns: {
        netPnl: netPnl.toDecimalPlaces(8).toString(),
        totalReturn,
        grossProfit: grossProfit.toDecimalPlaces(8).toString(),
        grossLoss: grossLoss.toDecimalPlaces(8).toString(),
        fees: fees.toDecimalPlaces(8).toString(),
      },
      drawdown: {
        peakEquity: peakEquity.toDecimalPlaces(8).toString(),
        maxDrawdown: maxDrawdown.toDecimalPlaces(8).toString(),
        maxDrawdownPercent,
        recoveryPeriod,
      },
      trades: {
        total: totalTrades,
        winning: winningTrades,
        losing: losingTrades,
        winRate,
        averageWin: averageWin?.toDecimalPlaces(8).toString() ?? null,
        averageLoss: averageLoss?.toDecimalPlaces(8).toString() ?? null,
        profitFactor,
        riskReward,
        expectancy: expectancy?.toDecimalPlaces(8).toString() ?? null,
      },
      portfolio: {
        exposure,
        turnover,
        concentration,
        strategyContribution
      }
    };
  }

  async getPaperAnalytics(userId: string, accountId: string) {
    const portfolio = await this.paperAccountService.getPortfolio(userId, accountId);
    
    // Ensure totalFees is positive in the response for display (magnitude of cost)
    const totalFees = portfolio.totalFees.abs();
    
    // Get execution count
    const executionCount = await prisma.orderFill.count({
      where: { order: { accountId, account: { userId } } }
    });

    return {
      accountId: portfolio.accountId,
      returns: {
        initialBalance: portfolio.initialBalance.toString(),
        currentPortfolioValue: portfolio.totalPortfolioValue.toString(),
        netPnl: portfolio.netPnl.toString(),
        totalReturn: portfolio.initialBalance.isZero() ? 0 : portfolio.netPnl.div(portfolio.initialBalance).toNumber(),
        realizedPnl: portfolio.realizedTradingPnl.toString(),
        unrealizedPnl: portfolio.unrealizedPnl.toString(),
        totalFees: totalFees.toString()
      },
      positions: portfolio.positions.map(p => ({
        instrumentId: p.instrumentId,
        symbol: p.instrument.symbol,
        quantity: p.quantity.toString(),
        averageEntryPrice: p.averageEntryPrice.toString(),
        currentPrice: p.quantity.isZero() ? '0' : p.marketValue.div(p.quantity).toString(),
        marketValue: p.marketValue.toString(),
        unrealizedPnl: p.unrealizedPnl.toString(),
        realizedPnl: p.realizedPnl.toString()
      })),
      activity: {
        executionCount
      }
    };
  }
}

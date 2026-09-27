import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';

export interface TradeRecord {
  grossPnl: Prisma.Decimal;
  netPnl: Prisma.Decimal;
  entryPrice: Prisma.Decimal;
  exitPrice: Prisma.Decimal;
  quantity: Prisma.Decimal;
  openedAt: Date;
  closedAt: Date;
  fees: Prisma.Decimal;
}

export interface EquityPoint {
  timestamp: Date;
  equity: Prisma.Decimal;
  cash: Prisma.Decimal;
  positionValue: Prisma.Decimal;
  drawdown?: Prisma.Decimal;
  drawdownPercent?: Prisma.Decimal;
}

export interface PerformanceMetrics {
  totalReturn: Prisma.Decimal | null;
  cagr: Prisma.Decimal | null;
  winRate: Prisma.Decimal | null;
  profitFactor: Prisma.Decimal | null;
  sharpeRatio: Prisma.Decimal | null;
  sortinoRatio: Prisma.Decimal | null;
  maxDrawdown: Prisma.Decimal;
  maxDrawdownPercent: Prisma.Decimal;
  recoveryPeriod: number | null;
  calmarRatio: Prisma.Decimal | null;
  volatility: Prisma.Decimal | null;
  expectancy: Prisma.Decimal | null;
  averageWin: Prisma.Decimal | null;
  averageLoss: Prisma.Decimal | null;
  averageTrade: Prisma.Decimal | null;
  averageHoldingPeriod: number | null;
  medianHoldingPeriod: number | null;
  maxHoldingPeriod: number | null;
  minHoldingPeriod: number | null;
  averageExposure: Prisma.Decimal | null;
  maxExposure: Prisma.Decimal | null;
  maxWinningStreak: number;
  maxLosingStreak: number;
  currentStreak: number;
  monthlyReturns: MonthlyReturn[];
  yearlyReturns: YearlyReturn[];
}

export interface MonthlyReturn {
  year: number;
  month: number;
  return: Prisma.Decimal;
  grossPnl: Prisma.Decimal;
  netPnl: Prisma.Decimal;
  costs: Prisma.Decimal;
}

export interface YearlyReturn {
  year: number;
  return: Prisma.Decimal;
  grossPnl: Prisma.Decimal;
  netPnl: Prisma.Decimal;
  costs: Prisma.Decimal;
}

export interface FinancialResult {
  initialCapital: Prisma.Decimal;
  finalCapital: Prisma.Decimal;
  currentEquity: Prisma.Decimal;
  grossPnl: Prisma.Decimal;
  netPnl: Prisma.Decimal;
  totalCosts: Prisma.Decimal;
  totalFees: Prisma.Decimal;
  totalSlippage: Prisma.Decimal;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  openPositions: number;
  realizedPnl: Prisma.Decimal;
  unrealizedPnl: Prisma.Decimal;
}

@Injectable()
export class PerformanceAnalyticsService {
  private readonly RISK_FREE_RATE = 0.02;
  private readonly TRADING_DAYS_PER_YEAR = 252;

  calculateFinancialResult(
    initialCapital: Prisma.Decimal,
    finalCapital: Prisma.Decimal,
    currentEquity: Prisma.Decimal,
    trades: TradeRecord[],
    openPositionsPnl: { realized: Prisma.Decimal; unrealized: Prisma.Decimal }
  ): FinancialResult {
    const grossPnl = trades.reduce((sum, t) => sum.add(t.grossPnl), new Prisma.Decimal(0));
    const totalFees = trades.reduce((sum, t) => sum.add(t.fees), new Prisma.Decimal(0));
    const totalSlippage = trades.reduce((sum, t) => sum.add(t.fees.mul(0)), new Prisma.Decimal(0));
    const totalCosts = totalFees.add(totalSlippage);
    const netPnl = finalCapital.sub(initialCapital);
    const winningTrades = trades.filter(t => t.netPnl.gt(0)).length;
    const losingTrades = trades.filter(t => t.netPnl.lte(0)).length;

    return {
      initialCapital,
      finalCapital,
      currentEquity,
      grossPnl,
      netPnl,
      totalCosts,
      totalFees,
      totalSlippage,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      openPositions: 0,
      realizedPnl: openPositionsPnl.realized,
      unrealizedPnl: openPositionsPnl.unrealized,
    };
  }

  calculatePerformanceMetrics(
    initialCapital: Prisma.Decimal,
    finalCapital: Prisma.Decimal,
    trades: TradeRecord[],
    equityCurve: EquityPoint[],
    startDate: Date,
    endDate: Date
  ): PerformanceMetrics {
    const totalReturn = this.calculateTotalReturn(initialCapital, finalCapital);
    const cagr = this.calculateCAGR(initialCapital, finalCapital, startDate, endDate);
    const winRate = this.calculateWinRate(trades);
    const profitFactor = this.calculateProfitFactor(trades);
    const sharpeRatio = this.calculateSharpeRatio(equityCurve);
    const sortinoRatio = this.calculateSortinoRatio(equityCurve);
    const { maxDrawdown, maxDrawdownPercent, recoveryPeriod } = this.calculateDrawdown(equityCurve);
    const calmarRatio = this.calculateCalmarRatio(cagr, maxDrawdownPercent);
    const volatility = this.calculateVolatility(equityCurve);
    const expectancy = this.calculateExpectancy(trades);
    const { averageWin, averageLoss, averageTrade } = this.calculateAverageWinLoss(trades);
    const holdingPeriods = this.calculateHoldingPeriods(trades);
    const { averageExposure, maxExposure } = this.calculateExposure(equityCurve);
    const streaks = this.calculateStreaks(trades);
    const monthlyReturns = this.calculateMonthlyReturns(trades);
    const yearlyReturns = this.calculateYearlyReturns(trades);

    return {
      totalReturn,
      cagr,
      winRate,
      profitFactor,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      maxDrawdownPercent,
      recoveryPeriod,
      calmarRatio,
      volatility,
      expectancy,
      averageWin,
      averageLoss,
      averageTrade,
      averageHoldingPeriod: holdingPeriods.average,
      medianHoldingPeriod: holdingPeriods.median,
      maxHoldingPeriod: holdingPeriods.max,
      minHoldingPeriod: holdingPeriods.min,
      averageExposure,
      maxExposure,
      maxWinningStreak: streaks.maxWinning,
      maxLosingStreak: streaks.maxLosing,
      currentStreak: streaks.current,
      monthlyReturns,
      yearlyReturns,
    };
  }

  private calculateTotalReturn(initialCapital: Prisma.Decimal, finalCapital: Prisma.Decimal): Prisma.Decimal | null {
    if (initialCapital.isZero()) return null;
    return finalCapital.sub(initialCapital).div(initialCapital).mul(100);
  }

  private calculateCAGR(
    initialCapital: Prisma.Decimal,
    finalCapital: Prisma.Decimal,
    startDate: Date,
    endDate: Date
  ): Prisma.Decimal | null {
    if (initialCapital.isZero() || initialCapital.lte(0)) return null;
    if (finalCapital.lte(0)) return null;

    const diffMs = endDate.getTime() - startDate.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);

    if (years <= 0) return null;

    const ratio = finalCapital.div(initialCapital);
    const cagr = Math.pow(ratio.toNumber(), 1 / years) - 1;
    return new Prisma.Decimal(cagr * 100);
  }

  private calculateWinRate(trades: TradeRecord[]): Prisma.Decimal | null {
    const closedTrades = trades.filter(t => t.netPnl !== undefined && t.netPnl !== null);
    if (closedTrades.length === 0) return new Prisma.Decimal(0);

    const winningTrades = closedTrades.filter(t => t.netPnl.gt(0)).length;
    return new Prisma.Decimal(winningTrades / closedTrades.length * 100);
  }

  private calculateProfitFactor(trades: TradeRecord[]): Prisma.Decimal | null {
    let grossProfit = new Prisma.Decimal(0);
    let grossLoss = new Prisma.Decimal(0);

    for (const trade of trades) {
      if (trade.grossPnl.gt(0)) {
        grossProfit = grossProfit.add(trade.grossPnl);
      } else if (trade.grossPnl.lt(0)) {
        grossLoss = grossLoss.add(trade.grossPnl.abs());
      }
    }

    if (grossLoss.isZero()) return null;
    return grossProfit.div(grossLoss);
  }

  private calculateSharpeRatio(equityCurve: EquityPoint[]): Prisma.Decimal | null {
    if (equityCurve.length < 2) return null;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      const curr = equityCurve[i].equity;
      if (prev.isZero()) continue;
      const ret = curr.sub(prev).div(prev).toNumber();
      returns.push(ret);
    }

    if (returns.length === 0) return null;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev === 0) return null;

    const annualizedReturn = mean * this.TRADING_DAYS_PER_YEAR;
    const annualizedStdDev = stdDev * Math.sqrt(this.TRADING_DAYS_PER_YEAR);
    const sharpe = (annualizedReturn - this.RISK_FREE_RATE) / annualizedStdDev;

    return new Prisma.Decimal(sharpe);
  }

  private calculateSortinoRatio(equityCurve: EquityPoint[]): Prisma.Decimal | null {
    if (equityCurve.length < 2) return null;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      const curr = equityCurve[i].equity;
      if (prev.isZero()) continue;
      const ret = curr.sub(prev).div(prev).toNumber();
      returns.push(ret);
    }

    if (returns.length === 0) return null;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const negativeReturns = returns.filter(r => r < 0);
    if (negativeReturns.length === 0) return new Prisma.Decimal(100);

    const downsideVariance = negativeReturns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / negativeReturns.length;
    const downsideDev = Math.sqrt(downsideVariance);

    if (downsideDev === 0) return null;

    const annualizedReturn = mean * this.TRADING_DAYS_PER_YEAR;
    const annualizedDownsideDev = downsideDev * Math.sqrt(this.TRADING_DAYS_PER_YEAR);
    const sortino = (annualizedReturn - this.RISK_FREE_RATE) / annualizedDownsideDev;

    return new Prisma.Decimal(sortino);
  }

  private calculateDrawdown(equityCurve: EquityPoint[]): {
    maxDrawdown: Prisma.Decimal;
    maxDrawdownPercent: Prisma.Decimal;
    recoveryPeriod: number | null;
  } {
    let peak = equityCurve[0]?.equity || new Prisma.Decimal(0);
    let maxDrawdown = new Prisma.Decimal(0);
    let maxDrawdownPercent = new Prisma.Decimal(0);
    let inDrawdown = false;
    let drawdownStart: Date | null = null;
    let maxRecoveryDays: number | null = null;

    for (const point of equityCurve) {
      if (point.equity.gte(peak)) {
        if (inDrawdown && drawdownStart) {
          const recoveryDays = (point.timestamp.getTime() - drawdownStart.getTime()) / (1000 * 60 * 60 * 24);
          if (maxRecoveryDays === null || recoveryDays > maxRecoveryDays) {
            maxRecoveryDays = recoveryDays;
          }
        }
        peak = point.equity;
        inDrawdown = false;
        drawdownStart = point.timestamp;
      } else {
        const drawdown = peak.sub(point.equity);
        const drawdownPercent = drawdown.div(peak).mul(100);

        if (drawdown.gt(maxDrawdown)) {
          maxDrawdown = drawdown;
          maxDrawdownPercent = drawdownPercent;
        }

        if (!inDrawdown) {
          inDrawdown = true;
          drawdownStart = point.timestamp;
        }
      }
    }

    return { maxDrawdown, maxDrawdownPercent, recoveryPeriod: maxRecoveryDays };
  }

  private calculateCalmarRatio(cagr: Prisma.Decimal | null, maxDrawdownPercent: Prisma.Decimal): Prisma.Decimal | null {
    if (!cagr || maxDrawdownPercent.isZero()) return null;
    return cagr.div(maxDrawdownPercent);
  }

  private calculateVolatility(equityCurve: EquityPoint[]): Prisma.Decimal | null {
    if (equityCurve.length < 2) return null;

    const returns: number[] = [];
    for (let i = 1; i < equityCurve.length; i++) {
      const prev = equityCurve[i - 1].equity;
      const curr = equityCurve[i].equity;
      if (prev.isZero()) continue;
      const ret = curr.sub(prev).div(prev).toNumber();
      returns.push(ret);
    }

    if (returns.length === 0) return null;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    const annualizedVol = stdDev * Math.sqrt(this.TRADING_DAYS_PER_YEAR);

    return new Prisma.Decimal(annualizedVol * 100);
  }

  private calculateExpectancy(trades: TradeRecord[]): Prisma.Decimal | null {
    const closedTrades = trades.filter(t => t.netPnl !== undefined && t.netPnl !== null);
    if (closedTrades.length === 0) return null;

    const winningTrades = closedTrades.filter(t => t.netPnl.gt(0));
    const losingTrades = closedTrades.filter(t => t.netPnl.lte(0));

    if (winningTrades.length === 0 && losingTrades.length === 0) return null;

    const winRate = new Prisma.Decimal(winningTrades.length / closedTrades.length);
    const lossRate = new Prisma.Decimal(1).sub(winRate);

    const avgWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum.add(t.netPnl), new Prisma.Decimal(0)).div(winningTrades.length)
      : new Prisma.Decimal(0);

    const avgLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum.add(t.netPnl.abs()), new Prisma.Decimal(0)).div(losingTrades.length)
      : new Prisma.Decimal(0);

    return winRate.mul(avgWin).sub(lossRate.mul(avgLoss));
  }

  private calculateAverageWinLoss(trades: TradeRecord[]): {
    averageWin: Prisma.Decimal | null;
    averageLoss: Prisma.Decimal | null;
    averageTrade: Prisma.Decimal | null;
  } {
    const closedTrades = trades.filter(t => t.netPnl !== undefined && t.netPnl !== null);
    if (closedTrades.length === 0) return { averageWin: null, averageLoss: null, averageTrade: null };

    const winningTrades = closedTrades.filter(t => t.netPnl.gt(0));
    const losingTrades = closedTrades.filter(t => t.netPnl.lte(0));

    const averageWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum.add(t.netPnl), new Prisma.Decimal(0)).div(winningTrades.length)
      : null;

    const averageLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum.add(t.netPnl.abs()), new Prisma.Decimal(0)).div(losingTrades.length)
      : null;

    const averageTrade = closedTrades.reduce((sum, t) => sum.add(t.netPnl), new Prisma.Decimal(0)).div(closedTrades.length);

    return { averageWin, averageLoss, averageTrade };
  }

  private calculateHoldingPeriods(trades: TradeRecord[]): {
    average: number | null;
    median: number | null;
    max: number | null;
    min: number | null;
  } {
    const closedTrades = trades.filter(t => t.openedAt && t.closedAt);
    if (closedTrades.length === 0) return { average: null, median: null, max: null, min: null };

    const periods = closedTrades.map(t => 
      (t.closedAt.getTime() - t.openedAt.getTime()) / (1000 * 60 * 60 * 24)
    ).sort((a, b) => a - b);

    const average = periods.reduce((a, b) => a + b, 0) / periods.length;
    const median = periods[Math.floor(periods.length / 2)];
    const max = periods[periods.length - 1];
    const min = periods[0];

    return { average, median, max, min };
  }

  private calculateExposure(equityCurve: EquityPoint[]): {
    averageExposure: Prisma.Decimal | null;
    maxExposure: Prisma.Decimal | null;
  } {
    if (equityCurve.length < 2) return { averageExposure: null, maxExposure: null };

    let totalTimeMs = 0;
    let timeInMarketMs = 0;
    let maxExposure = new Prisma.Decimal(0);

    for (let i = 0; i < equityCurve.length - 1; i++) {
      const point = equityCurve[i];
      const nextPoint = equityCurve[i + 1];
      const diffMs = nextPoint.timestamp.getTime() - point.timestamp.getTime();
      totalTimeMs += diffMs;

      const exposure = point.equity.isZero() ? new Prisma.Decimal(0) : point.positionValue.div(point.equity);
      if (exposure.gt(maxExposure)) maxExposure = exposure;

      if (point.positionValue.gt(0)) {
        timeInMarketMs += diffMs;
      }
    }

    const averageExposure = totalTimeMs > 0
      ? new Prisma.Decimal(timeInMarketMs / totalTimeMs * 100)
      : null;

    return { averageExposure, maxExposure };
  }

  private calculateStreaks(trades: TradeRecord[]): {
    maxWinning: number;
    maxLosing: number;
    current: number;
  } {
    const closedTrades = trades.filter(t => t.netPnl !== undefined && t.netPnl !== null);
    if (closedTrades.length === 0) return { maxWinning: 0, maxLosing: 0, current: 0 };

    let maxWinning = 0;
    let maxLosing = 0;
    let currentWinning = 0;
    let currentLosing = 0;

    for (const trade of closedTrades) {
      if (trade.netPnl.gt(0)) {
        currentWinning++;
        currentLosing = 0;
        if (currentWinning > maxWinning) maxWinning = currentWinning;
      } else {
        currentLosing++;
        currentWinning = 0;
        if (currentLosing > maxLosing) maxLosing = currentLosing;
      }
    }

    const current = closedTrades.length > 0 && closedTrades[closedTrades.length - 1].netPnl.gt(0)
      ? currentWinning
      : -currentLosing;

    return { maxWinning, maxLosing, current };
  }

  private calculateMonthlyReturns(trades: TradeRecord[]): MonthlyReturn[] {
    const monthlyMap = new Map<string, { grossPnl: Prisma.Decimal; netPnl: Prisma.Decimal; costs: Prisma.Decimal }>();

    for (const trade of trades) {
      const date = trade.closedAt;
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const existing = monthlyMap.get(key) || { grossPnl: new Prisma.Decimal(0), netPnl: new Prisma.Decimal(0), costs: new Prisma.Decimal(0) };
      existing.grossPnl = existing.grossPnl.add(trade.grossPnl);
      existing.netPnl = existing.netPnl.add(trade.netPnl);
      existing.costs = existing.costs.add(trade.fees);
      monthlyMap.set(key, existing);
    }

    const results: MonthlyReturn[] = [];
    for (const [key, value] of monthlyMap.entries()) {
      const [year, month] = key.split('-').map(Number);
      results.push({
        year,
        month,
        return: value.netPnl,
        grossPnl: value.grossPnl,
        netPnl: value.netPnl,
        costs: value.costs,
      });
    }

    return results.sort((a, b) => a.year - b.year || a.month - b.month);
  }

  private calculateYearlyReturns(trades: TradeRecord[]): YearlyReturn[] {
    const yearlyMap = new Map<number, { grossPnl: Prisma.Decimal; netPnl: Prisma.Decimal; costs: Prisma.Decimal }>();

    for (const trade of trades) {
      const year = trade.closedAt.getFullYear();
      const existing = yearlyMap.get(year) || { grossPnl: new Prisma.Decimal(0), netPnl: new Prisma.Decimal(0), costs: new Prisma.Decimal(0) };
      existing.grossPnl = existing.grossPnl.add(trade.grossPnl);
      existing.netPnl = existing.netPnl.add(trade.netPnl);
      existing.costs = existing.costs.add(trade.fees);
      yearlyMap.set(year, existing);
    }

    const results: YearlyReturn[] = [];
    for (const [year, value] of yearlyMap.entries()) {
      results.push({
        year,
        return: value.netPnl,
        grossPnl: value.grossPnl,
        netPnl: value.netPnl,
        costs: value.costs,
      });
    }

    return results.sort((a, b) => a.year - b.year);
  }
}
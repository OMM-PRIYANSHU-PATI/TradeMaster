import { Injectable, BadRequestException } from '@nestjs/common';
import { IndicatorEngine } from './indicators/indicator.engine';
import { Prisma } from 'database';
import { HistoricalDataProvider } from './historical-data.provider';
import { StrategyEngine } from './strategy.engine';
import { PnlService } from '../trading/pnl.service';
import { FeeService } from '../trading/fee.service';
import { TradeRecord } from './interfaces';

@Injectable()
export class BacktestEngine {
  constructor(
    private readonly dataProvider: HistoricalDataProvider,
    private readonly strategyEngine: StrategyEngine,
    private readonly pnlService: PnlService,
    private readonly feeService: FeeService
  ) {}

  async runBacktest(
    instrumentId: string,
    startDate: Date,
    endDate: Date,
    initialCapital: Prisma.Decimal,
    commissionRate: Prisma.Decimal,
    strategyConfig: unknown,
    customProviderBars?: import("./interfaces").HistoricalBar[] // Optional injection for no-lookahead unit tests
  ) {
    const validConfig = this.strategyEngine.parseStrategyConfiguration(strategyConfig);

    const bars = customProviderBars || this.dataProvider.getBars(instrumentId, startDate, endDate);

    // Historical Bar Validation Boundary
    if (bars.length > 0) {
      let lastTime = 0;
      for (const bar of bars) {
        if (!bar.timestamp) throw new BadRequestException('Bar timestamp is missing');
        const time = new Date(bar.timestamp).getTime();
        if (Number.isNaN(time)) throw new BadRequestException('Bar timestamp is invalid');
        if (lastTime > 0 && time <= lastTime) throw new BadRequestException('Bars must be strictly increasing with no duplicates');
        lastTime = time;

        const open = bar.open.toNumber();
        const high = bar.high.toNumber();
        const low = bar.low.toNumber();
        const close = bar.close.toNumber();
        const volume = bar.volume.toNumber();

        if (open <= 0 || high <= 0 || low <= 0 || close <= 0) throw new BadRequestException('Bar prices must be strictly positive');
        if (volume < 0) throw new BadRequestException('Bar volume must be non-negative');
        if (high < open || high < close) throw new BadRequestException('Bar high must be >= open and close');
        if (low > open || low > close) throw new BadRequestException('Bar low must be <= open and close');
        if (high < low) throw new BadRequestException('Bar high must be >= low');
      }
    }

    if (!bars.length) throw new BadRequestException('No historical data available for backtest range');

    let cash = new Prisma.Decimal(initialCapital);
    let positionQuantity = new Prisma.Decimal(0);
    let averageEntryPrice = new Prisma.Decimal(0);
    let positionOpenedAt: Date | null = null;
    let accumulatedEntryFees = new Prisma.Decimal(0);
    
    const equityCurve = [];
    const trades: TradeRecord[] = [];
    
    let pendingSignal: { type: string, quantity?: Prisma.Decimal } | null = null;
    const indicatorEngine = new IndicatorEngine();

    for (let i = 0; i < bars.length; i++) {
      const currentBar = bars[i];
      
      if (pendingSignal) {
        const execPrice = currentBar.open;
        if (pendingSignal.type === 'BUY') {
          const qty = pendingSignal.quantity;
          const cost = qty.mul(execPrice);
          const fee = cost.mul(commissionRate);
          
          if (cash.gte(cost.add(fee))) {
            averageEntryPrice = this.pnlService.calculateNewAverageEntry(positionQuantity, averageEntryPrice, qty, execPrice);
            positionQuantity = positionQuantity.add(qty);
            cash = cash.sub(cost).sub(fee);
            accumulatedEntryFees = accumulatedEntryFees.add(fee);
            if (!positionOpenedAt) positionOpenedAt = currentBar.timestamp;
          }
        } else if (pendingSignal.type === 'SELL') {
          const qty = pendingSignal.quantity;
          if (positionQuantity.gte(qty)) {
            const grossValue = qty.mul(execPrice);
            const exitFee = grossValue.mul(commissionRate);
            
            // ACCOUNTING CONVENTION: Proportional Entry-Fee Allocation
            // We track a single accumulated entry fee pool. On partial (or full) exits,
            // the entry fee is allocated proportionally against the existing position size
            // before the sell. This safely supports multi-entry averaging.
            const allocatedEntryFee = accumulatedEntryFees.mul(qty).div(positionQuantity);
            accumulatedEntryFees = accumulatedEntryFees.sub(allocatedEntryFee);
            
            const realizedPnl = this.pnlService.calculateRealizedPnl(qty, averageEntryPrice, execPrice);
            
            cash = cash.add(grossValue).sub(exitFee);
            
            const totalFees = allocatedEntryFee.add(exitFee);
            const netPnl = realizedPnl.sub(totalFees);
            
            trades.push({
              instrumentId,
              side: 'BUY',
              quantity: qty,
              entryPrice: averageEntryPrice,
              exitPrice: execPrice,
              grossPnl: realizedPnl,
              entryFee: allocatedEntryFee,
              exitFee: exitFee,
              fees: totalFees,
              netPnl: netPnl,
              openedAt: positionOpenedAt!,
              closedAt: currentBar.timestamp
            });
            
            positionQuantity = positionQuantity.sub(qty);
            if (positionQuantity.isZero()) {
              averageEntryPrice = new Prisma.Decimal(0);
              positionOpenedAt = null;
              accumulatedEntryFees = new Prisma.Decimal(0); // Safely reset floating point dust
            }
          }
        }
        pendingSignal = null;
      }

      // NO-LOOKAHEAD
      const historyToNow = bars.slice(0, i + 1);
      const signal = this.strategyEngine.generateSignal(validConfig, historyToNow, positionQuantity, indicatorEngine);
      if (signal.type !== 'HOLD') {
        pendingSignal = signal;
      }

      const pnl = this.pnlService.calculatePnl(positionQuantity, averageEntryPrice, currentBar.close);
      const equity = cash.add(pnl.marketValue);
      
      equityCurve.push({
        timestamp: currentBar.timestamp,
        cash: cash,
        positionValue: pnl.marketValue,
        equity: equity
      });
    }
    
    // BACKTEST_FINAL_LIQUIDATION
    if (positionQuantity.gt(0)) {
      const finalBar = bars[bars.length - 1];
      const execPrice = finalBar.close;
      const qty = positionQuantity;
      
      const grossValue = qty.mul(execPrice);
      const exitFee = grossValue.mul(commissionRate);
      
      const realizedPnl = this.pnlService.calculateRealizedPnl(qty, averageEntryPrice, execPrice);
      
      cash = cash.add(grossValue).sub(exitFee);
      
      // Since we are closing 100%, all accumulated entry fees are allocated
      const totalFees = accumulatedEntryFees.add(exitFee);
      const netPnl = realizedPnl.sub(totalFees);
      
      trades.push({
        instrumentId,
        side: 'BUY',
        quantity: qty,
        entryPrice: averageEntryPrice,
        exitPrice: execPrice,
        grossPnl: realizedPnl,
        entryFee: accumulatedEntryFees,
        exitFee: exitFee,
        fees: totalFees,
        netPnl: netPnl,
        openedAt: positionOpenedAt!,
        closedAt: finalBar.timestamp
      });
      
      positionQuantity = new Prisma.Decimal(0);
      averageEntryPrice = new Prisma.Decimal(0);
      
      // Update final equity point explicitly
      const finalEquity = cash;
      equityCurve[equityCurve.length - 1].cash = cash;
      equityCurve[equityCurve.length - 1].positionValue = new Prisma.Decimal(0);
      equityCurve[equityCurve.length - 1].equity = finalEquity;
    }
    
    // Metrics calculation
    let maxEquity = new Prisma.Decimal(initialCapital);
    let maxDrawdown = new Prisma.Decimal(0);
    
    for (const pt of equityCurve) {
      if (pt.equity.gt(maxEquity)) maxEquity = pt.equity;
      const drawdown = maxEquity.sub(pt.equity);
      if (drawdown.gt(maxDrawdown)) maxDrawdown = drawdown;
      
      pt.drawdown = drawdown;
      pt.drawdownPercent = maxEquity.isZero() ? new Prisma.Decimal(0) : drawdown.div(maxEquity).mul(100);
    }
    
    const maxDrawdownPercent = maxEquity.isZero() ? new Prisma.Decimal(0) : maxDrawdown.div(maxEquity).mul(100);
    
    // SEMANTICS: averageWin = gross profit / winning trades (always positive)
    // SEMANTICS: averageLoss = gross loss / losing trades (always negative due to grossLoss being negative)
    let grossProfit = new Prisma.Decimal(0);
    let grossLoss = new Prisma.Decimal(0);
    let winCount = 0;
    let totalFees = new Prisma.Decimal(0);
    
    for (const t of trades) {
      totalFees = totalFees.add(t.fees);
      
      // Gross Profit/Loss defined by grossPnl semantics
      if (t.grossPnl.gt(0)) grossProfit = grossProfit.add(t.grossPnl);
      else grossLoss = grossLoss.add(t.grossPnl);
      
      // Win/Loss counting defined by netPnl semantics
      if (t.netPnl.gt(0)) {
        winCount++;
      }
    }
    
    const loseCount = trades.length - winCount;
    const finalEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].equity : initialCapital;
    const netPnl = finalEquity.sub(initialCapital);
    
    return {
      finalEquity,
      netPnl,
      totalReturn: initialCapital.isZero() ? new Prisma.Decimal(0) : netPnl.div(initialCapital).mul(100),
      grossProfit,
      grossLoss,
      totalFees,
      totalTrades: trades.length,
      winningTrades: winCount,
      losingTrades: loseCount,
      winRate: trades.length ? new Prisma.Decimal(winCount).div(trades.length).mul(100) : new Prisma.Decimal(0),
      profitFactor: grossLoss.isZero() ? null : grossProfit.div(grossLoss.abs()),
      maxDrawdown,
      maxDrawdownPercent,
      averageWin: winCount ? grossProfit.div(winCount) : new Prisma.Decimal(0),
      averageLoss: loseCount ? grossLoss.div(loseCount) : new Prisma.Decimal(0),
      equityCurve,
      trades
    };
  }
}

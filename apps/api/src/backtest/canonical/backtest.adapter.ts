import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';
import { HistoricalBar } from '../interfaces';
import {
  ExecutionAdapter,
  ExecutionContext,
  ExecutionResult,
  EquityPoint,
  TradeRecord,
} from './execution.adapter';
import { CompiledStrategy, PositionState, StrategyState, Signal, OrderIntent, SignalType } from './models';
import { StrategyExecutionEngine } from './strategy-execution.engine';
import { IndicatorEngine } from '../indicators/indicator.engine';
import { PnlService } from '../../trading/pnl.service';
import { FinancialCostEngine } from '../../trading/financial-cost.engine';
import type { CostCalculationRequest } from '../../trading/financial-cost.engine';

@Injectable()
export class BacktestAdapter implements ExecutionAdapter {
  constructor(
    private readonly strategyEngine: StrategyExecutionEngine,
    private readonly pnlService: PnlService,
    private readonly financialCostEngine: FinancialCostEngine
  ) {}

  async execute(
    compiledStrategy: CompiledStrategy,
    bars: HistoricalBar[],
    context: ExecutionContext
  ): Promise<ExecutionResult> {
    const indicatorEngine = new IndicatorEngine();

    let cash = new Prisma.Decimal(context.initialCapital);
    let positionQuantity = new Prisma.Decimal(0);
    let averageEntryPrice = new Prisma.Decimal(0);
    let positionOpenedAt: Date | null = null;
    let accumulatedEntryFees = new Prisma.Decimal(0);

    const equityCurve: EquityPoint[] = [];
    const trades: TradeRecord[] = [];

    let pendingSignal: Signal | null = null;

    const positionState: PositionState = {
      state: StrategyState.FLAT,
      quantity: new Prisma.Decimal(0),
      averageEntryPrice: new Prisma.Decimal(0),
    };

    for (let i = 0; i < bars.length; i++) {
      const currentBar = bars[i];
      const historyToNow = bars.slice(0, i + 1);

      // Execute pending signal from previous bar at current bar's open
      if (pendingSignal) {
        const execPrice = currentBar.open;
        const result = this.executeOrderInternal(
          pendingSignal,
          execPrice,
          positionQuantity,
          averageEntryPrice,
          positionOpenedAt,
          accumulatedEntryFees,
          cash,
          context.costProfile,
          context.instrumentId
        );
        
        cash = result.newCash;
        positionQuantity = result.newPositionQuantity;
        averageEntryPrice = result.newAverageEntryPrice;
        positionOpenedAt = result.newPositionOpenedAt;
        accumulatedEntryFees = result.newAccumulatedEntryFees;

        if (result.trade) {
          trades.push(result.trade);
        }

        pendingSignal = null;
      }

      // Update position state for signal generation
      positionState.state = positionQuantity.gt(0) ? StrategyState.LONG : StrategyState.FLAT;
      positionState.quantity = positionQuantity;
      positionState.averageEntryPrice = averageEntryPrice;

      // Generate signal for NEXT bar (no lookahead - only uses history up to current bar)
      const signal = this.strategyEngine.evaluate({
        compiledStrategy,
        currentBar,
        historyToNow,
        positionState,
        indicatorEngine,
      });

      if (signal.type !== 'HOLD') {
        pendingSignal = signal;
      }

      // Calculate equity for this bar
      const pnl = this.pnlService.calculatePnl(positionQuantity, averageEntryPrice, currentBar.close);
      const equity = cash.add(pnl.marketValue);

      equityCurve.push({
        timestamp: currentBar.timestamp,
        cash,
        positionValue: pnl.marketValue,
        equity,
        drawdown: new Prisma.Decimal(0), // Will be calculated after
        drawdownPercent: new Prisma.Decimal(0), // Will be calculated after
      });
    }

    // Final liquidation if position remains
    if (positionQuantity.gt(0)) {
      const finalBar = bars[bars.length - 1];
      const execPrice = finalBar.close;
      const qty = positionQuantity;

      const result = this.executeOrderInternal(
        { type: SignalType.SELL, quantity: qty, reason: 'Final liquidation', strategyVersion: 1, timestamp: finalBar.timestamp },
        execPrice,
        positionQuantity,
        averageEntryPrice,
        positionOpenedAt,
        accumulatedEntryFees,
        cash,
        context.costProfile,
        context.instrumentId
      );

      cash = result.newCash;
      if (result.trade) {
        trades.push(result.trade);
      }

      // Update final equity point
      const finalEquity = cash;
      if (equityCurve.length > 0) {
        equityCurve[equityCurve.length - 1].cash = cash;
        equityCurve[equityCurve.length - 1].positionValue = new Prisma.Decimal(0);
        equityCurve[equityCurve.length - 1].equity = finalEquity;
      }
    }

    // Calculate drawdowns
    let maxEquity = new Prisma.Decimal(context.initialCapital);
    let maxDrawdown = new Prisma.Decimal(0);

    for (const pt of equityCurve) {
      if (pt.equity.gt(maxEquity)) maxEquity = pt.equity;
      const drawdown = maxEquity.sub(pt.equity);
      if (drawdown.gt(maxDrawdown)) maxDrawdown = drawdown;

      pt.drawdown = drawdown;
      pt.drawdownPercent = maxEquity.isZero() ? new Prisma.Decimal(0) : drawdown.div(maxEquity).mul(100);
    }

    const maxDrawdownPercent = maxEquity.isZero() ? new Prisma.Decimal(0) : maxDrawdown.div(maxEquity).mul(100);

    // Calculate metrics using the new PerformanceAnalyticsService
    // This will be imported and used when available

    // Calculate metrics
    let grossProfit = new Prisma.Decimal(0);
    let grossLoss = new Prisma.Decimal(0);
    let winCount = 0;
    let totalFees = new Prisma.Decimal(0);
    let totalSlippage = new Prisma.Decimal(0);
    let totalCosts = new Prisma.Decimal(0);

    for (const t of trades) {
      totalFees = totalFees.add(t.fees);
      totalCosts = totalCosts.add(t.totalCosts || t.fees);

      if (t.grossPnl.gt(0)) grossProfit = grossProfit.add(t.grossPnl);
      else grossLoss = grossLoss.add(t.grossPnl);

      if (t.netPnl.gt(0)) {
        winCount++;
      }
    }

    const loseCount = trades.length - winCount;
    const finalEquity = equityCurve.length ? equityCurve[equityCurve.length - 1].equity : context.initialCapital;
    const netPnl = finalEquity.sub(context.initialCapital);

    return {
      finalEquity,
      netPnl,
      totalReturn: context.initialCapital.isZero() ? new Prisma.Decimal(0) : netPnl.div(context.initialCapital).mul(100),
      grossProfit,
      grossLoss,
      totalFees,
      totalCosts,
      totalSlippage,
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
      trades,
    };
  }

  private executeOrderInternal(
    signal: Signal,
    execPrice: Prisma.Decimal,
    positionQuantity: Prisma.Decimal,
    averageEntryPrice: Prisma.Decimal,
    positionOpenedAt: Date | null,
    accumulatedEntryFees: Prisma.Decimal,
    cash: Prisma.Decimal,
    costProfile: ExecutionContext['costProfile'],
    instrumentId: string
  ): {
    newCash: Prisma.Decimal;
    newPositionQuantity: Prisma.Decimal;
    newAverageEntryPrice: Prisma.Decimal;
    newPositionOpenedAt: Date | null;
    newAccumulatedEntryFees: Prisma.Decimal;
    trade?: TradeRecord;
  } {
    const qty = signal.quantity!;

    // Use FinancialCostEngine for cost calculation
    const costRequest: CostCalculationRequest = {
      side: signal.type === 'BUY' ? 'BUY' : 'SELL',
      quantity: qty,
      expectedPrice: execPrice,
      costProfile: costProfile || null,
    };

    const costResult = this.financialCostEngine.calculateCosts(costRequest);
    const finalExecPrice = costResult.executionPrice;
    const { brokerage, exchangeFees, taxes, slippageCost, totalCosts } = costResult.breakdown;

    if (signal.type === 'BUY') {
      const cost = qty.mul(finalExecPrice);
      const totalCost = cost.add(totalCosts);

      if (!cash.gte(totalCost)) {
        // Insufficient cash - return unchanged state
        return {
          newCash: cash,
          newPositionQuantity: positionQuantity,
          newAverageEntryPrice: averageEntryPrice,
          newPositionOpenedAt: positionOpenedAt,
          newAccumulatedEntryFees: accumulatedEntryFees,
        };
      }

      const newAvgPrice = this.pnlService.calculateNewAverageEntry(positionQuantity, averageEntryPrice, qty, finalExecPrice);
      const newPositionQty = positionQuantity.add(qty);
      const newCash = cash.sub(totalCost);
      const newAccumulatedFees = accumulatedEntryFees.add(totalCosts);
      const newOpenedAt = positionOpenedAt ?? new Date(); // Use current time as fallback

      return {
        newCash,
        newPositionQuantity: newPositionQty,
        newAverageEntryPrice: newAvgPrice,
        newPositionOpenedAt: newOpenedAt,
        newAccumulatedEntryFees: newAccumulatedFees,
      };
    } else if (signal.type === 'SELL') {
      if (!positionQuantity.gte(qty)) {
        // Insufficient position - return unchanged state
        return {
          newCash: cash,
          newPositionQuantity: positionQuantity,
          newAverageEntryPrice: averageEntryPrice,
          newPositionOpenedAt: positionOpenedAt,
          newAccumulatedEntryFees: accumulatedEntryFees,
        };
      }

      const grossValue = qty.mul(finalExecPrice);
      const netProceeds = grossValue.sub(totalCosts);

      // Allocate entry fees proportionally
      const allocatedEntryFee = accumulatedEntryFees.mul(qty).div(positionQuantity);
      const newAccumulatedEntryFees = accumulatedEntryFees.sub(allocatedEntryFee);

      const realizedPnl = this.pnlService.calculateRealizedPnl(qty, averageEntryPrice, finalExecPrice);
      const newCash = cash.add(netProceeds);

      const totalFees = allocatedEntryFee.add(totalCosts);
      const netPnl = realizedPnl.sub(totalFees);

      const trade: TradeRecord = {
        instrumentId,
        side: 'BUY',
        quantity: qty,
        entryPrice: averageEntryPrice,
        exitPrice: finalExecPrice,
        grossPnl: realizedPnl,
        entryFee: allocatedEntryFee,
        exitFee: totalCosts,
        fees: totalFees,
        netPnl: netPnl,
        openedAt: positionOpenedAt!,
        closedAt: new Date(), // Will be set by caller
        totalCosts: totalCosts,
        brokerage: brokerage,
        exchangeFees: exchangeFees,
        taxes: taxes,
        slippageCost: slippageCost,
      };

      const newPositionQty = positionQuantity.sub(qty);
      const newAvgPrice = newPositionQty.isZero() ? new Prisma.Decimal(0) : averageEntryPrice;
      const newOpenedAt = newPositionQty.isZero() ? null : positionOpenedAt;
      const finalAccumulatedFees = newPositionQty.isZero() ? new Prisma.Decimal(0) : newAccumulatedEntryFees;

      return {
        newCash,
        newPositionQuantity: newPositionQty,
        newAverageEntryPrice: newAvgPrice,
        newPositionOpenedAt: newOpenedAt,
        newAccumulatedEntryFees: finalAccumulatedFees,
        trade,
      };
    }

    return {
      newCash: cash,
      newPositionQuantity: positionQuantity,
      newAverageEntryPrice: averageEntryPrice,
      newPositionOpenedAt: positionOpenedAt,
      newAccumulatedEntryFees: accumulatedEntryFees,
    };
  }
}


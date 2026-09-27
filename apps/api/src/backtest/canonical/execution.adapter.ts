import { Prisma } from 'database';
import { HistoricalBar } from '../interfaces';
import { OrderIntent, Signal, PositionState, StrategyState, CompiledStrategy, IndicatorEngineInterface } from './models';

export interface ExecutionContext {
  instrumentId: string;
  initialCapital: Prisma.Decimal;
  commissionRate: Prisma.Decimal;
  startDate: Date;
  endDate: Date;
}

export interface ExecutionResult {
  finalEquity: Prisma.Decimal;
  netPnl: Prisma.Decimal;
  totalReturn: Prisma.Decimal;
  grossProfit: Prisma.Decimal;
  grossLoss: Prisma.Decimal;
  totalFees: Prisma.Decimal;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: Prisma.Decimal;
  profitFactor: Prisma.Decimal | null;
  maxDrawdown: Prisma.Decimal;
  maxDrawdownPercent: Prisma.Decimal;
  averageWin: Prisma.Decimal;
  averageLoss: Prisma.Decimal;
  equityCurve: EquityPoint[];
  trades: TradeRecord[];
}

export interface EquityPoint {
  timestamp: Date;
  cash: Prisma.Decimal;
  positionValue: Prisma.Decimal;
  equity: Prisma.Decimal;
  drawdown: Prisma.Decimal;
  drawdownPercent: Prisma.Decimal;
}

export interface TradeRecord {
  instrumentId: string;
  side: string;
  quantity: Prisma.Decimal;
  entryPrice: Prisma.Decimal;
  exitPrice: Prisma.Decimal;
  grossPnl: Prisma.Decimal;
  entryFee: Prisma.Decimal;
  exitFee: Prisma.Decimal;
  fees: Prisma.Decimal;
  netPnl: Prisma.Decimal;
  openedAt: Date;
  closedAt: Date;
}

export interface ExecutionAdapter {
  execute(
    compiledStrategy: CompiledStrategy,
    bars: HistoricalBar[],
    context: ExecutionContext
  ): Promise<ExecutionResult>;
}

export interface SignalGenerator {
  generateSignal(
    compiledStrategy: CompiledStrategy,
    currentBar: HistoricalBar,
    historyToNow: HistoricalBar[],
    positionState: PositionState,
    indicatorEngine: IndicatorEngineInterface
  ): Signal;
}

export interface OrderExecutor {
  executeOrder(
    intent: OrderIntent,
    currentBar: HistoricalBar,
    positionState: PositionState,
    cash: Prisma.Decimal,
    commissionRate: Prisma.Decimal
  ): { newPositionState: PositionState; newCash: Prisma.Decimal; trade?: TradeRecord; fee: Prisma.Decimal };
}
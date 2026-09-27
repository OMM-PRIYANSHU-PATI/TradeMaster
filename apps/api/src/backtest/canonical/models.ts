import { Prisma } from 'database';
import { HistoricalBar } from '../interfaces';

export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  HOLD = 'HOLD',
}

export interface Signal {
  type: SignalType;
  quantity?: Prisma.Decimal;
  reason: string;
  strategyVersion: number;
  timestamp: Date;
}

export interface OrderIntent {
  side: 'BUY' | 'SELL';
  quantity: Prisma.Decimal;
  reason: string;
  strategyVersion: number;
  timestamp: Date;
  signalMetadata?: Record<string, unknown>;
}

export enum StrategyState {
  FLAT = 'FLAT',
  LONG = 'LONG',
}

export interface PositionState {
  state: StrategyState;
  quantity: Prisma.Decimal;
  averageEntryPrice: Prisma.Decimal;
}

export interface CompiledIndicatorConfig {
  name: 'SMA' | 'EMA' | 'RSI' | 'MACD' | 'BOLLINGER_BAND' | 'ATR';
  period?: number;
  fastPeriod?: number;
  slowPeriod?: number;
  signalPeriod?: number;
  stdDevMultiplier?: number;
  output?: string;
}

export interface CompiledOperand {
  type: 'CONSTANT' | 'PRICE' | 'INDICATOR';
  value?: number;
  field?: 'open' | 'high' | 'low' | 'close' | 'volume';
  indicator?: CompiledIndicatorConfig;
}

export type ComparisonOperator = 
  | 'GREATER_THAN' 
  | 'GREATER_THAN_OR_EQUAL' 
  | 'LESS_THAN' 
  | 'LESS_THAN_OR_EQUAL' 
  | 'EQUAL' 
  | 'NOT_EQUAL' 
  | 'CROSSES_ABOVE' 
  | 'CROSSES_BELOW';

export type LogicalOperator = 'AND' | 'OR';

export interface CompiledComparisonCondition {
  operator: ComparisonOperator;
  left: CompiledOperand;
  right: CompiledOperand;
}

export interface CompiledLogicalCondition {
  operator: LogicalOperator;
  conditions: CompiledCondition[];
}

export interface CompiledNotCondition {
  operator: 'NOT';
  condition: CompiledCondition;
}

export type CompiledCondition = CompiledComparisonCondition | CompiledLogicalCondition | CompiledNotCondition;

export interface CompiledEntryConfig {
  condition?: CompiledCondition;
}

export interface CompiledExitConfig {
  condition?: CompiledCondition;
}

export interface CompiledPositionSizingConfig {
  type: 'FIXED_QUANTITY';
  value: string;
}

export interface CompiledStrategy {
  version: number;
  instrument: string;
  timeframe: string;
  entry: CompiledEntryConfig;
  exit: CompiledExitConfig;
  positionSizing: CompiledPositionSizingConfig;
  strategyType: string;
  rawConfiguration: unknown;
}

export interface StrategyExecutionContext {
  compiledStrategy: CompiledStrategy;
  currentBar: HistoricalBar;
  historyToNow: HistoricalBar[];
  positionState: PositionState;
  indicatorEngine: IndicatorEngineInterface;
}

export interface IndicatorEngineInterface {
  calculateSMA(bars: HistoricalBar[], period: number): (number | null)[];
  calculateEMA(bars: HistoricalBar[], period: number): (number | null)[];
  calculateRSI(bars: HistoricalBar[], period: number): (number | null)[];
  calculateMACD(bars: HistoricalBar[], fastPeriod: number, slowPeriod: number, signalPeriod: number): (Record<string, number> | null)[];
  calculateBollingerBands(bars: HistoricalBar[], period: number, stdDevMultiplier: number): (Record<string, number> | null)[];
  calculateATR(bars: HistoricalBar[], period: number): (number | null)[];
}

// Re-export HistoricalBar for convenience
export { HistoricalBar };
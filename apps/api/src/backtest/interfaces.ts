import { Prisma } from 'database';

export interface HistoricalBar {
  timestamp: Date;
  open: Prisma.Decimal;
  high: Prisma.Decimal;
  low: Prisma.Decimal;
  close: Prisma.Decimal;
  volume: Prisma.Decimal;
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

export interface ConstantOperand { type: 'CONSTANT'; value: number; }
export interface PriceOperand { type: 'PRICE'; field: 'open' | 'high' | 'low' | 'close' | 'volume'; }
export interface IndicatorOperand { type: 'INDICATOR'; name: string; config: Record<string, number>; output?: string; }

export type NumericOperand = ConstantOperand | PriceOperand | IndicatorOperand;

export interface ComparisonCondition {
  operator: ComparisonOperator;
  left: NumericOperand;
  right: NumericOperand;
}

export interface LogicalCondition {
  operator: LogicalOperator;
  conditions: CustomCondition[];
}

export interface NotCondition {
  operator: 'NOT';
  condition: CustomCondition;
}

export type CustomCondition = ComparisonCondition | LogicalCondition | NotCondition;

export type BuyAndHoldConfig = {
  type: 'BUY_AND_HOLD';
  quantity: string;
};

export type MovingAverageCrossoverConfig = {
  type: 'MOVING_AVERAGE_CROSSOVER';
  fastPeriod: number;
  slowPeriod: number;
  quantity: string;
};

export type RsiThresholdConfig = {
  type: 'RSI_THRESHOLD';
  period: number;
  oversold: number;
  overbought: number;
  quantity: string;
};

export type MacdCrossoverConfig = {
  type: 'MACD_CROSSOVER';
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  quantity: string;
};

export type BollingerBandConfig = {
  type: 'BOLLINGER_BAND';
  period: number;
  stdDevMultiplier: number;
  quantity: string;
};

export type CustomRuleCombinationConfig = {
  type: 'CUSTOM_RULE_COMBINATION';
  buyCondition?: CustomCondition;
  sellCondition?: CustomCondition;
  quantity: string;
};

export type StrategyConfiguration = 
  | BuyAndHoldConfig
  | MovingAverageCrossoverConfig
  | RsiThresholdConfig
  | MacdCrossoverConfig
  | BollingerBandConfig
  | CustomRuleCombinationConfig;

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

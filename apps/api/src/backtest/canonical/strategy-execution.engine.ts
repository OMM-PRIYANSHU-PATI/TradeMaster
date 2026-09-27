import { Injectable } from '@nestjs/common';
import { Prisma } from 'database';
import {
  CompiledStrategy,
  CompiledCondition,
  CompiledOperand,
  Signal,
  OrderIntent,
  PositionState,
  StrategyState,
  IndicatorEngineInterface,
  ComparisonOperator,
  HistoricalBar,
} from './models';

@Injectable()
export class StrategyExecutionEngine {
  evaluate(context: {
    compiledStrategy: CompiledStrategy;
    currentBar: HistoricalBar;
    historyToNow: HistoricalBar[];
    positionState: PositionState;
    indicatorEngine: IndicatorEngineInterface;
  }): Signal {
    const { compiledStrategy, currentBar, historyToNow, positionState, indicatorEngine } = context;

    if (historyToNow.length === 0) {
      return this.createSignal('HOLD', undefined, 'No historical data available', compiledStrategy);
    }

    // Get current position state
    const isFlat = positionState.state === StrategyState.FLAT;
    const isLong = positionState.state === StrategyState.LONG;
    const currentQuantity = positionState.quantity;

    // Evaluate entry condition if flat
    if (isFlat && compiledStrategy.entry.condition) {
      const shouldEnter = this.evaluateCondition(
        compiledStrategy.entry.condition,
        indicatorEngine,
        historyToNow,
        currentBar
      );
      if (shouldEnter === true) {
        const quantity = new Prisma.Decimal(compiledStrategy.positionSizing.value);
        return this.createSignal(
          'BUY',
          quantity,
          this.getConditionReason(compiledStrategy.entry.condition, 'entry'),
          compiledStrategy,
          currentBar.timestamp
        );
      }
      if (shouldEnter === null) {
        return this.createSignal('HOLD', undefined, 'Entry condition evaluation returned null (insufficient data)', compiledStrategy, currentBar.timestamp);
      }
    }

    // Evaluate exit condition if long
    if (isLong && compiledStrategy.exit.condition) {
      const shouldExit = this.evaluateCondition(
        compiledStrategy.exit.condition,
        indicatorEngine,
        historyToNow,
        currentBar
      );
      if (shouldExit === true) {
        return this.createSignal(
          'SELL',
          currentQuantity,
          this.getConditionReason(compiledStrategy.exit.condition, 'exit'),
          compiledStrategy,
          currentBar.timestamp
        );
      }
      if (shouldExit === null) {
        return this.createSignal('HOLD', undefined, 'Exit condition evaluation returned null (insufficient data)', compiledStrategy, currentBar.timestamp);
      }
    }

    // BUY_AND_HOLD special case: buy once if flat
    if (compiledStrategy.strategyType === 'BUY_AND_HOLD' && isFlat) {
      const quantity = new Prisma.Decimal(compiledStrategy.positionSizing.value);
      return this.createSignal('BUY', quantity, 'Buy and hold strategy - initial entry', compiledStrategy, currentBar.timestamp);
    }

    return this.createSignal('HOLD', undefined, 'No signal conditions met', compiledStrategy, currentBar.timestamp);
  }

  signalToOrderIntent(signal: Signal): OrderIntent | null {
    if (signal.type === 'HOLD') return null;

    return {
      side: signal.type,
      quantity: signal.quantity!,
      reason: signal.reason,
      strategyVersion: signal.strategyVersion,
      timestamp: signal.timestamp,
      signalMetadata: { 
        // Add any additional metadata if needed
      },
    };
  }

  getNextState(currentState: StrategyState, signalType: 'BUY' | 'SELL' | 'HOLD'): StrategyState {
    if (signalType === 'HOLD') return currentState;

    if (currentState === StrategyState.FLAT) {
      if (signalType === 'BUY') return StrategyState.LONG;
      if (signalType === 'SELL') return StrategyState.FLAT; // Reject: cannot sell when flat
    }

    if (currentState === StrategyState.LONG) {
      if (signalType === 'SELL') return StrategyState.FLAT;
      if (signalType === 'BUY') return StrategyState.LONG; // Reject: cannot buy when already long (no pyramiding)
    }

    return currentState;
  }

  validateTransition(currentState: StrategyState, signalType: 'BUY' | 'SELL' | 'HOLD'): boolean {
    if (signalType === 'HOLD') return true;

    if (currentState === StrategyState.FLAT && signalType === 'SELL') return false;
    if (currentState === StrategyState.LONG && signalType === 'BUY') return false;

    return true;
  }

  private evaluateCondition(
    condition: CompiledCondition,
    indicatorEngine: IndicatorEngineInterface,
    historyToNow: HistoricalBar[],
    currentBar: HistoricalBar
  ): boolean | null {
    // Type guards for discriminated union
    if (condition.operator === 'AND' || condition.operator === 'OR') {
      return this.evaluateLogicalCondition(condition, indicatorEngine, historyToNow, currentBar);
    }

    if (condition.operator === 'NOT') {
      const result = this.evaluateCondition(condition.condition, indicatorEngine, historyToNow, currentBar);
      if (result === null) return null;
      return !result;
    }

    return this.evaluateComparisonCondition(condition as CompiledComparisonCondition, indicatorEngine, historyToNow, currentBar);
  }

  private evaluateLogicalCondition(
    condition: CompiledLogicalCondition,
    indicatorEngine: IndicatorEngineInterface,
    historyToNow: HistoricalBar[],
    currentBar: HistoricalBar
  ): boolean | null {
    const conditions = condition.conditions;
    let hasNull = false;

    for (const c of conditions) {
      const result = this.evaluateCondition(c, indicatorEngine, historyToNow, currentBar);
      if (result === false && condition.operator === 'AND') return false;
      if (result === true && condition.operator === 'OR') return true;
      if (result === null) hasNull = true;
    }

    if (hasNull) return null;
    return condition.operator === 'AND';
  }

  private evaluateComparisonCondition(
    condition: CompiledComparisonCondition,
    indicatorEngine: IndicatorEngineInterface,
    historyToNow: HistoricalBar[],
    currentBar: HistoricalBar
  ): boolean | null {
    const leftValue = this.evaluateOperand(condition.left, indicatorEngine, historyToNow, currentBar);
    const rightValue = this.evaluateOperand(condition.right, indicatorEngine, historyToNow, currentBar);

    if (leftValue === null || rightValue === null) return null;

    switch (condition.operator) {
      case 'GREATER_THAN':
        return leftValue > rightValue;
      case 'GREATER_THAN_OR_EQUAL':
        return leftValue >= rightValue;
      case 'LESS_THAN':
        return leftValue < rightValue;
      case 'LESS_THAN_OR_EQUAL':
        return leftValue <= rightValue;
      case 'EQUAL':
        return leftValue === rightValue;
      case 'NOT_EQUAL':
        return leftValue !== rightValue;
      case 'CROSSES_ABOVE':
        // For CROSSES_ABOVE, we need previous values
        const prevLeft = this.evaluateOperand(condition.left, indicatorEngine, historyToNow, currentBar, 1);
        const prevRight = this.evaluateOperand(condition.right, indicatorEngine, historyToNow, currentBar, 1);
        if (prevLeft === null || prevRight === null) return null;
        return prevLeft <= prevRight && leftValue > rightValue;
      case 'CROSSES_BELOW':
        const prevLeftBelow = this.evaluateOperand(condition.left, indicatorEngine, historyToNow, currentBar, 1);
        const prevRightBelow = this.evaluateOperand(condition.right, indicatorEngine, historyToNow, currentBar, 1);
        if (prevLeftBelow === null || prevRightBelow === null) return null;
        return prevLeftBelow >= prevRightBelow && leftValue < rightValue;
    }

    return null;
  }

  private evaluateOperand(
    operand: CompiledOperand,
    indicatorEngine: IndicatorEngineInterface,
    historyToNow: HistoricalBar[],
    currentBar: HistoricalBar,
    offset = 0
  ): number | null {
    const index = historyToNow.length - 1 - offset;
    if (index < 0) return null;

    if (operand.type === 'CONSTANT') {
      return operand.value ?? null;
    }

    if (operand.type === 'PRICE') {
      const bar = historyToNow[index];
      const field = operand.field;
      return (bar[field] as Prisma.Decimal).toNumber();
    }

    if (operand.type === 'INDICATOR' && operand.indicator) {
      const indicator = operand.indicator;
      switch (indicator.name) {
        case 'SMA':
          if (!indicator.period) return null;
          const sma = indicatorEngine.calculateSMA(historyToNow, indicator.period);
          return sma[index] ?? null;
        case 'EMA':
          if (!indicator.period) return null;
          const ema = indicatorEngine.calculateEMA(historyToNow, indicator.period);
          return ema[index] ?? null;
        case 'RSI':
          if (!indicator.period) return null;
          const rsi = indicatorEngine.calculateRSI(historyToNow, indicator.period);
          return rsi[index] ?? null;
        case 'MACD':
          if (!indicator.fastPeriod || !indicator.slowPeriod || !indicator.signalPeriod) return null;
          const macd = indicatorEngine.calculateMACD(
            historyToNow,
            indicator.fastPeriod,
            indicator.slowPeriod,
            indicator.signalPeriod
          );
          if (!macd[index]) return null;
          return macd[index][indicator.output ?? 'macd'] ?? null;
        case 'BOLLINGER_BAND':
          if (!indicator.period || !indicator.stdDevMultiplier) return null;
          const bb = indicatorEngine.calculateBollingerBands(historyToNow, indicator.period, indicator.stdDevMultiplier);
          if (!bb[index]) return null;
          return bb[index][indicator.output ?? 'middle'] ?? null;
        case 'ATR':
          if (!indicator.period) return null;
          const atr = indicatorEngine.calculateATR(historyToNow, indicator.period);
          return atr[index] ?? null;
      }
    }

    return null;
  }

  private createSignal(
    type: 'BUY' | 'SELL' | 'HOLD',
    quantity: Prisma.Decimal | undefined,
    reason: string,
    compiledStrategy: CompiledStrategy,
    timestamp?: Date
  ): Signal {
    return {
      type: type as SignalType,
      quantity,
      reason,
      strategyVersion: compiledStrategy.version,
      timestamp: timestamp ?? new Date(),
    };
  }

  private getConditionReason(condition: CompiledCondition | undefined, context: 'entry' | 'exit'): string {
    if (!condition) return `${context} condition not configured`;
    return this.conditionToString(condition);
  }

  private conditionToString(condition: CompiledCondition): string {
    if (condition.operator === 'AND' || condition.operator === 'OR') {
      const parts = condition.conditions.map(c => this.conditionToString(c));
      return `(${parts.join(` ${condition.operator} `)})`;
    }
    if (condition.operator === 'NOT') {
      return `NOT ${this.conditionToString(condition.condition)}`;
    }
    // It's a comparison condition
    if ('left' in condition) {
      return `${this.operandToString(condition.left)} ${condition.operator} ${this.operandToString(condition.right)}`;
    }
    return '';
  }

  private operandToString(operand: CompiledOperand): string {
    if (operand.type === 'CONSTANT') return String(operand.value);
    if (operand.type === 'PRICE') return operand.field;
    if (operand.type === 'INDICATOR' && operand.indicator) {
      const ind = operand.indicator;
      if (ind.name === 'SMA' || ind.name === 'EMA' || ind.name === 'RSI' || ind.name === 'ATR') {
        return `${ind.name}(${ind.period})${ind.output ? `.${ind.output}` : ''}`;
      }
      if (ind.name === 'MACD') {
        return `MACD(${ind.fastPeriod},${ind.slowPeriod},${ind.signalPeriod}).${ind.output ?? 'macd'}`;
      }
      if (ind.name === 'BOLLINGER_BAND') {
        return `BB(${ind.period},${ind.stdDevMultiplier}).${ind.output ?? 'middle'}`;
      }
      return ind.name;
    }
    return 'UNKNOWN';
  }
}

// Need to import the types used above
import { CompiledLogicalCondition, CompiledComparisonCondition, SignalType } from './models';
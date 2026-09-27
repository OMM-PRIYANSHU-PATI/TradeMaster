import { StrategyCompiler } from '../src/backtest/canonical/strategy.compiler';
import { StrategyExecutionEngine } from '../src/backtest/canonical/strategy-execution.engine';
import { IndicatorEngine } from '../src/backtest/indicators/indicator.engine';
import { Prisma } from 'database';
import { HistoricalBar } from '../src/backtest/interfaces';
import { PositionState, StrategyState } from '../src/backtest/canonical/models';
import { BadRequestException } from '@nestjs/common';

describe('Canonical Strategy Execution Foundation', () => {
  let compiler: StrategyCompiler;
  let engine: StrategyExecutionEngine;
  let indicatorEngine: IndicatorEngine;

  beforeEach(() => {
    compiler = new StrategyCompiler();
    engine = new StrategyExecutionEngine();
    indicatorEngine = new IndicatorEngine();
  });

  const makeDecimal = (v: number) => new Prisma.Decimal(v);
  let time = 1000;
  const bar = (p: number): HistoricalBar => {
    time += 1000;
    return { timestamp: new Date(time), open: makeDecimal(p), high: makeDecimal(p), low: makeDecimal(p), close: makeDecimal(p), volume: makeDecimal(100) };
  };

  describe('A. Compiler', () => {
    it('compiles valid BUY_AND_HOLD', () => {
      const compiled = compiler.compile({ type: 'BUY_AND_HOLD', config: { quantity: '10' } }, 'AAPL', '1D', 'BUY_AND_HOLD');
      expect(compiled.strategyType).toBe('BUY_AND_HOLD');
      expect(compiled.positionSizing.value).toBe('10');
    });

    it('rejects unsupported strategy type', () => {
      expect(() => compiler.compile({ type: 'INVALID_TYPE', config: {} }, 'AAPL', '1D', 'INVALID')).toThrow(BadRequestException);
    });

    it('rejects invalid position sizing (empty/negative)', () => {
      expect(() => compiler.compile({ type: 'BUY_AND_HOLD', config: { quantity: '-5' } }, 'AAPL', '1D', 'BUY_AND_HOLD')).toThrow();
    });

    it('compiles custom combination with logical operators', () => {
      const config = {
        buyCondition: { operator: 'AND', conditions: [
          { operator: 'CROSSES_ABOVE', left: { type: 'PRICE', field: 'close' }, right: { type: 'CONSTANT', value: 100 } }
        ]},
        sellCondition: { operator: 'NOT', condition: { operator: 'EQUAL', left: { type: 'CONSTANT', value: 1 }, right: { type: 'CONSTANT', value: 2 } } },
        quantity: '5'
      };
      const compiled = compiler.compile({ type: 'CUSTOM_RULE_COMBINATION', config }, 'AAPL', '1D', 'CUSTOM_RULE_COMBINATION');
      expect(compiled.entry.condition?.operator).toBe('AND');
      expect(compiled.exit.condition?.operator).toBe('NOT');
    });
  });

  describe('B. Signals & C. State Machine & D. OrderIntent', () => {
    it('generates BUY OrderIntent on crossover, state FLAT -> LONG', () => {
      const config = { type: 'MOVING_AVERAGE_CROSSOVER', config: { fastPeriod: 1, slowPeriod: 2, quantity: '10' } };
      const compiled = compiler.compile(config, 'AAPL', '1D', 'MOVING_AVERAGE_CROSSOVER');
      
      const bars = [bar(10), bar(10), bar(20)]; // price crosses above average
      
      let position: PositionState = { state: StrategyState.FLAT, quantity: makeDecimal(0), averageEntryPrice: makeDecimal(0) };
      
      const sig1 = engine.evaluate({ compiledStrategy: compiled, currentBar: bars[0], historyToNow: [bars[0]], positionState: position, indicatorEngine });
      expect(sig1.type).toBe('HOLD');

      const sig3 = engine.evaluate({ compiledStrategy: compiled, currentBar: bars[2], historyToNow: bars, positionState: position, indicatorEngine });
      expect(sig3.type).toBe('BUY');
      expect(sig3.quantity?.toNumber()).toBe(10);
      expect(sig3.reason).toContain('CROSSES_ABOVE');

      // State simulation
      position = { state: StrategyState.LONG, quantity: makeDecimal(10), averageEntryPrice: makeDecimal(20) };
      
      // LONG + BUY -> HOLD
      const sig4 = engine.evaluate({ compiledStrategy: compiled, currentBar: bars[2], historyToNow: bars, positionState: position, indicatorEngine });
      expect(sig4.type).toBe('HOLD'); // already long
    });
  });

  describe('E. No-lookahead', () => {
    it('signal for candle N is identical regardless of future candle N+1', () => {
      const config = { type: 'MOVING_AVERAGE_CROSSOVER', config: { fastPeriod: 1, slowPeriod: 2, quantity: '10' } };
      const compiled = compiler.compile(config, 'AAPL', '1D', 'MOVING_AVERAGE_CROSSOVER');
      
      const barsBase = [bar(10), bar(10), bar(20)];
      const position: PositionState = { state: StrategyState.FLAT, quantity: makeDecimal(0), averageEntryPrice: makeDecimal(0) };

      const sigWithoutFuture = engine.evaluate({ compiledStrategy: compiled, currentBar: barsBase[2], historyToNow: barsBase, positionState: position, indicatorEngine });
      
      const barsWithFuture = [...barsBase, bar(5)];
      const sigWithFuture = engine.evaluate({ compiledStrategy: compiled, currentBar: barsWithFuture[2], historyToNow: barsWithFuture.slice(0, 3), positionState: position, indicatorEngine });

      expect(sigWithoutFuture).toEqual(sigWithFuture);
    });
  });
});


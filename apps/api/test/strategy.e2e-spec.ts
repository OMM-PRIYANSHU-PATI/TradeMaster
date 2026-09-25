import { StrategyEngine } from '../src/backtest/strategy.engine';
import { IndicatorEngine } from '../src/backtest/indicators/indicator.engine';
import { StrategyConfiguration, CustomRuleCombinationConfig } from '../src/backtest/interfaces';
import { Prisma } from 'database';

describe('StrategyEngine (Unit)', () => {
  let engine: StrategyEngine;
  let ie: IndicatorEngine;

  beforeEach(() => {
    engine = new StrategyEngine();
    ie = new IndicatorEngine();
  });

  const makeDecimal = (v: number) => new Prisma.Decimal(v);

  let timeCounter = 1000;
  const makeBar = (p: number) => {
    timeCounter++;
    return { timestamp: new Date(timeCounter), open: makeDecimal(p), high: makeDecimal(p), low: makeDecimal(p), close: makeDecimal(p), volume: makeDecimal(1000) };
  };

  it('MOVING_AVERAGE_CROSSOVER behaves correctly', () => {
    const cfg: StrategyConfiguration = { type: 'MOVING_AVERAGE_CROSSOVER', fastPeriod: 1, slowPeriod: 2, quantity: '10' };
    expect(engine.generateSignal(cfg, [10, 10, 10].map(makeBar), makeDecimal(0), ie).type).toBe('HOLD');
    expect(engine.generateSignal(cfg, [10, 10, 20].map(makeBar), makeDecimal(0), ie).type).toBe('BUY');
    expect(engine.generateSignal(cfg, [20, 20, 10].map(makeBar), makeDecimal(10), ie).type).toBe('SELL');
  });

  it('RSI_THRESHOLD behaves correctly', () => {
    const cfg: StrategyConfiguration = { type: 'RSI_THRESHOLD', period: 2, oversold: 30, overbought: 70, quantity: '10' };
    
    jest.spyOn(ie, 'calculateRSI').mockReturnValue([50, 50, 31, 29]); 
    expect(engine.generateSignal(cfg, [0,0,0,0].map(makeBar), makeDecimal(0), ie).type).toBe('BUY');
    
    jest.spyOn(ie, 'calculateRSI').mockReturnValue([50, 50, 69, 71]); 
    expect(engine.generateSignal(cfg, [0,0,0,0].map(makeBar), makeDecimal(10), ie).type).toBe('SELL');
    
    jest.spyOn(ie, 'calculateRSI').mockReturnValue([50, 50, 50, 50]); 
    expect(engine.generateSignal(cfg, [0,0,0,0].map(makeBar), makeDecimal(0), ie).type).toBe('HOLD');
  });

  it('MACD_CROSSOVER behaves correctly', () => {
    const cfg: StrategyConfiguration = { type: 'MACD_CROSSOVER', fastPeriod: 2, slowPeriod: 4, signalPeriod: 3, quantity: '10' };
    
    jest.spyOn(ie, 'calculateMACD').mockReturnValue([
      null, null, null,
      { macd: -1, signal: 0, histogram: -1 },
      { macd: 1, signal: 0, histogram: 1 }
    ]);
    expect(engine.generateSignal(cfg, [0,0,0,0,0].map(makeBar), makeDecimal(0), ie).type).toBe('BUY');
    
    jest.spyOn(ie, 'calculateMACD').mockReturnValue([
      null, null, null,
      { macd: 1, signal: 0, histogram: 1 },
      { macd: -1, signal: 0, histogram: -1 }
    ]);
    expect(engine.generateSignal(cfg, [0,0,0,0,0].map(makeBar), makeDecimal(10), ie).type).toBe('SELL');
    
    jest.spyOn(ie, 'calculateMACD').mockReturnValue([
      null, null, null,
      { macd: -1, signal: 0, histogram: -1 },
      { macd: -1, signal: 0, histogram: -1 } 
    ]);
    expect(engine.generateSignal(cfg, [0,0,0,0,0].map(makeBar), makeDecimal(0), ie).type).toBe('HOLD');
  });

  it('BOLLINGER_BAND behaves correctly', () => {
    const cfg: StrategyConfiguration = { type: 'BOLLINGER_BAND', period: 2, stdDevMultiplier: 2, quantity: '10' };
    
    jest.spyOn(ie, 'calculateBollingerBands').mockReturnValue([
      null, null,
      { middle: 100, upper: 110, lower: 90 }, 
      { middle: 90, upper: 100, lower: 85 }   
    ]);
    const barsBuy = [makeBar(100), makeBar(100), makeBar(100), makeBar(80)];
    expect(engine.generateSignal(cfg, barsBuy, makeDecimal(0), ie).type).toBe('BUY');
    
    jest.spyOn(ie, 'calculateBollingerBands').mockReturnValue([
      null, null,
      { middle: 100, upper: 110, lower: 90 },
      { middle: 110, upper: 115, lower: 105 }
    ]);
    const barsSell = [makeBar(100), makeBar(100), makeBar(100), makeBar(120)];
    expect(engine.generateSignal(cfg, barsSell, makeDecimal(10), ie).type).toBe('SELL');
    
    jest.spyOn(ie, 'calculateBollingerBands').mockReturnValue([
      null, null,
      { middle: 100, upper: 110, lower: 90 },
      { middle: 110, upper: 115, lower: 105 }
    ]);
    const barsHold = [makeBar(100), makeBar(100), makeBar(100), makeBar(110)];
    expect(engine.generateSignal(cfg, barsHold, makeDecimal(10), ie).type).toBe('HOLD');
  });

  it('CUSTOM_RULE_COMBINATION logic correctly applies three-valued logic (AND, OR, NOT, null propagation)', () => {
    const trueCond = { operator: 'EQUAL', left: { type: 'CONSTANT', value: 1 }, right: { type: 'CONSTANT', value: 1 } };
    const falseCond = { operator: 'EQUAL', left: { type: 'CONSTANT', value: 1 }, right: { type: 'CONSTANT', value: 0 } };
    // SMA(100) will definitely return null on an empty or short array
    const nullCond = { operator: 'INDICATOR', name: 'SMA', config: { period: 100 }, output: 'result' };
    
    const evaluate = (buyCondition: unknown) => {
      const cfg = { type: 'CUSTOM_RULE_COMBINATION', quantity: '10', buyCondition } as CustomRuleCombinationConfig;
      return engine.generateSignal(cfg, [makeBar(10)], makeDecimal(0), ie).type === 'BUY';
    };

    // Base truth values
    expect(evaluate(trueCond)).toBe(true);
    expect(evaluate(falseCond)).toBe(false);
    expect(evaluate({ operator: 'EQUAL', left: trueCond.left, right: nullCond })).toBe(false); // evaluates to null -> HOLD -> false BUY

    // Explicitly test AND
    // true AND null = null (HOLD)
    expect(evaluate({ operator: 'AND', conditions: [trueCond, { operator: 'EQUAL', left: trueCond.left, right: nullCond }] })).toBe(false);
    // false AND null = false (HOLD)
    expect(evaluate({ operator: 'AND', conditions: [falseCond, { operator: 'EQUAL', left: trueCond.left, right: nullCond }] })).toBe(false);
    // null AND null = null (HOLD)
    expect(evaluate({ operator: 'AND', conditions: [{ operator: 'EQUAL', left: trueCond.left, right: nullCond }, { operator: 'EQUAL', left: trueCond.left, right: nullCond }] })).toBe(false);
    
    // Explicitly test OR
    // true OR null = true (BUY)
    expect(evaluate({ operator: 'OR', conditions: [trueCond, { operator: 'EQUAL', left: trueCond.left, right: nullCond }] })).toBe(true);
    // false OR null = null (HOLD)
    expect(evaluate({ operator: 'OR', conditions: [falseCond, { operator: 'EQUAL', left: trueCond.left, right: nullCond }] })).toBe(false);
    // null OR null = null (HOLD)
    expect(evaluate({ operator: 'OR', conditions: [{ operator: 'EQUAL', left: trueCond.left, right: nullCond }, { operator: 'EQUAL', left: trueCond.left, right: nullCond }] })).toBe(false);
    
    // Explicitly test NOT
    // NOT true = false
    expect(evaluate({ operator: 'NOT', condition: trueCond })).toBe(false);
    // NOT false = true
    expect(evaluate({ operator: 'NOT', condition: falseCond })).toBe(true);
    // NOT null = null
    expect(evaluate({ operator: 'NOT', condition: { operator: 'EQUAL', left: trueCond.left, right: nullCond } })).toBe(false);
  });
});

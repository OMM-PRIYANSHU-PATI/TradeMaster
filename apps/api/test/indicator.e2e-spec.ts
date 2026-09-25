import { Prisma } from 'database';
import { IndicatorEngine } from '../src/backtest/indicators/indicator.engine';
import { HistoricalBar } from '../src/backtest/interfaces';

describe('IndicatorEngine', () => {
  let engine: IndicatorEngine;

  beforeEach(() => {
    engine = new IndicatorEngine();
  });

  const makeBar = (close: number): HistoricalBar => ({
    timestamp: new Date(),
    open: new Prisma.Decimal(close),
    high: new Prisma.Decimal(close + 1),
    low: new Prisma.Decimal(close - 1),
    close: new Prisma.Decimal(close),
    volume: new Prisma.Decimal(100)
  });

  it('calculates SMA deterministically', () => {
    const bars: HistoricalBar[] = [10, 20, 30, 40].map(makeBar);
    const result = engine.calculateSMA(bars, 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBe(15);
    expect(result[2]).toBe(25);
    expect(result[3]).toBe(35);
  });

  it('calculates EMA deterministically', () => {
    const bars: HistoricalBar[] = [10, 20, 30].map(makeBar);
    const result = engine.calculateEMA(bars, 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeCloseTo(15);
    expect(result[2]).toBeCloseTo(25);
  });

  it('calculates ATR deterministically', () => {
    const bars: HistoricalBar[] = [10, 20, 30].map(makeBar);
    const result = engine.calculateATR(bars, 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeDefined();
  });

  it('calculates Bollinger Bands deterministically', () => {
    const bars: HistoricalBar[] = [10, 20, 30].map(makeBar);
    const result = engine.calculateBollingerBands(bars, 2, 2);
    expect(result[0]).toBeNull();
    expect(result[1]).toBeDefined();
    expect(result[1]!.middle).toBe(15);
  });

  it('calculates RSI crossing exact known values', () => {
    const bars = [10, 11, 12, 11, 10].map(p => makeBar(p));
    const rsi = engine.calculateRSI(bars, 2);
    expect(rsi[0]).toBeNull();
    expect(rsi[1]).toBeNull();
    expect(rsi[2]).toBeCloseTo(100, 2);
    expect(rsi[3]).toBeCloseTo(50, 2);
    expect(rsi[4]).toBeCloseTo(25, 2);
  });

  it('calculates MACD exact known values', () => {
    const bars = [10, 11, 12, 11, 10, 9, 8, 9, 10, 11].map(p => makeBar(p));
    const macd = engine.calculateMACD(bars, 2, 4, 3);
    
    // N=5
    expect(macd[5]?.macd).toBeCloseTo(-0.497037, 4);
    expect(macd[5]?.signal).toBeCloseTo(-0.180494, 4);
    expect(macd[5]?.histogram).toBeCloseTo(-0.316543, 4);
    
    // N=9
    expect(macd[9]?.macd).toBeCloseTo(0.458564, 4);
    expect(macd[9]?.signal).toBeCloseTo(0.177027, 4);
    expect(macd[9]?.histogram).toBeCloseTo(0.281537, 4);
  });

  it('isolates cache for different datasets correctly without clearCache', () => {
    const barsA = [10, 20, 30].map(p => makeBar(p));
    const barsB = [100, 200, 300].map(p => makeBar(p));
    
    const smaA1 = engine.calculateSMA(barsA, 2);
    expect(smaA1[1]).toBeCloseTo(15);
    
    // calculate B WITHOUT clearCache
    const smaB = engine.calculateSMA(barsB, 2);
    expect(smaB[1]).toBeCloseTo(150);
    
    // calculate A again WITHOUT clearCache
    const smaA2 = engine.calculateSMA(barsA, 2);
    expect(smaA2[1]).toBeCloseTo(15);
  });

  it('prevents cache collisions for datasets with same start/mid/end but different internal bars', () => {
    // Both datasets have identical start (10), mid (20), end (30)
    const barsA = [10, 15, 20, 25, 30].map(p => makeBar(p));
    const barsB = [10, 100, 20, 100, 30].map(p => makeBar(p));
    
    // Engine must not return same SMA for these
    const smaA = engine.calculateSMA(barsA, 3);
    const smaB = engine.calculateSMA(barsB, 3);
    
    // SMA for barsA at index 4 (last bar): (20 + 25 + 30) / 3 = 25
    expect(smaA[4]).toBeCloseTo(25);
    // SMA for barsB at index 4: (20 + 100 + 30) / 3 = 50
    expect(smaB[4]).toBeCloseTo(50);
  });

  it('handles invalid indicator parameters gracefully through strict validation', () => {
    const bars = [10, 20, 30].map(p => makeBar(p));
    expect(() => engine.calculateSMA(bars, 0)).toThrow();
    expect(() => engine.calculateSMA(bars, -1)).toThrow();
    expect(() => engine.calculateSMA(bars, NaN)).toThrow();
    expect(() => engine.calculateSMA(bars, Infinity)).toThrow();
    expect(() => engine.calculateSMA(bars, 1.5)).toThrow();
    expect(() => engine.calculateMACD(bars, 10, 5, 3)).toThrow();
    expect(() => engine.calculateBollingerBands(bars, 2, 0)).toThrow();
  });
});

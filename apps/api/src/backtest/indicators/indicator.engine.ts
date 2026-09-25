import { HistoricalBar } from '../interfaces';
import * as crypto from 'crypto';

export interface IndicatorConfig {
  type: string;
  [key: string]: unknown;
}

export interface IndicatorResult {
  value: number;
  [key: string]: number | undefined;
}

export class IndicatorEngine {
  private cache = new Map<string, { result: (number | null)[], state?: Record<string, number | null> }>();
  private complexCache = new Map<string, { result: (Record<string, number> | null)[], state?: Record<string, number | null> }>();


  private validatePeriod(period: unknown, name: string): void {
    if (typeof period !== 'number' || !Number.isFinite(period) || !Number.isInteger(period) || period < 1) {
      throw new Error(`Invalid parameter: ${name} must be a finite integer >= 1`);
    }
  }

  private validateMultiplier(multiplier: unknown, name: string): void {
    if (typeof multiplier !== 'number' || !Number.isFinite(multiplier) || multiplier <= 0) {
      throw new Error(`Invalid parameter: ${name} must be a finite number > 0`);
    }
  }

  clearCache() {
    this.cache.clear();
    this.complexCache.clear();
  }

  private getCacheKey(config: unknown, bars: HistoricalBar[]): string {
    const base = JSON.stringify(config);
    if (bars.length === 0) return base;
    
    const hash = crypto.createHash('sha256');
    for (const b of bars) {
      hash.update(`${new Date(b.timestamp).getTime()}-${b.open.toString()}-${b.high.toString()}-${b.low.toString()}-${b.close.toString()}-${b.volume.toString()}|`);
    }
    
    return `${base}_${hash.digest('hex')}`;
  }

  calculateSMA(bars: HistoricalBar[], period: number): (number | null)[] {
    this.validatePeriod(period, "period");
    const key = this.getCacheKey({ type: 'SMA', period }, bars);
    let cached = this.cache.get(key);
    
    if (!cached) {
      cached = { result: [], state: { sum: 0 } };
      this.cache.set(key, cached);
    }

    const { result, state } = cached;
    
    // Only calculate for new bars
    for (let i = result.length; i < bars.length; i++) {
      const price = bars[i].close.toNumber();
      state.sum = (state.sum || 0) + price;

      if (i >= period) {
        state.sum = (state.sum || 0) - bars[i - period].close.toNumber();
      }

      if (i >= period - 1) {
        result.push((state.sum as number) / period);
      } else {
        result.push(null);
      }
    }

    return result; // It's fine to return the reference, it's scoped to this backtest
  }

  calculateEMA(bars: HistoricalBar[], period: number): (number | null)[] {
    this.validatePeriod(period, "period");
    const key = this.getCacheKey({ type: 'EMA', period }, bars);
    let cached = this.cache.get(key);
    
    if (!cached) {
      cached = { result: [], state: { ema: null as number | null, smaSum: 0 } };
      this.cache.set(key, cached);
    }

    const { result, state } = cached;
    const multiplier = 2 / (period + 1);

    for (let i = result.length; i < bars.length; i++) {
      const price = bars[i].close.toNumber();
      
      if (state.ema === null || state.ema === undefined) {
        state.smaSum = (state.smaSum || 0) + price;
        if (i === period - 1) {
          state.ema = (state.smaSum as number) / period;
          result.push(state.ema as number);
        } else {
          result.push(null);
        }
      } else {
        state.ema = (price * multiplier) + ((state.ema as number) * (1 - multiplier));
        result.push(state.ema as number);
      }
    }

    return result;
  }

  calculateRSI(bars: HistoricalBar[], period: number): (number | null)[] {
    this.validatePeriod(period, "period");
    const key = this.getCacheKey({ type: 'RSI', period }, bars);
    let cached = this.cache.get(key);
    
    if (!cached) {
      cached = { result: [], state: { avgGain: 0, avgLoss: 0 } };
      this.cache.set(key, cached);
    }

    const { result, state } = cached;

    for (let i = result.length; i < bars.length; i++) {
      if (i === 0) {
        result.push(null);
        continue;
      }

      const diff = bars[i].close.toNumber() - bars[i - 1].close.toNumber();
      const gain = Math.max(0, diff);
      const loss = Math.max(0, -diff);

      if (i < period) {
        state.avgGain = (state.avgGain || 0) + gain;
        state.avgLoss = (state.avgLoss || 0) + loss;
        result.push(null);
      } else if (i === period) {
        state.avgGain = ((state.avgGain || 0) + gain) / period;
        state.avgLoss = ((state.avgLoss || 0) + loss) / period;
        const rs = state.avgLoss === 0 ? 100 : (state.avgGain as number) / (state.avgLoss as number);
        const rsi = state.avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
        result.push(rsi);
      } else {
        state.avgGain = ((state.avgGain as number) * (period - 1) + gain) / period;
        state.avgLoss = ((state.avgLoss as number) * (period - 1) + loss) / period;
        const rs = state.avgLoss === 0 ? 100 : (state.avgGain as number) / (state.avgLoss as number);
        const rsi = state.avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));
        result.push(rsi);
      }
    }

    return result;
  }

  calculateMACD(bars: HistoricalBar[], fastPeriod: number, slowPeriod: number, signalPeriod: number): (Record<string, number> | null)[] {
    this.validatePeriod(fastPeriod, "fastPeriod");
    this.validatePeriod(slowPeriod, "slowPeriod");
    this.validatePeriod(signalPeriod, "signalPeriod");
    if (slowPeriod <= fastPeriod) {
      throw new Error("Invalid parameter: slowPeriod must be > fastPeriod");
    }

    const key = this.getCacheKey({ type: 'MACD', fastPeriod, slowPeriod, signalPeriod }, bars);
    let cached = this.complexCache.get(key);
    
    if (!cached) {
      cached = { result: [], state: { signalEMA: null as number | null, smaSum: 0, count: 0 } };
      this.complexCache.set(key, cached);
    }

    const { result, state } = cached;
    
    // We delegate to EMA, which also uses incremental caching internally!
    const fastEMA = this.calculateEMA(bars, fastPeriod);
    const slowEMA = this.calculateEMA(bars, slowPeriod);
    const multiplier = 2 / (signalPeriod + 1);

    for (let i = result.length; i < bars.length; i++) {
      const fEma = fastEMA[i];
      const sEma = slowEMA[i];

      if (fEma === null || sEma === null) {
        result.push(null);
        continue;
      }

      const macdLine = fEma - sEma;

      if (state.signalEMA === null || state.signalEMA === undefined) {
        state.smaSum = (state.smaSum || 0) + macdLine;
        state.count = (state.count || 0) + 1;
        if ((state.count as number) === signalPeriod) {
          state.signalEMA = (state.smaSum as number) / signalPeriod;
          result.push({ macd: macdLine, signal: state.signalEMA as number, histogram: macdLine - (state.signalEMA as number) });
        } else {
          result.push(null);
        }
      } else {
        state.signalEMA = (macdLine * multiplier) + ((state.signalEMA as number) * (1 - multiplier));
        result.push({ macd: macdLine, signal: state.signalEMA as number, histogram: macdLine - (state.signalEMA as number) });
      }
    }

    return result;
  }

  calculateBollingerBands(bars: HistoricalBar[], period: number, stdDevMultiplier: number): (Record<string, number> | null)[] {
    this.validatePeriod(period, "period");
    this.validateMultiplier(stdDevMultiplier, "stdDevMultiplier");

    const key = this.getCacheKey({ type: 'BB', period, stdDevMultiplier }, bars);
    let cached = this.complexCache.get(key);
    
    if (!cached) {
      cached = { result: [] };
      this.complexCache.set(key, cached);
    }

    const { result } = cached;
    const sma = this.calculateSMA(bars, period);

    for (let i = result.length; i < bars.length; i++) {
      if (sma[i] === null) {
        result.push(null);
        continue;
      }

      let sumSq = 0;
      for (let j = 0; j < period; j++) {
        const diff = bars[i - j].close.toNumber() - sma[i]!;
        sumSq += diff * diff;
      }
      const stdDev = Math.sqrt(sumSq / period);

      result.push({
        middle: sma[i]!,
        upper: sma[i]! + (stdDevMultiplier * stdDev),
        lower: sma[i]! - (stdDevMultiplier * stdDev)
      });
    }

    return result;
  }

  calculateATR(bars: HistoricalBar[], period: number): (number | null)[] {
    this.validatePeriod(period, "period");
    const key = this.getCacheKey({ type: 'ATR', period }, bars);
    let cached = this.cache.get(key);
    
    if (!cached) {
      cached = { result: [], state: { atr: null as number | null, trSum: 0 } };
      this.cache.set(key, cached);
    }

    const { result, state } = cached;

    for (let i = result.length; i < bars.length; i++) {
      if (i === 0) {
        const tr = bars[i].high.toNumber() - bars[i].low.toNumber();
        state.trSum = (state.trSum || 0) + tr;
        if (period === 1) {
          state.atr = tr;
          result.push(state.atr as number);
        } else {
          result.push(null);
        }
        continue;
      }

      const high = bars[i].high.toNumber();
      const low = bars[i].low.toNumber();
      const prevClose = bars[i - 1].close.toNumber();

      const tr = Math.max(
        high - low,
        Math.abs(high - prevClose),
        Math.abs(low - prevClose)
      );

      if (state.atr === null || state.atr === undefined) {
        state.trSum = (state.trSum || 0) + tr;
        if (i === period - 1) {
          state.atr = (state.trSum as number) / period;
          result.push(state.atr as number);
        } else {
          result.push(null);
        }
      } else {
        state.atr = (((state.atr as number) * (period - 1)) + tr) / period;
        result.push(state.atr as number);
      }
    }

    return result;
  }
}
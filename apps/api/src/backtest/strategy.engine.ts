import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from 'database';
import { IndicatorEngine } from './indicators/indicator.engine';
import { HistoricalBar, CustomCondition, NumericOperand, StrategyConfiguration, ComparisonOperator, ComparisonCondition } from './interfaces';

@Injectable()
export class StrategyEngine {
  parseStrategyConfiguration(obj: unknown): StrategyConfiguration {
    const objRec = obj as Record<string, unknown>;
    if (!objRec.type || typeof objRec.type !== 'string') throw new BadRequestException('Strategy configuration requires a type string');
    const type = objRec.type;

    if (type === 'BUY_AND_HOLD') {
      const cfg = this.extractConfig(objRec, 'BUY_AND_HOLD');
      this.validateKeys(cfg, ['quantity']);
      return { type, quantity: this.validateQuantity(cfg.quantity) };
    }

    if (type === 'MOVING_AVERAGE_CROSSOVER') {
      const cfg = this.extractConfig(objRec, 'MOVING_AVERAGE_CROSSOVER');
      this.validateKeys(cfg, ['fastPeriod', 'slowPeriod', 'quantity']);
      const fastPeriod = this.validatePeriod(cfg.fastPeriod, 'fastPeriod');
      const slowPeriod = this.validatePeriod(cfg.slowPeriod, 'slowPeriod', fastPeriod);
      return { type, fastPeriod, slowPeriod, quantity: this.validateQuantity(cfg.quantity) };
    }

    if (type === 'RSI_THRESHOLD') {
      const cfg = this.extractConfig(objRec, 'RSI_THRESHOLD');
      this.validateKeys(cfg, ['period', 'oversold', 'overbought', 'quantity']);
      const period = this.validatePeriod(cfg.period, 'period');
      const oversold = this.validatePeriod(cfg.oversold, 'oversold');
      const overbought = this.validatePeriod(cfg.overbought, 'overbought', oversold);
      return { type, period, oversold, overbought, quantity: this.validateQuantity(cfg.quantity) };
    }

    if (type === 'MACD_CROSSOVER') {
      const cfg = this.extractConfig(objRec, 'MACD_CROSSOVER');
      this.validateKeys(cfg, ['fastPeriod', 'slowPeriod', 'signalPeriod', 'quantity']);
      const fastPeriod = this.validatePeriod(cfg.fastPeriod, 'fastPeriod');
      const slowPeriod = this.validatePeriod(cfg.slowPeriod, 'slowPeriod', fastPeriod);
      const signalPeriod = this.validatePeriod(cfg.signalPeriod, 'signalPeriod');
      return { type, fastPeriod, slowPeriod, signalPeriod, quantity: this.validateQuantity(cfg.quantity) };
    }

    if (type === 'BOLLINGER_BAND') {
      const cfg = this.extractConfig(objRec, 'BOLLINGER_BAND');
      this.validateKeys(cfg, ['period', 'stdDevMultiplier', 'quantity']);
      const period = this.validatePeriod(cfg.period, 'period');
      const stdDevMultiplier = this.validateFinite(cfg.stdDevMultiplier, 'stdDevMultiplier');
      if (stdDevMultiplier <= 0) throw new BadRequestException('stdDevMultiplier must be > 0');
      return { type, period, stdDevMultiplier, quantity: this.validateQuantity(cfg.quantity) };
    }

    if (type === 'CUSTOM_RULE_COMBINATION') {
      const cfg = this.extractConfig(objRec, 'CUSTOM_RULE_COMBINATION');
      const keys = Object.keys(cfg);
      for (const k of keys) {
        if (!['buyCondition', 'sellCondition', 'quantity'].includes(k)) {
          throw new BadRequestException(`CUSTOM_RULE_COMBINATION config contains unknown key: ${k}`);
        }
      }
      
      let buyCondition: CustomCondition | undefined;
      let sellCondition: CustomCondition | undefined;
      
      if (cfg.buyCondition) {
        buyCondition = this.validateCustomCondition(cfg.buyCondition, 0);
      }
      if (cfg.sellCondition) {
        sellCondition = this.validateCustomCondition(cfg.sellCondition, 0);
      }
      
      return { type, buyCondition, sellCondition, quantity: this.validateQuantity(cfg.quantity) };
    }

    throw new BadRequestException(`Strategy type not implemented yet: ${type}`);
  }

  private extractConfig(obj: Record<string, unknown>, typeName: string): Record<string, unknown> {
    if (!('config' in obj) || !obj.config || typeof obj.config !== 'object') {
      throw new BadRequestException(`${typeName} requires a config object`);
    }
    return obj.config as Record<string, unknown>;
  }

  private validateKeys(cfg: Record<string, unknown>, allowed: string[]) {
    const keys = Object.keys(cfg);
    if (keys.length !== allowed.length || !allowed.every(k => keys.includes(k))) {
      throw new BadRequestException(`Config must exactly contain: ${allowed.join(', ')}`);
    }
  }

  private validateQuantity(q: unknown): string {
    const parsed = Number(q);
    if (typeof q !== 'string' || q.trim() === '' || !Number.isFinite(parsed) || parsed <= 0) {
      throw new BadRequestException('quantity must be a positive finite numeric string');
    }
    return q;
  }

  private validatePeriod(p: unknown, name: string, minLimit = 0): number {
    if (typeof p !== 'number' || !Number.isFinite(p) || !Number.isInteger(p) || p <= minLimit) {
      throw new BadRequestException(`${name} must be a finite integer > ${minLimit}`);
    }
    return p;
  }

  private validateFinite(v: unknown, name: string): number {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new BadRequestException(`${name} must be a finite number`);
    }
    return v;
  }

  private validateOperand(op: unknown): NumericOperand {
    if (!op || typeof op !== 'object') throw new BadRequestException('Operand must be an object');
    const opObj = op as Record<string, unknown>;
    const type = opObj.type as string;
    
    if (!type || typeof type !== 'string') throw new BadRequestException('Operand type required');
    if (!['CONSTANT', 'PRICE', 'INDICATOR'].includes(type)) throw new BadRequestException(`Invalid operand type: ${type}`);
    
    if (type === 'CONSTANT') {
      if (typeof opObj.value !== 'number') throw new BadRequestException('Constant operand requires numeric value');
      return { type: 'CONSTANT', value: opObj.value };
    }
    
    if (type === 'PRICE') {
      if (!['open', 'high', 'low', 'close', 'volume'].includes(opObj.field as 'open' | 'high' | 'low' | 'close' | 'volume')) throw new BadRequestException(`Invalid price field: ${opObj.field}`);
      return { type: 'PRICE', field: opObj.field as 'open' | 'high' | 'low' | 'close' | 'volume' };
    }
    
    if (type === 'INDICATOR') {
      const name = opObj.name as string;
      if (typeof name !== 'string') throw new BadRequestException('Indicator name required');
      if (!opObj.config || typeof opObj.config !== 'object') throw new BadRequestException('Indicator config required');
      
      if (!['SMA', 'EMA', 'RSI', 'MACD', 'BOLLINGER_BAND', 'ATR'].includes(name)) throw new BadRequestException(`Invalid indicator: ${name}`);
      
      if (name === 'SMA' || name === 'EMA' || name === 'RSI' || name === 'ATR') {
        return { type: 'INDICATOR', name, config: { period: this.validatePeriod((opObj.config as Record<string, unknown>).period, 'period') } };
      }
      
      if (name === 'MACD') {
        const outStr = typeof opObj.output === 'string' ? opObj.output : '';
        if (outStr !== 'macd' && outStr !== 'signal' && outStr !== 'histogram') {
          throw new BadRequestException('MACD requires valid output field');
        }
        return { 
          type: 'INDICATOR', 
          name, 
          config: { 
            fastPeriod: this.validatePeriod((opObj.config as Record<string, unknown>).fastPeriod, 'fastPeriod'), 
            slowPeriod: this.validatePeriod((opObj.config as Record<string, unknown>).slowPeriod, 'slowPeriod'), 
            signalPeriod: this.validatePeriod((opObj.config as Record<string, unknown>).signalPeriod, 'signalPeriod') 
          }, 
          output: outStr
        };
      }
      
      if (name === 'BOLLINGER_BAND') {
        const outStr = typeof opObj.output === 'string' ? opObj.output : '';
        if (outStr !== 'middle' && outStr !== 'upper' && outStr !== 'lower') {
          throw new BadRequestException('BOLLINGER_BAND requires valid output');
        }
        const mult = this.validateFinite((opObj.config as Record<string, unknown>).stdDevMultiplier, 'stdDevMultiplier');
        return { 
          type: 'INDICATOR', 
          name, 
          config: { 
            period: this.validatePeriod((opObj.config as Record<string, unknown>).period, 'period'), 
            stdDevMultiplier: mult 
          }, 
          output: outStr
        };
      }
    }
    throw new BadRequestException('Unknown operand structure');
  }

  private validateCustomCondition(cond: unknown, depth: number): CustomCondition {
    if (depth > 10) throw new BadRequestException('Custom condition depth exceeds 10');
    if (!cond || typeof cond !== 'object') throw new BadRequestException('Condition must be an object');
    
    const condObj = cond as Record<string, unknown>;
    const op = condObj.operator as string;
    
    if (!['GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL', 'EQUAL', 'NOT_EQUAL', 'CROSSES_ABOVE', 'CROSSES_BELOW', 'AND', 'OR', 'NOT'].includes(op)) {
      throw new BadRequestException(`Invalid operator: ${op}`);
    }
    
    if (['AND', 'OR'].includes(op)) {
      const conditions = condObj.conditions as unknown[];
      if (!Array.isArray(conditions)) throw new BadRequestException(`${op} requires conditions array`);
      if (conditions.length === 0 || conditions.length > 20) throw new BadRequestException(`${op} conditions length must be between 1 and 20`);
      
      return { operator: op as 'AND' | 'OR', conditions: conditions.map(c => this.validateCustomCondition(c, depth + 1)) };
    }
    
    if (op === 'NOT') {
      if (!condObj.condition) throw new BadRequestException('NOT requires a condition');
      return { operator: 'NOT', condition: this.validateCustomCondition(condObj.condition, depth + 1) };
    }
    
    if (!condObj.left || !condObj.right) throw new BadRequestException(`Binary operator ${op} requires left and right operands`);
    return { operator: op as ComparisonOperator, left: this.validateOperand(condObj.left), right: this.validateOperand(condObj.right) };
  }

  generateSignal(
    strategyConfig: StrategyConfiguration, 
    historyToNow: HistoricalBar[], 
    currentPosition: Prisma.Decimal,
    indicatorEngine: IndicatorEngine
  ): { type: 'BUY' | 'SELL' | 'HOLD'; quantity?: Prisma.Decimal } {
    if (historyToNow.length === 0) return { type: 'HOLD' };

    if (strategyConfig.type === 'BUY_AND_HOLD') {
      if (currentPosition.isZero()) return { type: 'BUY', quantity: new Prisma.Decimal(strategyConfig.quantity) };
      return { type: 'HOLD' };
    }

    if (strategyConfig.type === 'MOVING_AVERAGE_CROSSOVER') {
      if (historyToNow.length < strategyConfig.slowPeriod + 1) return { type: 'HOLD' };
      const fastSma = indicatorEngine.calculateSMA(historyToNow, strategyConfig.fastPeriod);
      const slowSma = indicatorEngine.calculateSMA(historyToNow, strategyConfig.slowPeriod);
      
      const N = historyToNow.length - 1;
      const prevFast = fastSma[N - 1];
      const prevSlow = slowSma[N - 1];
      const currFast = fastSma[N];
      const currSlow = slowSma[N];

      if (prevFast === null || prevSlow === null || currFast === null || currSlow === null) return { type: 'HOLD' };

      if (prevFast <= prevSlow && currFast > currSlow) {
        if (currentPosition.isZero()) return { type: 'BUY', quantity: new Prisma.Decimal(strategyConfig.quantity) };
      } else if (prevFast >= prevSlow && currFast < currSlow) {
        if (currentPosition.gt(0)) return { type: 'SELL', quantity: currentPosition };
      }
      return { type: 'HOLD' };
    }

    if (strategyConfig.type === 'RSI_THRESHOLD') {
      const rsi = indicatorEngine.calculateRSI(historyToNow, strategyConfig.period);
      const N = historyToNow.length - 1;
      if (N < 1) return { type: 'HOLD' };

      const currRsi = rsi[N];
      const prevRsi = rsi[N - 1];
      
      if (currRsi === null || prevRsi === null) return { type: 'HOLD' };

      if (prevRsi >= strategyConfig.oversold && currRsi < strategyConfig.oversold) {
        if (currentPosition.isZero()) return { type: 'BUY', quantity: new Prisma.Decimal(strategyConfig.quantity) };
      } else if (prevRsi <= strategyConfig.overbought && currRsi > strategyConfig.overbought) {
        if (currentPosition.gt(0)) return { type: 'SELL', quantity: currentPosition };
      }
      return { type: 'HOLD' };
    }

    if (strategyConfig.type === 'MACD_CROSSOVER') {
      const macd = indicatorEngine.calculateMACD(historyToNow, strategyConfig.fastPeriod, strategyConfig.slowPeriod, strategyConfig.signalPeriod);
      const N = historyToNow.length - 1;
      if (N < 1) return { type: 'HOLD' };

      const prev = macd[N - 1];
      const curr = macd[N];
      
      if (!prev || !curr) return { type: 'HOLD' };

      if (prev.macd <= prev.signal && curr.macd > curr.signal) {
        if (currentPosition.isZero()) return { type: 'BUY', quantity: new Prisma.Decimal(strategyConfig.quantity) };
      } else if (prev.macd >= prev.signal && curr.macd < curr.signal) {
        if (currentPosition.gt(0)) return { type: 'SELL', quantity: currentPosition };
      }
      return { type: 'HOLD' };
    }

    if (strategyConfig.type === 'BOLLINGER_BAND') {
      const bb = indicatorEngine.calculateBollingerBands(historyToNow, strategyConfig.period, strategyConfig.stdDevMultiplier);
      const N = historyToNow.length - 1;
      if (N < 1) return { type: 'HOLD' };
      
      const curr = bb[N];
      const prev = bb[N-1];
      if (!curr || !prev) return { type: 'HOLD' };

      const currClose = historyToNow[N].close.toNumber();
      const prevClose = historyToNow[N-1].close.toNumber();

      if (prevClose >= prev.lower && currClose < curr.lower) {
        if (currentPosition.isZero()) return { type: 'BUY', quantity: new Prisma.Decimal(strategyConfig.quantity) };
      } else if (prevClose <= prev.upper && currClose > curr.upper) {
        if (currentPosition.gt(0)) return { type: 'SELL', quantity: currentPosition };
      }
      return { type: 'HOLD' };
    }

    if (strategyConfig.type === 'CUSTOM_RULE_COMBINATION') {
      if (strategyConfig.buyCondition && currentPosition.isZero()) {
        const isBuy = this.evaluateCondition(strategyConfig.buyCondition, indicatorEngine, historyToNow);
        if (isBuy) return { type: 'BUY', quantity: new Prisma.Decimal(strategyConfig.quantity) };
      } else if (strategyConfig.sellCondition && currentPosition.gt(0)) {
        const isSell = this.evaluateCondition(strategyConfig.sellCondition, indicatorEngine, historyToNow);
        if (isSell) return { type: 'SELL', quantity: currentPosition };
      }
      return { type: 'HOLD' };
    }

    return { type: 'HOLD' };
  }

  private evaluateOperand(op: NumericOperand, indicatorEngine: IndicatorEngine, historyToNow: HistoricalBar[], offset = 0): number | null {
    const N = historyToNow.length - 1 - offset;
    if (N < 0) return null;

    if (op.type === 'CONSTANT') return op.value;
    if (op.type === 'PRICE') {
      return (historyToNow[N][op.field as 'open' | 'high' | 'low' | 'close' | 'volume'] as import("database").Prisma.Decimal).toNumber();
    }
    if (op.type === 'INDICATOR') {
      if (op.name === 'SMA') return indicatorEngine.calculateSMA(historyToNow, (op.config as Record<string, unknown>).period as number)[N];
      if (op.name === 'EMA') return indicatorEngine.calculateEMA(historyToNow, (op.config as Record<string, unknown>).period as number)[N];
      if (op.name === 'ATR') return indicatorEngine.calculateATR(historyToNow, (op.config as Record<string, unknown>).period as number)[N];
      if (op.name === 'RSI') return indicatorEngine.calculateRSI(historyToNow, (op.config as Record<string, unknown>).period as number)[N];
      if (op.name === 'MACD') {
        const res = indicatorEngine.calculateMACD(historyToNow, (op.config as Record<string, unknown>).fastPeriod as number, (op.config as Record<string, unknown>).slowPeriod as number, (op.config as Record<string, unknown>).signalPeriod as number)[N];
        return res ? res[op.output as string] : null;
      }
      if (op.name === 'BOLLINGER_BAND') {
        const res = indicatorEngine.calculateBollingerBands(historyToNow, (op.config as Record<string, unknown>).period as number, (op.config as Record<string, unknown>).stdDevMultiplier as number)[N];
        return res ? res[op.output as string] : null;
      }
    }
    return null;
  }

  private evaluateCondition(cond: CustomCondition, indicatorEngine: IndicatorEngine, historyToNow: HistoricalBar[]): boolean | null {
    if (cond.operator === 'AND') {
      let hasNull = false;
      for (const c of cond.conditions!) {
        const res = this.evaluateCondition(c, indicatorEngine, historyToNow);
        if (res === false) return false;
        if (res === null) hasNull = true;
      }
      if (hasNull) return null;
      return true;
    }
    if (cond.operator === 'OR') {
      let hasNull = false;
      for (const c of cond.conditions!) {
        const res = this.evaluateCondition(c, indicatorEngine, historyToNow);
        if (res === true) return true;
        if (res === null) hasNull = true;
      }
      if (hasNull) return null;
      return false;
    }
    if (cond.operator === 'NOT') {
      const res = this.evaluateCondition(cond.condition!, indicatorEngine, historyToNow);
      if (res === null) return null;
      return !res;
    }
    
    if (['CROSSES_ABOVE', 'CROSSES_BELOW'].includes(cond.operator)) {
      const currL = this.evaluateOperand((cond as ComparisonCondition).left, indicatorEngine, historyToNow, 0);
      const currR = this.evaluateOperand((cond as ComparisonCondition).right, indicatorEngine, historyToNow, 0);
      const prevL = this.evaluateOperand((cond as ComparisonCondition).left, indicatorEngine, historyToNow, 1);
      const prevR = this.evaluateOperand((cond as ComparisonCondition).right, indicatorEngine, historyToNow, 1);
      
      if (currL === null || currR === null || prevL === null || prevR === null) return null;
      
      if (cond.operator === 'CROSSES_ABOVE') {
        return prevL <= prevR && currL > currR;
      }
      if (cond.operator === 'CROSSES_BELOW') {
        return prevL >= prevR && currL < currR;
      }
    }

    const L = this.evaluateOperand((cond as ComparisonCondition).left, indicatorEngine, historyToNow, 0);
    const R = this.evaluateOperand((cond as ComparisonCondition).right, indicatorEngine, historyToNow, 0);
    
    if (L === null || R === null) return null;

    switch (cond.operator) {
      case 'GREATER_THAN': return L > R;
      case 'GREATER_THAN_OR_EQUAL': return L >= R;
      case 'LESS_THAN': return L < R;
      case 'LESS_THAN_OR_EQUAL': return L <= R;
      case 'EQUAL': return L === R;
      case 'NOT_EQUAL': return L !== R;
    }
    return null;
  }
}

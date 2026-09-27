import { Injectable, BadRequestException } from '@nestjs/common';
import { Prisma } from 'database';
import {
  CompiledStrategy,
  CompiledOperand,
  CompiledCondition,
  CompiledIndicatorConfig,
  ComparisonOperator,
  LogicalOperator,
  CompiledEntryConfig,
  CompiledExitConfig,
  CompiledPositionSizingConfig,
} from './models';
import { StrategyConfiguration, NumericOperand, CustomCondition, ComparisonCondition } from '../interfaces';
import { IndicatorEngine } from '../indicators/indicator.engine';

@Injectable()
export class StrategyCompiler {
  private readonly SUPPORTED_STRATEGY_TYPES = [
    'BUY_AND_HOLD',
    'MOVING_AVERAGE_CROSSOVER',
    'RSI_THRESHOLD',
    'MACD_CROSSOVER',
    'BOLLINGER_BAND',
    'CUSTOM_RULE_COMBINATION',
  ] as const;

  compile(rawConfig: { type: string; config: unknown }, instrument: string, timeframe: string, strategyType: string): CompiledStrategy {
    const validated = this.validateAndNormalize(rawConfig);
    return this.buildCompiledStrategy(validated, instrument, timeframe, strategyType);
  }

  private validateAndNormalize(config: { type: string; config: unknown }): StrategyConfiguration {
console.log('DEBUG CONFIG:', config);
    if (!config || typeof config !== 'object') {
      throw new BadRequestException('Strategy configuration must be an object');
    }

    if (!config.type || typeof config.type !== 'string') {
      throw new BadRequestException('Strategy configuration requires a type string');
    }

    const type = config.type;

    if (!this.SUPPORTED_STRATEGY_TYPES.includes(type as typeof this.SUPPORTED_STRATEGY_TYPES[number])) {
      throw new BadRequestException(`Unsupported strategy type: ${type}. Supported: ${this.SUPPORTED_STRATEGY_TYPES.join(', ')}`);
    }

    switch (type) {
      case 'BUY_AND_HOLD':
        return this.validateBuyAndHold(config.config);
      case 'MOVING_AVERAGE_CROSSOVER':
        return this.validateMovingAverageCrossover(config.config);
      case 'RSI_THRESHOLD':
        return this.validateRsiThreshold(config.config);
      case 'MACD_CROSSOVER':
        return this.validateMacdCrossover(config.config);
      case 'BOLLINGER_BAND':
        return this.validateBollingerBand(config.config);
      case 'CUSTOM_RULE_COMBINATION':
        return this.validateCustomRuleCombination(config.config);
      default:
        throw new BadRequestException(`Strategy type not implemented: ${type}`);
    }
  }

  private validateBuyAndHold(cfg: unknown): StrategyConfiguration {
    if (!cfg || typeof cfg !== 'object') {
      throw new BadRequestException('BUY_AND_HOLD requires a config object');
    }
    const obj = cfg as Record<string, unknown>;
    this.validateExactKeys(obj, ['quantity']);
    const quantity = this.validateQuantity(obj.quantity);
    return { type: 'BUY_AND_HOLD', quantity };
  }

  private validateMovingAverageCrossover(cfg: unknown): StrategyConfiguration {
    if (!cfg || typeof cfg !== 'object') {
      throw new BadRequestException('MOVING_AVERAGE_CROSSOVER requires a config object');
    }
    const obj = cfg as Record<string, unknown>;
    this.validateExactKeys(obj, ['fastPeriod', 'slowPeriod', 'quantity']);
    const fastPeriod = this.validatePeriod(obj.fastPeriod, 'fastPeriod');
    const slowPeriod = this.validatePeriod(obj.slowPeriod, 'slowPeriod', fastPeriod);
    const quantity = this.validateQuantity(obj.quantity);
    return { type: 'MOVING_AVERAGE_CROSSOVER', fastPeriod, slowPeriod, quantity };
  }

  private validateRsiThreshold(cfg: unknown): StrategyConfiguration {
    if (!cfg || typeof cfg !== 'object') {
      throw new BadRequestException('RSI_THRESHOLD requires a config object');
    }
    const obj = cfg as Record<string, unknown>;
    this.validateExactKeys(obj, ['period', 'oversold', 'overbought', 'quantity']);
    const period = this.validatePeriod(obj.period, 'period');
    const oversold = this.validateRsiLevel(obj.oversold, 'oversold');
    const overbought = this.validateRsiLevel(obj.overbought, 'overbought', oversold);
    const quantity = this.validateQuantity(obj.quantity);
    return { type: 'RSI_THRESHOLD', period, oversold, overbought, quantity };
  }

  private validateMacdCrossover(cfg: unknown): StrategyConfiguration {
    if (!cfg || typeof cfg !== 'object') {
      throw new BadRequestException('MACD_CROSSOVER requires a config object');
    }
    const obj = cfg as Record<string, unknown>;
    this.validateExactKeys(obj, ['fastPeriod', 'slowPeriod', 'signalPeriod', 'quantity']);
    const fastPeriod = this.validatePeriod(obj.fastPeriod, 'fastPeriod');
    const slowPeriod = this.validatePeriod(obj.slowPeriod, 'slowPeriod', fastPeriod);
    const signalPeriod = this.validatePeriod(obj.signalPeriod, 'signalPeriod');
    const quantity = this.validateQuantity(obj.quantity);
    return { type: 'MACD_CROSSOVER', fastPeriod, slowPeriod, signalPeriod, quantity };
  }

  private validateBollingerBand(cfg: unknown): StrategyConfiguration {
    if (!cfg || typeof cfg !== 'object') {
      throw new BadRequestException('BOLLINGER_BAND requires a config object');
    }
    const obj = cfg as Record<string, unknown>;
    this.validateExactKeys(obj, ['period', 'stdDevMultiplier', 'quantity']);
    const period = this.validatePeriod(obj.period, 'period');
    const stdDevMultiplier = this.validateFinite(obj.stdDevMultiplier, 'stdDevMultiplier');
    if (stdDevMultiplier <= 0) throw new BadRequestException('stdDevMultiplier must be > 0');
    const quantity = this.validateQuantity(obj.quantity);
    return { type: 'BOLLINGER_BAND', period, stdDevMultiplier, quantity };
  }

  private validateCustomRuleCombination(cfg: unknown): StrategyConfiguration {
    if (!cfg || typeof cfg !== 'object') {
      throw new BadRequestException('CUSTOM_RULE_COMBINATION requires a config object');
    }
    const obj = cfg as Record<string, unknown>;
    const allowedKeys = ['buyCondition', 'sellCondition', 'quantity'];
    for (const k of Object.keys(obj)) {
      if (!allowedKeys.includes(k)) {
        throw new BadRequestException(`CUSTOM_RULE_COMBINATION config contains unknown key: ${k}`);
      }
    }

    let buyCondition: CustomCondition | undefined;
    let sellCondition: CustomCondition | undefined;

    if (obj.buyCondition) {
      buyCondition = this.validateCustomCondition(obj.buyCondition, 0);
    }
    if (obj.sellCondition) {
      sellCondition = this.validateCustomCondition(obj.sellCondition, 0);
    }

    const quantity = this.validateQuantity(obj.quantity);
    return { type: 'CUSTOM_RULE_COMBINATION', buyCondition, sellCondition, quantity };
  }

  private validateCustomCondition(cond: unknown, depth: number): CustomCondition {
    if (depth > 10) throw new BadRequestException('Custom condition depth exceeds 10');
    if (!cond || typeof cond !== 'object') throw new BadRequestException('Condition must be an object');

    const condObj = cond as Record<string, unknown>;
    const op = condObj.operator as string;

    const validOperators = [
      'GREATER_THAN', 'GREATER_THAN_OR_EQUAL', 'LESS_THAN', 'LESS_THAN_OR_EQUAL',
      'EQUAL', 'NOT_EQUAL', 'CROSSES_ABOVE', 'CROSSES_BELOW', 'AND', 'OR', 'NOT'
    ];

    if (!validOperators.includes(op)) {
      throw new BadRequestException(`Invalid operator: ${op}`);
    }

    if (['AND', 'OR'].includes(op)) {
      const conditions = condObj.conditions as unknown[];
      if (!Array.isArray(conditions)) throw new BadRequestException(`${op} requires conditions array`);
      if (conditions.length === 0 || conditions.length > 20) {
        throw new BadRequestException(`${op} conditions length must be between 1 and 20`);
      }
      return { operator: op as 'AND' | 'OR', conditions: conditions.map(c => this.validateCustomCondition(c, depth + 1)) };
    }

    if (op === 'NOT') {
      if (!condObj.condition) throw new BadRequestException('NOT requires a condition');
      return { operator: 'NOT', condition: this.validateCustomCondition(condObj.condition, depth + 1) };
    }

    if (!condObj.left || !condObj.right) throw new BadRequestException(`Binary operator ${op} requires left and right operands`);
    return { 
      operator: op as ComparisonOperator, 
      left: this.validateOperand(condObj.left), 
      right: this.validateOperand(condObj.right) 
    };
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
      const field = opObj.field as string;
      if (!['open', 'high', 'low', 'close', 'volume'].includes(field)) {
        throw new BadRequestException(`Invalid price field: ${field}`);
      }
      return { type: 'PRICE', field: field as 'open' | 'high' | 'low' | 'close' | 'volume' };
    }

    if (type === 'INDICATOR') {
      const name = opObj.name as string;
      if (typeof name !== 'string') throw new BadRequestException('Indicator name required');
      if (!opObj.config || typeof opObj.config !== 'object') throw new BadRequestException('Indicator config required');

      const validIndicators = ['SMA', 'EMA', 'RSI', 'MACD', 'BOLLINGER_BAND', 'ATR'];
      if (!validIndicators.includes(name)) throw new BadRequestException(`Invalid indicator: ${name}`);

      const config = opObj.config as Record<string, unknown>;

      if (['SMA', 'EMA', 'RSI', 'ATR'].includes(name)) {
        const period = this.validatePeriod(config.period, 'period');
        return { type: 'INDICATOR', name, config: { period } };
      }

      if (name === 'MACD') {
        const output = typeof opObj.output === 'string' ? opObj.output : '';
        if (!['macd', 'signal', 'histogram'].includes(output)) {
          throw new BadRequestException('MACD requires valid output field');
        }
        const fastPeriod = this.validatePeriod(config.fastPeriod, 'fastPeriod');
        const slowPeriod = this.validatePeriod(config.slowPeriod, 'slowPeriod', fastPeriod);
        const signalPeriod = this.validatePeriod(config.signalPeriod, 'signalPeriod');
        return { type: 'INDICATOR', name, config: { fastPeriod, slowPeriod, signalPeriod }, output };
      }

      if (name === 'BOLLINGER_BAND') {
        const output = typeof opObj.output === 'string' ? opObj.output : '';
        if (!['middle', 'upper', 'lower'].includes(output)) {
          throw new BadRequestException('BOLLINGER_BAND requires valid output');
        }
        const period = this.validatePeriod(config.period, 'period');
        const stdDevMultiplier = this.validateFinite(config.stdDevMultiplier, 'stdDevMultiplier');
        return { type: 'INDICATOR', name, config: { period, stdDevMultiplier }, output };
      }
    }

    throw new BadRequestException('Unknown operand structure');
  }

  private buildCompiledStrategy(
    validated: StrategyConfiguration,
    instrument: string,
    timeframe: string,
    strategyType: string
  ): CompiledStrategy {
    const type = validated.type;

    const positionSizing: CompiledPositionSizingConfig = {
      type: 'FIXED_QUANTITY',
      value: validated.quantity,
    };

    let entry: CompiledEntryConfig = {};
    let exit: CompiledExitConfig = {};

    switch (validated.type) {
      case 'BUY_AND_HOLD':
        entry = { condition: undefined };
        exit = { condition: undefined };
        break;
      case 'MOVING_AVERAGE_CROSSOVER':
        entry = {
          condition: {
            operator: 'CROSSES_ABOVE',
            left: this.createIndicatorOperand('SMA', { period: validated.fastPeriod }),
            right: this.createIndicatorOperand('SMA', { period: validated.slowPeriod }),
          },
        };
        exit = {
          condition: {
            operator: 'CROSSES_BELOW',
            left: this.createIndicatorOperand('SMA', { period: validated.fastPeriod }),
            right: this.createIndicatorOperand('SMA', { period: validated.slowPeriod }),
          },
        };
        break;
      case 'RSI_THRESHOLD':
        entry = {
          condition: {
            operator: 'CROSSES_BELOW',
            left: this.createIndicatorOperand('RSI', { period: validated.period }),
            right: { type: 'CONSTANT', value: validated.oversold },
          },
        };
        exit = {
          condition: {
            operator: 'CROSSES_ABOVE',
            left: this.createIndicatorOperand('RSI', { period: validated.period }),
            right: { type: 'CONSTANT', value: validated.overbought },
          },
        };
        break;
      case 'MACD_CROSSOVER':
        entry = {
          condition: {
            operator: 'CROSSES_ABOVE',
            left: this.createIndicatorOperand('MACD', { 
              fastPeriod: validated.fastPeriod, 
              slowPeriod: validated.slowPeriod, 
              signalPeriod: validated.signalPeriod 
            }, 'macd'),
            right: this.createIndicatorOperand('MACD', { 
              fastPeriod: validated.fastPeriod, 
              slowPeriod: validated.slowPeriod, 
              signalPeriod: validated.signalPeriod 
            }, 'signal'),
          },
        };
        exit = {
          condition: {
            operator: 'CROSSES_BELOW',
            left: this.createIndicatorOperand('MACD', { 
              fastPeriod: validated.fastPeriod, 
              slowPeriod: validated.slowPeriod, 
              signalPeriod: validated.signalPeriod 
            }, 'macd'),
            right: this.createIndicatorOperand('MACD', { 
              fastPeriod: validated.fastPeriod, 
              slowPeriod: validated.slowPeriod, 
              signalPeriod: validated.signalPeriod 
            }, 'signal'),
          },
        };
        break;
      case 'BOLLINGER_BAND':
        entry = {
          condition: {
            operator: 'CROSSES_BELOW',
            left: { type: 'PRICE', field: 'close' },
            right: this.createIndicatorOperand('BOLLINGER_BAND', { 
              period: validated.period, 
              stdDevMultiplier: validated.stdDevMultiplier 
            }, 'lower'),
          },
        };
        exit = {
          condition: {
            operator: 'CROSSES_ABOVE',
            left: { type: 'PRICE', field: 'close' },
            right: this.createIndicatorOperand('BOLLINGER_BAND', { 
              period: validated.period, 
              stdDevMultiplier: validated.stdDevMultiplier 
            }, 'upper'),
          },
        };
        break;
      case 'CUSTOM_RULE_COMBINATION':
        entry = { condition: validated.buyCondition ? this.compileCondition(validated.buyCondition) : undefined };
        exit = { condition: validated.sellCondition ? this.compileCondition(validated.sellCondition) : undefined };
        break;
    }

    return {
      version: 1,
      instrument,
      timeframe,
      entry,
      exit,
      positionSizing,
      strategyType: validated.type,
      rawConfiguration: { type: validated.type, config: validated },
    };
  }

  private createIndicatorOperand(
    name: CompiledIndicatorConfig['name'],
    config: Record<string, number>,
    output?: string
  ): CompiledOperand {
    return {
      type: 'INDICATOR',
      indicator: { name, ...config, output },
    };
  }

  private compileCondition(condition: CustomCondition): CompiledCondition {
    if (condition.operator === 'AND' || condition.operator === 'OR') {
      return {
        operator: condition.operator,
        conditions: condition.conditions.map(c => this.compileCondition(c)),
      };
    }
    if (condition.operator === 'NOT') {
      return {
        operator: 'NOT',
        condition: this.compileCondition(condition.condition!),
      };
    }
    if ('left' in condition) {
      return {
        operator: condition.operator,
        left: this.compileOperand(condition.left),
        right: this.compileOperand(condition.right),
      };
    }
    throw new Error('Invalid condition type');
  }

  private compileOperand(operand: NumericOperand): CompiledOperand {
    if (operand.type === 'CONSTANT') {
      return { type: 'CONSTANT', value: operand.value };
    }
    if (operand.type === 'PRICE') {
      return { type: 'PRICE', field: operand.field };
    }
    // INDICATOR
    const indicatorConfig: CompiledIndicatorConfig = {
      name: operand.name as CompiledIndicatorConfig['name'],
    };
    if (operand.config.period !== undefined) {
      indicatorConfig.period = operand.config.period as number;
    }
    if (operand.config.fastPeriod !== undefined) {
      indicatorConfig.fastPeriod = operand.config.fastPeriod as number;
    }
    if (operand.config.slowPeriod !== undefined) {
      indicatorConfig.slowPeriod = operand.config.slowPeriod as number;
    }
    if (operand.config.signalPeriod !== undefined) {
      indicatorConfig.signalPeriod = operand.config.signalPeriod as number;
    }
    if (operand.config.stdDevMultiplier !== undefined) {
      indicatorConfig.stdDevMultiplier = operand.config.stdDevMultiplier as number;
    }
    if (operand.output !== undefined) {
      indicatorConfig.output = operand.output;
    }
    return { type: 'INDICATOR', indicator: indicatorConfig };
  }

  private validateExactKeys(obj: Record<string, unknown>, allowed: string[]) {
    const keys = Object.keys(obj);
    if (keys.length !== allowed.length || !allowed.every(k => keys.includes(k))) {
      throw new BadRequestException(`Config must exactly contain: ${allowed.join(', ')}`);
    }
  }

  private validateQuantity(q: unknown): string {
    if (typeof q !== 'string' || q.trim() === '') {
      throw new BadRequestException('quantity must be a non-empty string');
    }
    const parsed = Number(q);
    if (!Number.isFinite(parsed) || parsed <= 0) {
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

  private validateRsiLevel(p: unknown, name: string, minLimit?: number): number {
    const value = this.validateFinite(p, name);
    if (value < 0 || value > 100) {
      throw new BadRequestException(`${name} must be between 0 and 100`);
    }
    if (minLimit !== undefined && value >= minLimit) {
      throw new BadRequestException(`${name} must be < ${minLimit}`);
    }
    return value;
  }

  private validateFinite(v: unknown, name: string): number {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new BadRequestException(`${name} must be a finite number`);
    }
    return v;
  }
}
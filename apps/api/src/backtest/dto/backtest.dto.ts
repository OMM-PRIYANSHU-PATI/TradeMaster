import { IsString, IsNotEmpty, IsEnum, IsObject, ValidateNested, IsOptional, IsNumberString, IsDateString, IsIn, IsUUID, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export enum StrategyType {
  BUY_AND_HOLD = 'BUY_AND_HOLD',
  MOVING_AVERAGE_CROSSOVER = 'MOVING_AVERAGE_CROSSOVER',
  RSI_THRESHOLD = 'RSI_THRESHOLD',
  MACD_CROSSOVER = 'MACD_CROSSOVER',
  BOLLINGER_BAND = 'BOLLINGER_BAND',
  CUSTOM_RULE_COMBINATION = 'CUSTOM_RULE_COMBINATION'
}

export class CreateStrategyDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assetClass?: string;

  @IsString()
  @IsOptional()
  defaultTimeframe?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(StrategyType)
  @IsIn([StrategyType.BUY_AND_HOLD, StrategyType.MOVING_AVERAGE_CROSSOVER, StrategyType.RSI_THRESHOLD, StrategyType.MACD_CROSSOVER, StrategyType.BOLLINGER_BAND, StrategyType.CUSTOM_RULE_COMBINATION], { message: 'Strategy type not implemented yet' })
  type: StrategyType;

  @IsObject()
  @IsNotEmpty()
  configuration: Record<string, unknown>;
}

export class UpdateStrategyDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assetClass?: string;

  @IsString()
  @IsOptional()
  defaultTimeframe?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsEnum(StrategyType)
  @IsOptional()
  @IsIn([StrategyType.BUY_AND_HOLD, StrategyType.MOVING_AVERAGE_CROSSOVER, StrategyType.RSI_THRESHOLD, StrategyType.MACD_CROSSOVER, StrategyType.BOLLINGER_BAND, StrategyType.CUSTOM_RULE_COMBINATION], { message: 'Strategy type not implemented yet' })
  type?: StrategyType;

  @IsObject()
  @IsOptional()
  configuration?: Record<string, unknown>;
}

export class RunBacktestDto {
  @IsString()
  @IsNotEmpty()
  strategyId: string;

  @IsString()
  @IsNotEmpty()
  instrumentId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsNumberString()
  initialCapital: string;

  @IsUUID()
  @IsOptional()
  costProfileId?: string;
}
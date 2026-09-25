import { IsString, IsEnum, IsNumberString, IsOptional, ValidateIf, MaxLength, Matches } from 'class-validator';

export enum OrderSide {
  BUY = 'BUY',
  SELL = 'SELL'
}

export enum OrderType {
  MARKET = 'MARKET',
  LIMIT = 'LIMIT'
}

export class CreateOrderDto {
  @IsString()
  instrumentId: string;

  @IsEnum(OrderSide)
  side: OrderSide;

  @IsEnum(OrderType)
  type: OrderType;

  // We use IsNumberString to prevent floating point inaccuracies from JSON parsing
  @IsNumberString({ no_symbols: false })
  quantity: string;

  // Only allowed/required if type is LIMIT
  @ValidateIf(o => o.type === OrderType.LIMIT)
  @IsNumberString({ no_symbols: false })
  limitPrice?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-zA-Z0-9_-]+$/)
  clientOrderId?: string;
}

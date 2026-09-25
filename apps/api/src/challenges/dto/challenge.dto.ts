import { IsString, IsNumber, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class JoinChallengeDto {
  // Can add options later if needed
}

export class CreateChallengeDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsNumber()
  @Type(() => Number)
  startingCapital: number;

  @IsNumber()
  @Type(() => Number)
  targetReturnPercent: number;

  @IsNumber()
  @Type(() => Number)
  maxDrawdownPercent: number;

  @IsNumber()
  @Type(() => Number)
  durationDays: number;
}

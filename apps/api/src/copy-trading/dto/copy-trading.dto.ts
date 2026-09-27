import { IsBoolean, IsNumber, IsOptional, IsString, Min, Max, IsPositive } from 'class-validator';

export class CreateCopyConfigDto {
  @IsString()
  sourceUserId: string;

  @IsString()
  targetAccountId: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(0.01)
  @Max(100)
  allocationPercent?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxDrawdown?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxExposure?: number;
}

export class UpdateCopyConfigDto {
  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  @Min(0.01)
  @Max(100)
  allocationPercent?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxDrawdown?: number;

  @IsNumber()
  @IsOptional()
  @IsPositive()
  maxExposure?: number;
}

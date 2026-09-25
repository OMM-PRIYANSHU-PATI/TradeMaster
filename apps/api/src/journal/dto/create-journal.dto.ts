import { IsString, IsOptional, IsArray, IsUrl, IsIn } from 'class-validator';

export class CreateJournalDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  entryReason?: string;

  @IsString()
  @IsOptional()
  exitReason?: string;

  @IsString()
  @IsOptional()
  setup?: string;

  @IsString()
  @IsOptional()
  emotion?: string;

  @IsString()
  @IsOptional()
  confidence?: string;

  @IsString()
  @IsOptional()
  marketCondition?: string;

  @IsString()
  @IsOptional()
  mistakes?: string;

  @IsString()
  @IsOptional()
  ruleAdherence?: string;

  @IsString()
  @IsIn(['TRADE', 'DAILY', 'WEEKLY', 'MONTHLY'])
  reviewType: string;

  @IsString()
  @IsOptional()
  strategyId?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  positionId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  tags?: string[];

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  attachments?: string[];
}

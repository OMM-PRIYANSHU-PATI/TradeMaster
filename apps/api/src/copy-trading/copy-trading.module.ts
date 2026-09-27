import { Module } from '@nestjs/common';
import { FollowService } from './follow.service';
import { CopyConfigService } from './copy-config.service';
import { CopyExecutionService } from './copy-execution.service';
import { CopyTradingController } from './copy-trading.controller';
import { TradingModule } from '../trading/trading.module';

@Module({
  imports: [TradingModule],
  controllers: [CopyTradingController],
  providers: [FollowService, CopyConfigService, CopyExecutionService],
  exports: [FollowService, CopyConfigService, CopyExecutionService],
})
export class CopyTradingModule {}

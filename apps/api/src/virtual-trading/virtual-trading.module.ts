import { Module } from '@nestjs/common';
import { VirtualStrategyController } from './virtual-trading.controller';
import { VirtualStrategyService } from './virtual-trading.service';
import { BacktestModule } from '../backtest/backtest.module';
import { AuthModule } from '../auth/auth.module';
import { IndicatorEngine } from '../backtest/indicators/indicator.engine';

@Module({
  imports: [BacktestModule, AuthModule],
  controllers: [VirtualStrategyController],
  providers: [VirtualStrategyService, IndicatorEngine],
  exports: [VirtualStrategyService]
})
export class VirtualStrategyModule {}

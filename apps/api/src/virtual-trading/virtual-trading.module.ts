import { Module } from '@nestjs/common';
import { VirtualStrategyController } from './virtual-trading.controller';
import { VirtualStrategyService } from './virtual-trading.service';
import { BacktestModule } from '../backtest/backtest.module';
import { AuthModule } from '../auth/auth.module';
import { IndicatorEngine } from '../backtest/indicators/indicator.engine';
import { MarketModule } from '../market/market.module';
import { VirtualStrategyRunner } from './virtual-trading.runner';

@Module({
  imports: [BacktestModule, AuthModule, MarketModule],
  controllers: [VirtualStrategyController],
  providers: [VirtualStrategyService, IndicatorEngine, VirtualStrategyRunner],
  exports: [VirtualStrategyService]
})
export class VirtualStrategyModule {}

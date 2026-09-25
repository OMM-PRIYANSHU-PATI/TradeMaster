import { Module } from '@nestjs/common';
import { BacktestController, StrategyController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { BacktestEngine } from './backtest.engine';
import { StrategyEngine } from './strategy.engine';
import { HistoricalDataProvider } from './historical-data.provider';
import { PnlService } from '../trading/pnl.service';
import { FeeService } from '../trading/fee.service';
// import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [],
  controllers: [BacktestController, StrategyController],
  providers: [
    BacktestService,
    BacktestEngine,
    StrategyEngine,
    HistoricalDataProvider,
    PnlService,
    FeeService
  ],
  exports: [BacktestService],
})
export class BacktestModule {}

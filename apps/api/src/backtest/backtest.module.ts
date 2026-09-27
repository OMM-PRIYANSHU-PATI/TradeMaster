import { Module } from '@nestjs/common';
import { BacktestController, StrategyController } from './backtest.controller';
import { BacktestService } from './backtest.service';
import { HistoricalDataProvider } from './historical-data.provider';
import { IndicatorEngine } from './indicators/indicator.engine';
import { PnlService } from '../trading/pnl.service';
import { FeeService } from '../trading/fee.service';
import { StrategyCompiler } from './canonical/strategy.compiler';
import { StrategyExecutionEngine } from './canonical/strategy-execution.engine';
import { BacktestAdapter } from './canonical/backtest.adapter';
import { PaperExecutionAdapter } from './canonical/paper-execution.adapter';

@Module({
  controllers: [BacktestController, StrategyController],
  providers: [
    BacktestService,
            HistoricalDataProvider,
    IndicatorEngine,
    PnlService,
    FeeService,
    StrategyCompiler,
    StrategyExecutionEngine,
    BacktestAdapter,
    PaperExecutionAdapter,
  ],
  exports: [BacktestService, StrategyCompiler, StrategyExecutionEngine, PaperExecutionAdapter],
})
export class BacktestModule {}
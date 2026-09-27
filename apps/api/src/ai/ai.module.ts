import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini/gemini.service';
import { AuthModule } from '../auth/auth.module';
import { BacktestModule } from '../backtest/backtest.module';
import { JournalModule } from '../journal/journal.module';
import { BacktestContextService } from './context/backtest-context.service';
import { JournalContextService } from './context/journal-context.service';
import { StrategyContextService } from './context/strategy-context.service';
import { TradeReviewContextService } from './context/trade-review-context.service';

@Module({
  imports: [AuthModule, BacktestModule, JournalModule],
  controllers: [AiController],
  providers: [
    AiService,
    GeminiService,
    BacktestContextService,
    JournalContextService,
    StrategyContextService,
    TradeReviewContextService,
  ],
})
export class AiModule {}

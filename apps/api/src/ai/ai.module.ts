import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { GeminiService } from './gemini/gemini.service';
import { AuthModule } from '../auth/auth.module';
import { BacktestModule } from '../backtest/backtest.module';
import { JournalModule } from '../journal/journal.module';

@Module({
  imports: [AuthModule, BacktestModule, JournalModule],
  controllers: [AiController],
  providers: [AiService, GeminiService]
})
export class AiModule {}

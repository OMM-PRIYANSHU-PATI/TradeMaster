import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { AppController } from './app.controller';
import { AdminController } from './admin.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ProfilesModule } from './profiles/profiles.module';
import { TradingModule } from './trading/trading.module';
import { BacktestModule } from './backtest/backtest.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { JournalModule } from './journal/journal.module';
import { TradersModule } from './traders/traders.module';
import { AiModule } from './ai/ai.module';
import { ChallengesModule } from './challenges/challenges.module';
import rateLimit from 'express-rate-limit';

@Module({
  imports: [AuthModule, ProfilesModule, TradingModule, BacktestModule, AnalyticsModule, JournalModule, TradersModule, AiModule, ChallengesModule],
  controllers: [AppController, AdminController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(
        rateLimit({
          windowMs: 15 * 60 * 1000,
          max: 10,
          message: 'Too many requests, please try again later.',
        })
      )
      .forRoutes('api/v1/auth/register', 'api/v1/auth/login');

    consumer
      .apply(
        rateLimit({
          windowMs: 15 * 60 * 1000, // 15 minutes
          max: 20, // 20 requests per window
          message: 'AI rate limit exceeded. Please try again later.',
        })
      )
      .forRoutes('api/v1/ai/*');
  }
}

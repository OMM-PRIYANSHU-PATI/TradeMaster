import { Module } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengesController, SkillsController } from './challenges.controller';
import { TradingModule } from '../trading/trading.module';

@Module({
  imports: [TradingModule],
  controllers: [ChallengesController, SkillsController],
  providers: [ChallengesService],
})
export class ChallengesModule {}

import { Module, Global } from '@nestjs/common';
import { RiskEngine } from './risk.engine';
import { RiskController } from './risk.controller';

@Global()
@Module({
  providers: [RiskEngine],
  controllers: [RiskController],
  exports: [RiskEngine],
})
export class RiskModule {}

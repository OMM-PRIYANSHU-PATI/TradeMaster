import { Module } from '@nestjs/common';
import { BrokerController } from './broker.controller';
import { BrokerService } from './broker.service';
import { EncryptionService } from './encryption.service';
import { MockBrokerProvider } from './providers/mock-broker.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [BrokerController],
  providers: [
    BrokerService,
    EncryptionService,
    {
      provide: 'BrokerProvider',
      useClass: MockBrokerProvider,
    },
  ],
  exports: [BrokerService, EncryptionService],
})
export class BrokerModule {}

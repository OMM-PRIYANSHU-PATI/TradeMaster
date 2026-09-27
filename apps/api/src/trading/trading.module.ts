import { Module, OnModuleInit } from '@nestjs/common';
import { FeeService } from './fee.service';
import { PnlService } from './pnl.service';
import { MarketDataService } from './market-data.service';
import { PaperAccountService } from './paper-account.service';
import { PaperExecutionService } from './paper-execution.service';
import { InstrumentsService } from './instruments.service';
import { OrderStateService } from './order-state.service';
import { TradingController } from './trading.controller';

@Module({
  providers: [
    FeeService,
    PnlService,
    MarketDataService,
    PaperAccountService,
    PaperExecutionService,
    InstrumentsService,
    OrderStateService
  ],
  controllers: [TradingController],
  exports: [PaperAccountService, PaperExecutionService]
})
export class TradingModule implements OnModuleInit {
  constructor(
    private marketDataService: MarketDataService,
    private paperExecutionService: PaperExecutionService
  ) {}

  onModuleInit() {
    this.marketDataService.setExecutionService(this.paperExecutionService);
  }
}

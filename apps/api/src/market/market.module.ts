import { Module } from '@nestjs/common';
import { MarketController } from './market.controller';
import { MarketDataService } from './market-data.service';
import { MockMarketProvider } from './providers/mock-market.provider';
import { WatchlistController } from './watchlist.controller';
import { WatchlistService } from './watchlist.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MarketController, WatchlistController],
  providers: [
    MarketDataService,
    WatchlistService,
    {
      provide: 'MarketDataProvider',
      useClass: MockMarketProvider,
    },
  ],
  exports: [MarketDataService, WatchlistService],
})
export class MarketModule {}

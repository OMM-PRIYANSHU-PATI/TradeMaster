import { Controller, Get, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { MarketDataService } from './market-data.service';
import { AuthGuard } from '../common/guards/auth.guard';

@UseGuards(AuthGuard)
@Controller('api/v1/market')
export class MarketController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Get('quotes/:instrumentId')
  async getQuote(@Param('instrumentId') instrumentId: string) {
    const result = await this.marketDataService.getQuote(instrumentId);
    
    // Explicit 404 for entirely unavailable data (no provider AND no cache)
    if (result.state === 'UNAVAILABLE' || !result.quote) {
      throw new HttpException({
        state: result.state,
        message: 'Market data is unavailable for this instrument.',
      }, HttpStatus.NOT_FOUND);
    }

    return {
      state: result.state,
      instrumentId: result.quote.instrumentId,
      symbol: result.quote.symbol,
      exchange: result.quote.exchange,
      // Serialize Decimal as exact string to avoid JS float precision loss and scientific notation
      price: result.quote.price.toFixed(),
      bid: result.quote.bid ? result.quote.bid.toFixed() : undefined,
      ask: result.quote.ask ? result.quote.ask.toFixed() : undefined,
      volume: result.quote.volume ? result.quote.volume.toFixed() : undefined,
      timestamp: result.quote.timestamp,
      source: result.quote.source,
    };
  }
}

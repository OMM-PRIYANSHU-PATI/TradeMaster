import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { prisma } from 'database';
import { MarketDataProvider, NormalizedQuote, MarketDataResponse, MarketDataState } from './interfaces/market-data';

@Injectable()
export class MarketDataService {
  // Configurable stale threshold - defaults to 5 minutes if not specified, 
  // explicitly marked as Implementation Policy (Not Source Defined)
  private readonly staleThresholdMs = parseInt(process.env.MARKET_DATA_STALE_THRESHOLD_MS || '300000', 10);

  constructor(
    @Inject('MarketDataProvider') private readonly provider: MarketDataProvider,
  ) {}

  async getQuote(instrumentId: string): Promise<MarketDataResponse> {
    const instrument = await prisma.instrument.findUnique({
      where: { id: instrumentId },
    });
    
    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }

    try {
      // 1. Attempt to fetch LIVE data from provider
      const quote = await this.provider.getQuote(instrument.symbol, instrument.id, instrument.exchange);
      this.validateQuote(quote);

      // Persist the valid quote without mutating any financial models directly.
      await prisma.marketPrice.create({
        data: {
          instrumentId: quote.instrumentId,
          price: quote.price,
          bid: quote.bid,
          ask: quote.ask,
          timestamp: quote.timestamp,
          source: quote.source,
        },
      });

      return { state: MarketDataState.LIVE, quote };
    } catch (error) {
      // 2. Provider failed (timeout/500/malformed) -> Fallback to Cache
      const latest = await prisma.marketPrice.findFirst({
        where: { instrumentId },
        orderBy: { timestamp: 'desc' },
      });

      if (latest) {
        const now = new Date();
        const ageMs = now.getTime() - latest.timestamp.getTime();
        
        // Return CACHED if within stale threshold, otherwise STALE
        const state = ageMs <= this.staleThresholdMs ? MarketDataState.CACHED : MarketDataState.STALE;
        
        return {
          state,
          quote: {
            instrumentId: latest.instrumentId,
            symbol: instrument.symbol,
            exchange: instrument.exchange,
            price: latest.price,
            bid: latest.bid || undefined,
            ask: latest.ask || undefined,
            timestamp: latest.timestamp,
            source: latest.source, // Keep the original source transparently
          }
        };
      }
      
      // 3. No live data AND no cache -> UNAVAILABLE
      // Never fabricate prices (e.g. price = 0)
      return { state: MarketDataState.UNAVAILABLE, quote: null };
    }
  }

  private validateQuote(quote: NormalizedQuote) {
    if (!quote.instrumentId || !quote.symbol) {
      throw new BadRequestException('Invalid quote: missing symbol/instrumentId');
    }
    
    // Exact decimal validation - no float conversion
    if (quote.price.lte(0)) {
      throw new BadRequestException('Invalid quote: price must be strictly positive');
    }
    if (quote.bid && quote.bid.lt(0)) {
      throw new BadRequestException('Invalid quote: bid must be non-negative');
    }
    if (quote.ask && quote.ask.lt(0)) {
      throw new BadRequestException('Invalid quote: ask must be non-negative');
    }
    if (quote.bid && quote.ask && quote.bid.gt(quote.ask)) {
      throw new BadRequestException('Invalid quote: bid cannot be greater than ask');
    }
    
    const now = new Date();
    // Validate timestamp is not impossibly malformed (e.g. > 1 min in future)
    if (quote.timestamp.getTime() > now.getTime() + 60000) {
      throw new BadRequestException('Invalid quote: timestamp is in the future');
    }
    // Live quote validation (stale check against configurable threshold)
    if (now.getTime() - quote.timestamp.getTime() > this.staleThresholdMs) {
      throw new BadRequestException('Invalid quote: received inherently stale data from provider');
    }
  }
}

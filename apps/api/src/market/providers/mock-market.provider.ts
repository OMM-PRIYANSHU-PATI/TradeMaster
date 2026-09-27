import { Injectable, BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import { MarketDataProvider, NormalizedQuote } from '../interfaces/market-data';
import { Prisma } from 'database';

@Injectable()
export class MockMarketProvider implements MarketDataProvider {
  private basePrices: Record<string, number> = {
    AAPL: 150.0,
    MSFT: 300.0,
    BTC: 50000.0,
    'TEST-AAPL': 100.0,
    'TEST-DECIMAL': 100.12345678, // Exact decimal required by spec
    'TEST-TINY': 0.00000001,
    'TEST-LARGE': 123456.78901234
  };

  async getQuote(symbol: string, instrumentId: string, exchange: string): Promise<NormalizedQuote> {
    if (symbol.startsWith('ERROR')) {
      throw new BadGatewayException('Provider 500');
    }
    if (symbol.startsWith('TIMEOUT')) {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simulate delay
      throw new RequestTimeoutException('Provider Timeout');
    }
    if (symbol.startsWith('MALFORMED')) {
      return {
        instrumentId,
        symbol,
        exchange,
        price: new Prisma.Decimal(-100), // Invalid
        timestamp: new Date(),
        source: 'MOCK_PROVIDER',
      };
    }

    const baseSymbol = symbol.split('-').slice(0, 2).join('-');
    const base = this.basePrices[baseSymbol] || 100.0;
    // Explicitly retain precision for TEST- symbols.
    const price = new Prisma.Decimal(base);

    return {
      instrumentId,
      symbol,
      exchange,
      price,
      bid: price.mul(new Prisma.Decimal(0.999)),
      ask: price.mul(new Prisma.Decimal(1.001)),
      volume: new Prisma.Decimal(1000),
      timestamp: new Date(),
      source: 'MOCK_PROVIDER',
    };
  }

  async getQuotes(requests: { symbol: string; instrumentId: string; exchange: string }[]): Promise<NormalizedQuote[]> {
    return Promise.all(requests.map(req => this.getQuote(req.symbol, req.instrumentId, req.exchange)));
  }
}

import { Prisma } from 'database';

export enum MarketDataState {
  LIVE = 'LIVE',
  CACHED = 'CACHED',
  STALE = 'STALE',
  UNAVAILABLE = 'UNAVAILABLE'
}

export interface NormalizedQuote {
  instrumentId: string;
  symbol: string;
  exchange: string;
  price: Prisma.Decimal;
  bid?: Prisma.Decimal;
  ask?: Prisma.Decimal;
  volume?: Prisma.Decimal;
  timestamp: Date;
  source: string;
}

export interface MarketDataResponse {
  state: MarketDataState;
  quote: NormalizedQuote | null;
}

export interface MarketDataProvider {
  getQuote(symbol: string, instrumentId: string, exchange: string): Promise<NormalizedQuote>;
  getQuotes(requests: { symbol: string; instrumentId: string; exchange: string }[]): Promise<NormalizedQuote[]>;
}

import { Prisma } from 'database';

export interface BrokerOrderDTO {
  clientOrderId: string;
  instrumentSymbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP';
  quantity: Prisma.Decimal;
  limitPrice?: Prisma.Decimal;
  stopPrice?: Prisma.Decimal;
}

export interface BrokerConnectionResult {
  externalAccountId: string;
  status: string;
  cashBalance: Prisma.Decimal;
  equityValue: Prisma.Decimal;
}

export interface BrokerOrderResult {
  externalOrderId: string;
  clientOrderId: string;
  status: string;
  filledQuantity: Prisma.Decimal;
  averageFillPrice?: Prisma.Decimal;
  errorMessage?: string;
  fills?: BrokerFillResult[];
}

export interface BrokerFillResult {
  externalFillId: string;
  quantity: Prisma.Decimal;
  price: Prisma.Decimal;
  fee: Prisma.Decimal;
  filledAt: Date;
}

export interface BrokerProvider {
  connect(credentials: Record<string, unknown>): Promise<BrokerConnectionResult>;
  placeOrder(order: BrokerOrderDTO, credentials?: Record<string, unknown>): Promise<BrokerOrderResult>;
  cancelOrder(externalOrderId: string, credentials?: Record<string, unknown>): Promise<BrokerOrderResult>;
  getOrderByClientId(clientOrderId: string, credentials?: Record<string, unknown>): Promise<BrokerOrderResult | null>;
  disconnect(credentials?: Record<string, unknown>): Promise<void>;
}

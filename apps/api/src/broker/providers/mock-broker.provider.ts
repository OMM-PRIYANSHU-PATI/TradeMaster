import { Injectable, BadGatewayException, RequestTimeoutException } from '@nestjs/common';
import { BrokerProvider, BrokerConnectionResult, BrokerOrderDTO, BrokerOrderResult } from '../broker.interfaces';
import { Prisma } from 'database';

@Injectable()
export class MockBrokerProvider implements BrokerProvider {
  // In-memory store for E2E testing to simulate external broker state
  private externalOrders: Map<string, BrokerOrderResult> = new Map();

  async connect(credentials: Record<string, unknown>): Promise<BrokerConnectionResult> {
    if (credentials.token === 'INVALID_TOKEN') {
      throw new BadGatewayException('Invalid credentials');
    }
    
    return {
      externalAccountId: 'MOCK-EXT-ACC-123',
      status: 'CONNECTED',
      cashBalance: new Prisma.Decimal(100000),
      equityValue: new Prisma.Decimal(100000),
    };
  }

  async placeOrder(order: BrokerOrderDTO, credentials?: Record<string, unknown>): Promise<BrokerOrderResult> {
    if (credentials?.token === 'INVALID_TOKEN') {
      throw new BadGatewayException('Unauthorized');
    }

    if (order.clientOrderId === 'TIMEOUT_ID') {
      // Simulate timeout but ACTUALLY place the order on the broker side,
      // so reconciliation will find it as FILLED.
      this.externalOrders.set(order.clientOrderId, {
        externalOrderId: 'EXT-' + order.clientOrderId,
        clientOrderId: order.clientOrderId,
        status: 'FILLED',
        filledQuantity: order.quantity,
        averageFillPrice: new Prisma.Decimal(150),
        fills: [
          {
            externalFillId: 'FILL-TIMEOUT-1',
            quantity: order.quantity,
            price: new Prisma.Decimal(150),
            fee: new Prisma.Decimal(3.0),
            filledAt: new Date(),
          }
        ]
      });
      await new Promise(res => setTimeout(res, 50));
      throw new RequestTimeoutException('Broker network timeout');
    }

    if (order.clientOrderId === 'TIMEOUT_REJECTED_ID') {
      this.externalOrders.set(order.clientOrderId, {
        externalOrderId: 'EXT-' + order.clientOrderId,
        clientOrderId: order.clientOrderId,
        status: 'REJECTED',
        filledQuantity: new Prisma.Decimal(0),
        errorMessage: 'Insufficient external margin',
      });
      throw new RequestTimeoutException('Broker network timeout');
    }

    if (order.clientOrderId === 'REJECT_ID') {
      const res: BrokerOrderResult = {
        externalOrderId: 'EXT-' + order.clientOrderId,
        clientOrderId: order.clientOrderId,
        status: 'REJECTED',
        filledQuantity: new Prisma.Decimal(0),
        errorMessage: 'Insufficient funds',
      };
      this.externalOrders.set(order.clientOrderId, res);
      return res;
    }

    if (order.clientOrderId === 'PARTIAL_FILL') {
      const res: BrokerOrderResult = {
        externalOrderId: 'EXT-' + order.clientOrderId,
        clientOrderId: order.clientOrderId,
        status: 'PARTIALLY_FILLED',
        filledQuantity: order.quantity.div(2),
        averageFillPrice: new Prisma.Decimal(150),
        fills: [
          {
            externalFillId: 'FILL-1',
            quantity: order.quantity.div(2),
            price: new Prisma.Decimal(150),
            fee: new Prisma.Decimal(1.5),
            filledAt: new Date(),
          }
        ]
      };
      this.externalOrders.set(order.clientOrderId, res);
      return res;
    }

    // Default full fill
    const res: BrokerOrderResult = {
      externalOrderId: 'EXT-' + order.clientOrderId,
      clientOrderId: order.clientOrderId,
      status: 'FILLED',
      filledQuantity: order.quantity,
      averageFillPrice: new Prisma.Decimal(150),
      fills: [
        {
          externalFillId: 'FILL-FULL',
          quantity: order.quantity,
          price: new Prisma.Decimal(150),
          fee: new Prisma.Decimal(3.0),
          filledAt: new Date(),
        }
      ]
    };
    this.externalOrders.set(order.clientOrderId, res);
    return res;
  }

  async getOrderByClientId(clientOrderId: string): Promise<BrokerOrderResult | null> {
    const order = this.externalOrders.get(clientOrderId);
    if (!order) return null;
    return order;
  }

  async cancelOrder(externalOrderId: string): Promise<BrokerOrderResult> {
    return {
      externalOrderId,
      clientOrderId: 'UNKNOWN',
      status: 'CANCELLED',
      filledQuantity: new Prisma.Decimal(0),
    };
  }

  async disconnect(): Promise<void> {
    // No-op
  }
}

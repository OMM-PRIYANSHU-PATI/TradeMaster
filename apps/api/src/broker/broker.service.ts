import { Injectable, Inject, NotFoundException, ForbiddenException, ConflictException, RequestTimeoutException } from '@nestjs/common';
import { prisma, BrokerConnection, BrokerAccount, BrokerOrder, Instrument, Prisma } from 'database';
import { BrokerProvider, BrokerOrderDTO } from './broker.interfaces';
import { EncryptionService } from './encryption.service';

@Injectable()
export class BrokerService {
  constructor(
    @Inject('BrokerProvider') private readonly provider: BrokerProvider,
    private readonly encryption: EncryptionService,
  ) {}

  async connectBroker(userId: string, token: string): Promise<BrokerConnection> {
    const result = await this.provider.connect({ token });
    const encryptedToken = this.encryption.encrypt(token);

    const connection = await prisma.brokerConnection.create({
      data: {
        userId,
        provider: 'MOCK_PROVIDER',
        externalAccountId: result.externalAccountId,
        status: result.status,
        encryptedAccessToken: encryptedToken,
        liveExecutionEnabled: false,
      }
    });

    await prisma.brokerAccount.create({
      data: {
        brokerConnectionId: connection.id,
        externalAccountId: result.externalAccountId,
        name: 'Primary Account',
        cashBalance: result.cashBalance,
        equityValue: result.equityValue,
      }
    });

    return connection;
  }

  async getConnections(userId: string): Promise<BrokerConnection[]> {
    return prisma.brokerConnection.findMany({
      where: { userId },
      include: { brokerAccounts: true }
    });
  }

  async enableLiveExecution(userId: string, connectionId: string): Promise<BrokerConnection> {
    const conn = await prisma.brokerConnection.findUnique({ where: { id: connectionId } });
    if (!conn || conn.userId !== userId) throw new NotFoundException('Connection not found');
    if (conn.status !== 'CONNECTED') throw new ForbiddenException('Cannot arm a disconnected/revoked connection');
    
    return prisma.brokerConnection.update({
      where: { id: connectionId },
      data: { liveExecutionEnabled: true }
    });
  }

  private async getDecryptedCredentials(connection: BrokerConnection): Promise<Record<string, unknown>> {
    if (!connection.encryptedAccessToken) return {};
    return { token: this.encryption.decrypt(connection.encryptedAccessToken) };
  }

  async placeOrder(userId: string, accountId: string, orderDto: BrokerOrderDTO): Promise<BrokerOrder> {
    const account = await prisma.brokerAccount.findUnique({
      where: { id: accountId },
      include: { brokerConnection: true }
    });

    if (!account || account.brokerConnection.userId !== userId) {
      throw new NotFoundException('Broker account not found');
    }

    if (!account.brokerConnection.liveExecutionEnabled) {
      throw new ForbiddenException('LIVE_DISABLED: Live execution is not armed for this connection.');
    }

    if (account.brokerConnection.status !== 'CONNECTED') {
      throw new ForbiddenException('Broker connection is not active.');
    }

    const instrument = await prisma.instrument.findFirst({ where: { symbol: orderDto.instrumentSymbol } });
    if (!instrument) {
      throw new NotFoundException('Instrument not found');
    }

    if (orderDto.quantity.lte(0)) {
      throw new ForbiddenException('Quantity must be strictly positive');
    }

    // IDEMPOTENCY CHECK
    const existing = await prisma.brokerOrder.findUnique({
      where: { clientOrderId: orderDto.clientOrderId },
      include: { fills: true }
    });

    if (existing) {
      // Must exactly match material parameters, otherwise Conflict
      if (
        existing.instrumentId !== instrument.id ||
        existing.side !== orderDto.side ||
        existing.type !== orderDto.type ||
        !new Prisma.Decimal(existing.quantity).equals(orderDto.quantity)
      ) {
        throw new ConflictException('Idempotency conflict: Material parameters differ for existing clientOrderId');
      }
      return existing;
    }

    const credentials = await this.getDecryptedCredentials(account.brokerConnection);

    try {
      const brokerResult = await this.provider.placeOrder(orderDto, credentials);
      
      const brokerOrder = await prisma.brokerOrder.create({
        data: {
          brokerAccountId: account.id,
          externalOrderId: brokerResult.externalOrderId,
          clientOrderId: orderDto.clientOrderId,
          instrumentId: instrument.id,
          side: orderDto.side,
          type: orderDto.type,
          status: brokerResult.status,
          quantity: orderDto.quantity,
          filledQuantity: brokerResult.filledQuantity,
          limitPrice: orderDto.limitPrice,
          stopPrice: orderDto.stopPrice,
          averageFillPrice: brokerResult.averageFillPrice,
          errorMessage: brokerResult.errorMessage,
        }
      });

      if (brokerResult.fills && brokerResult.fills.length > 0) {
        for (const fill of brokerResult.fills) {
          await prisma.brokerFill.create({
            data: {
              brokerOrderId: brokerOrder.id,
              externalFillId: fill.externalFillId,
              quantity: fill.quantity,
              price: fill.price,
              fee: fill.fee,
              filledAt: fill.filledAt,
            }
          });
        }
      }

      return prisma.brokerOrder.findUnique({
        where: { id: brokerOrder.id },
        include: { fills: true }
      }) as unknown as BrokerOrder;

    } catch (error) {
      if (error instanceof RequestTimeoutException || error.name === 'RequestTimeoutException') {
        // TIMEOUT SAFETY LOGIC
        return prisma.brokerOrder.create({
          data: {
            brokerAccountId: account.id,
            externalOrderId: 'PENDING_SYNC_' + orderDto.clientOrderId,
            clientOrderId: orderDto.clientOrderId,
            instrumentId: instrument.id,
            side: orderDto.side,
            type: orderDto.type,
            status: 'UNKNOWN',
            quantity: orderDto.quantity,
            errorMessage: 'Broker network timeout. Awaiting reconciliation.',
          }
        });
      }
      throw error;
    }
  }

  async reconcileOrder(userId: string, orderId: string): Promise<BrokerOrder> {
    const order = await prisma.brokerOrder.findUnique({
      where: { id: orderId },
      include: { brokerAccount: { include: { brokerConnection: true } } }
    });

    if (!order || order.brokerAccount.brokerConnection.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'UNKNOWN') {
      return order; // Already reconciled or resolved
    }

    const credentials = await this.getDecryptedCredentials(order.brokerAccount.brokerConnection);
    const externalState = await this.provider.getOrderByClientId(order.clientOrderId, credentials);

    if (!externalState) {
      return order;
    }

    const validTransitions: Record<string, string[]> = {
      'UNKNOWN': ['SUBMITTED', 'OPEN', 'PARTIALLY_FILLED', 'FILLED', 'REJECTED', 'CANCELLED'],
      'PENDING': ['SUBMITTED', 'REJECTED', 'CANCELLED'],
      'SUBMITTED': ['OPEN', 'REJECTED', 'CANCELLED', 'PARTIALLY_FILLED', 'FILLED'],
      'OPEN': ['PARTIALLY_FILLED', 'FILLED', 'CANCEL_PENDING', 'CANCELLED'],
      'PARTIALLY_FILLED': ['FILLED', 'CANCEL_PENDING', 'CANCELLED'],
      'CANCEL_PENDING': ['CANCELLED'],
      'FILLED': [], // Terminal
      'REJECTED': [], // Terminal
      'CANCELLED': [], // Terminal
    };

    if (order.status !== externalState.status && validTransitions[order.status] && !validTransitions[order.status].includes(externalState.status)) {
      throw new ConflictException(`Invalid state transition from ${order.status} to ${externalState.status}`);
    }

    let updatedOrder = await prisma.brokerOrder.update({
      where: { id: orderId },
      data: {
        status: externalState.status,
        externalOrderId: externalState.externalOrderId,
        filledQuantity: externalState.filledQuantity,
        averageFillPrice: externalState.averageFillPrice,
        errorMessage: externalState.errorMessage,
      }
    });

    if (externalState.fills) {
      for (const fill of externalState.fills) {
        // Upsert ensures duplicate fills don't crash or multiply financial state
        await prisma.brokerFill.upsert({
          where: {
            brokerOrderId_externalFillId: {
              brokerOrderId: order.id,
              externalFillId: fill.externalFillId,
            }
          },
          update: {},
          create: {
            brokerOrderId: order.id,
            externalFillId: fill.externalFillId,
            quantity: fill.quantity,
            price: fill.price,
            fee: fill.fee,
            filledAt: fill.filledAt,
          }
        });
      }
    }
    
    return prisma.brokerOrder.findUnique({
      where: { id: orderId },
      include: { fills: true }
    }) as unknown as BrokerOrder;
  }



  async disconnect(userId: string, connectionId: string): Promise<void> {
    const conn = await prisma.brokerConnection.findUnique({ where: { id: connectionId } });
    if (!conn || conn.userId !== userId) throw new NotFoundException('Connection not found');
    
    await prisma.brokerConnection.update({
      where: { id: connectionId },
      data: {
        status: 'DISCONNECTED',
        encryptedAccessToken: null,
        encryptedRefreshToken: null,
        liveExecutionEnabled: false,
        revokedAt: new Date(),
      }
    });

    // We do not have the token anymore, but provider might have session-less disconnects.
    await this.provider.disconnect();
  }
}

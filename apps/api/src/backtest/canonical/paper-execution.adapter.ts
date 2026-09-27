import { Injectable, BadRequestException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { OrderIntent } from './models';
import { PaperExecutionService } from '../../trading/paper-execution.service';
import { OrderStateService, OrderStatus } from '../../trading/order-state.service';

@Injectable()
export class PaperExecutionAdapter {
  constructor(
    private paperExecutionService: PaperExecutionService,
    private orderStateService: OrderStateService
  ) {}

  async executeIntent(
    intent: OrderIntent,
    sessionId: string,
    paperAccountId: string,
    instrumentId: string,
    executionPrice: Prisma.Decimal,
  ): Promise<void> {
    if (intent.side !== 'BUY' && intent.side !== 'SELL') return; // HOLD
    if (intent.quantity.lte(0)) throw new BadRequestException('Invalid quantity');

    return await prisma.$transaction(async (tx) => {
      // 1. Create PENDING Order
      const clientOrderId = 'v-sess-' + sessionId + '-' + Date.now();
      let order = await tx.order.create({
        data: {
          accountId: paperAccountId,
          instrumentId,
          clientOrderId,
          side: intent.side,
          type: 'MARKET',
          quantity: intent.quantity,
          status: 'PENDING',
        }
      });

      this.orderStateService.validateTransition(order.status as OrderStatus, 'OPEN');
      order = await tx.order.update({
        where: { id: order.id },
        data: { status: 'OPEN' }
      });

      // 2. Execute via existing paper execution logic
      await this.paperExecutionService.executeOrderInternal(tx, order, executionPrice);
    });
  }
}

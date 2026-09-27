import { Injectable, BadRequestException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { OrderIntent } from './models';
import { PaperExecutionService } from '../../trading/paper-execution.service';
import { OrderStateService, OrderStatus } from '../../trading/order-state.service';
import { RiskEngine } from '../../risk/risk.engine';

@Injectable()
export class PaperExecutionAdapter {
  constructor(
    private paperExecutionService: PaperExecutionService,
    private orderStateService: OrderStateService,
    private riskEngine: RiskEngine
  ) {}

  async executeIntent(
    intent: OrderIntent,
    sessionId: string,
    paperAccountId: string,
    instrumentId: string,
    executionPrice: Prisma.Decimal,
  ): Promise<void> {
    

    const decision = await this.riskEngine.evaluateIntent(
      intent,
      sessionId,
      paperAccountId,
      instrumentId,
      executionPrice
    );

    if (decision.status === 'REJECTED') {
      return;
    }

    let finalIntent = intent;
    if (decision.status === 'MODIFIED' && decision.modifiedIntent) {
      finalIntent = decision.modifiedIntent;
    }

    if (finalIntent.side !== 'BUY' && finalIntent.side !== 'SELL') return;
    if (finalIntent.quantity.lte(0)) return;

    return await prisma.$transaction(async (tx) => {
      // 1. Create PENDING Order
      const clientOrderId = 'v-sess-' + sessionId + '-' + finalIntent.timestamp.getTime();
      let order = await tx.order.create({
        data: {
          accountId: paperAccountId,
          instrumentId,
          clientOrderId,
          side: finalIntent.side,
          type: 'MARKET',
          quantity: finalIntent.quantity,
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

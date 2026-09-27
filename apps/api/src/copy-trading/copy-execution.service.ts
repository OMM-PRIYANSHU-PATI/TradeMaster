import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { prisma, Prisma } from 'database';
import { PaperExecutionService } from '../trading/paper-execution.service';
import { OrderType, OrderSide } from '../trading/dto/create-order.dto';

@Injectable()
export class CopyExecutionService {
  private readonly logger = new Logger(CopyExecutionService.name);

  constructor(private readonly paperExecutionService: PaperExecutionService) {}

  @OnEvent('paper-order.executed')
  async handlePaperOrderExecuted(orderPayload: Record<string, unknown>) {
    if (!orderPayload || !orderPayload.account || !orderPayload.instrument) return;

    const o = orderPayload as unknown as {
      id: string;
      side: string;
      type: string;
      filledQuantity: number | string;
      averageFillPrice: number | string;
      account: { userId: string };
      instrument: { id: string };
    };

    try {
      const activeConfigs = await prisma.copyConfiguration.findMany({
        where: {
          sourceUserId: o.account.userId,
          enabled: true,
          status: 'ACTIVE'
        }
      });
      if (activeConfigs.length === 0) return;

      // 1. Create a normalized CopyEvent
      const copyEvent = await prisma.copyEvent.upsert({
        where: { sourceOrderId: o.id },
        update: {},
        create: {
          sourceUserId: o.account.userId,
          sourceOrderId: o.id,
          instrumentId: o.instrument.id,
          side: o.side,
          type: o.type,
          quantity: new Prisma.Decimal(o.filledQuantity),
          price: new Prisma.Decimal(o.averageFillPrice),
          status: 'PROCESSING'
        }
      });

      for (const config of activeConfigs) {
        await this.processCopyTrade(copyEvent, config, o);
      }

      await prisma.copyEvent.update({
        where: { id: copyEvent.id },
        data: { status: 'COMPLETED', processedAt: new Date() }
      });
    } catch (error) {
      this.logger.error(`Failed to process copy event for order ${o.id}`, error);
    }
  }

  private async processCopyTrade(copyEvent: Record<string, unknown>, config: Record<string, unknown>, originalOrder: Record<string, unknown>) {
    try {
      const configAllocation = config.allocationPercent ? (config.allocationPercent as Prisma.Decimal).toNumber() / 100 : 1;
      const targetQuantity = new Prisma.Decimal(copyEvent.quantity as string | number).mul(configAllocation);
      
      const price = new Prisma.Decimal(copyEvent.price as string | number);
      const grossValue = targetQuantity.mul(price);
      if (config.maxExposure && grossValue.gt(config.maxExposure as string | number)) {
        throw new Error(`Max exposure limit exceeded for copy config ${config.id}`);
      }

      const existingTrade = await prisma.copyTrade.findUnique({
        where: {
          copyEventId_targetAccountId: {
            copyEventId: copyEvent.id as string,
            targetAccountId: config.targetAccountId as string
          }
        }
      });
      if (existingTrade) return;

      const res = await this.paperExecutionService.placeOrder(config.followerUserId as string, config.targetAccountId as string, {
        instrumentId: copyEvent.instrumentId as string,
        side: copyEvent.side as OrderSide,
        type: OrderType.MARKET,
        quantity: targetQuantity.toString(),
        clientOrderId: `copy_${copyEvent.id}_${config.targetAccountId}`
      });

      await prisma.copyTrade.create({
        data: {
          copyEventId: copyEvent.id as string,
          followerUserId: config.followerUserId as string,
          targetAccountId: config.targetAccountId as string,
          targetOrderId: res.order.id,
          status: 'SUCCESS',
          executedAt: new Date()
        }
      });

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      this.logger.warn(`Failed copy trade for follower ${config.followerUserId}: ${message}`);
      
      await prisma.copyTrade.create({
        data: {
          copyEventId: copyEvent.id as string,
          followerUserId: config.followerUserId as string,
          targetAccountId: config.targetAccountId as string,
          status: 'FAILED',
          errorMessage: message
        }
      });
    }
  }

}

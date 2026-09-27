import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { prisma, Prisma } from 'database';
import { FeeService } from './fee.service';
import { PnlService } from './pnl.service';
import { MarketDataService } from './market-data.service';
import { OrderStateService, OrderStatus } from './order-state.service';
import { CreateOrderDto, OrderType, OrderSide } from './dto/create-order.dto';
import * as crypto from 'crypto';

@Injectable()
export class PaperExecutionService {
  constructor(
    private feeService: FeeService,
    private pnlService: PnlService,
    private marketDataService: MarketDataService,
    private orderStateService: OrderStateService,
    private eventEmitter: EventEmitter2
  ) {}

  async getOrders(userId: string, accountId: string) {
    const account = await prisma.paperTradingAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('Account not found');
    return prisma.order.findMany({ where: { accountId }, orderBy: { submittedAt: 'desc' } });
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await prisma.order.findFirst({
      where: { id: orderId, account: { userId } },
      include: { fills: true }
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.getOrderById(userId, orderId);
    
    this.orderStateService.validateTransition(order.status as OrderStatus, 'CANCELLED');

    return prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() }
    });
  }

  async placeOrder(userId: string, accountId: string, dto: CreateOrderDto) {
    let quantity;
    try {
      quantity = new Prisma.Decimal(dto.quantity);
    } catch {
      throw new BadRequestException('Invalid quantity');
    }
    if (quantity.lte(0) || !quantity.isFinite()) throw new BadRequestException('Invalid quantity');

    if (dto.type === OrderType.LIMIT) {
      if (dto.limitPrice === undefined || dto.limitPrice === null) throw new BadRequestException('LIMIT order requires a limitPrice');
      let limit;
      try {
        limit = new Prisma.Decimal(dto.limitPrice);
      } catch {
        throw new BadRequestException('Invalid limitPrice');
      }
      if (limit.lte(0) || !limit.isFinite()) throw new BadRequestException('Invalid limitPrice');
    } else if (dto.type === OrderType.MARKET && dto.limitPrice !== undefined) {
      throw new BadRequestException('MARKET order cannot have a limitPrice');
    }

    const account = await prisma.paperTradingAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('Account not found');

    const instrument = await prisma.instrument.findUnique({ where: { id: dto.instrumentId } });
    if (!instrument) throw new NotFoundException('Instrument not found');

    const clientOrderId = dto.clientOrderId || crypto.randomUUID();

    const existingOrder = await prisma.order.findFirst({ where: { accountId, clientOrderId } });
    if (existingOrder) throw new BadRequestException('Duplicate clientOrderId');

    return await prisma.$transaction(async (tx) => {
      let order = await tx.order.create({
        data: {
          accountId,
          instrumentId: dto.instrumentId,
          clientOrderId,
          side: dto.side,
          type: dto.type,
          quantity,
          limitPrice: dto.limitPrice ? new Prisma.Decimal(dto.limitPrice) : null,
          status: 'PENDING',
        }
      });

      this.orderStateService.validateTransition(order.status as OrderStatus, 'OPEN');
      order = await tx.order.update({
        where: { id: order.id },
        data: { status: 'OPEN' }
      });

      if (dto.type === OrderType.MARKET) {
        const marketPriceRecord = await this.marketDataService.getLatestPrice(dto.instrumentId);
        return this.executeOrderInternal(tx, order, marketPriceRecord.price);
      }

      return { order };
    });
  }

  async evaluateLimitOrders(instrumentId: string, newPrice: Prisma.Decimal) {
    const openOrders = await prisma.order.findMany({
      where: {
        instrumentId,
        type: 'LIMIT',
        status: 'OPEN'
      }
    });

    for (const order of openOrders) {
      if (!order.limitPrice) continue;
      
      let shouldExecute = false;
      if (order.side === 'BUY' && newPrice.lte(order.limitPrice)) {
        shouldExecute = true;
      } else if (order.side === 'SELL' && newPrice.gte(order.limitPrice)) {
        shouldExecute = true;
      }

      if (shouldExecute) {
        await prisma.$transaction(async (tx) => {
          await this.executeOrderInternal(tx, order, newPrice);
        }).catch(err => {
          console.error('Failed to execute limit order', order.id, err);
        });
      }
    }
  }

  public async executeOrderInternal(tx: Prisma.TransactionClient, order: any, executionPrice: Prisma.Decimal) {
    const quantity = new Prisma.Decimal(order.quantity);
    const grossValue = quantity.mul(executionPrice);
    const fee = this.feeService.calculateFee(order.side, quantity, executionPrice);
    
    const account = await tx.paperTradingAccount.findUnique({ where: { id: order.accountId } });
    if (!account) throw new NotFoundException('Account not found');

    let position = await tx.position.findUnique({
      where: { accountId_instrumentId: { accountId: order.accountId, instrumentId: order.instrumentId } }
    });

    const instrument = await tx.instrument.findUnique({ where: { id: order.instrumentId } });

    if (order.side === 'BUY') {
      const totalCost = grossValue.add(fee);
      if (account.cashBalance.lt(totalCost)) {
        throw new BadRequestException('Insufficient cash');
      }

      const newCash = account.cashBalance.sub(totalCost);
      await tx.paperTradingAccount.update({ where: { id: account.id }, data: { cashBalance: newCash } });

      await tx.paperTradingLedger.create({
        data: {
          accountId: account.id, type: 'BUY_EXECUTION', amount: grossValue.neg(), referenceType: 'ORDER', referenceId: order.id, description: `Buy ${quantity.toString()} ${instrument?.symbol}`    
        }
      });
      await tx.paperTradingLedger.create({
        data: {
          accountId: account.id, type: 'FEE', amount: fee.neg(), referenceType: 'ORDER', referenceId: order.id, description: `Fee for Order ${order.id}`    
        }
      });

      let newQuantity = quantity;
      let newAvgPrice = executionPrice;

      if (position) {
        newAvgPrice = this.pnlService.calculateNewAverageEntry(position.quantity, position.averageEntryPrice, quantity, executionPrice);
        newQuantity = position.quantity.add(quantity);
        position = await tx.position.update({
          where: { id: position.id },
          data: { quantity: newQuantity, averageEntryPrice: newAvgPrice }
        });
      } else {
        position = await tx.position.create({
          data: { accountId: account.id, instrumentId: order.instrumentId, quantity, averageEntryPrice: executionPrice }
        });
      }
    } else {
      if (!position || position.quantity.lt(quantity)) {
        throw new BadRequestException('Insufficient position');
      }

      const netProceeds = grossValue.sub(fee);
      const newCash = account.cashBalance.add(netProceeds);
      
      await tx.paperTradingAccount.update({ where: { id: account.id }, data: { cashBalance: newCash } });

      await tx.paperTradingLedger.create({
        data: { accountId: account.id, type: 'SELL_EXECUTION', amount: grossValue, referenceType: 'ORDER', referenceId: order.id, description: `Sell ${quantity.toString()} ${instrument?.symbol}` }
      });
      await tx.paperTradingLedger.create({
        data: { accountId: account.id, type: 'FEE', amount: fee.neg(), referenceType: 'ORDER', referenceId: order.id, description: `Fee for Order ${order.id}` }
      });

      const realizedPnl = this.pnlService.calculateRealizedPnl(quantity, position.averageEntryPrice, executionPrice);
      const newRealizedPnl = position.realizedPnl.add(realizedPnl);
      const newQuantity = position.quantity.sub(quantity);

      position = await tx.position.update({
        where: { id: position.id },
        data: { quantity: newQuantity, realizedPnl: newRealizedPnl }
      });
    }

    const fill = await tx.orderFill.create({
      data: { orderId: order.id, quantity, price: executionPrice, fee }
    });

    this.orderStateService.validateTransition(order.status as OrderStatus, 'FILLED');
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: 'FILLED', filledQuantity: quantity, averageFillPrice: executionPrice },
      include: { account: true, instrument: true }
    });

    const updatedAccount = await tx.paperTradingAccount.findUnique({ where: { id: account.id } });
    
    // Fire the event (note: it fires inside the promise map, but that's okay, event listener can handle it asynchronously)
    this.eventEmitter.emit('paper-order.executed', updatedOrder);

    return { order: updatedOrder, fill, position, accountCash: updatedAccount!.cashBalance };
  }
}

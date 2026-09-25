import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { PaperExecutionService } from './paper-execution.service';

@Injectable()
export class MarketDataService {
  private executionService: PaperExecutionService;

  setExecutionService(service: PaperExecutionService) {
    this.executionService = service;
  }

  async getLatestPrice(instrumentId: string) {
    const price = await prisma.marketPrice.findFirst({
      where: { instrumentId },
      orderBy: { timestamp: 'desc' }
    });
    if (!price) throw new NotFoundException('Market price not found');
    return price;
  }

  async setPrice(instrumentId: string, price: string) {
    const newPrice = new Prisma.Decimal(price);
    const created = await prisma.marketPrice.create({
      data: { instrumentId, price: newPrice, source: 'PAPER' }
    });

    if (this.executionService) {
      await this.executionService.evaluateLimitOrders(instrumentId, newPrice);
    }
    return created;
  }
}

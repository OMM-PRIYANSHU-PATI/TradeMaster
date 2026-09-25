import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { PnlService } from './pnl.service';
import { MarketDataService } from './market-data.service';

@Injectable()
export class PaperAccountService {
  constructor(
    private readonly pnlService: PnlService,
    private readonly marketDataService: MarketDataService
  ) {}

  async createAccount(userId: string, options?: { accountName?: string, initialBalance?: number }) {
    const existing = await prisma.paperTradingAccount.findFirst({
      where: { userId, accountName: options?.accountName || 'Default Paper Account' }
    });
    if (existing) throw new ConflictException('Paper account already exists');

    const initialCash = new Prisma.Decimal(options?.initialBalance ? options.initialBalance.toString() : '100000.00');

    return await prisma.$transaction(async (tx) => {
      const account = await tx.paperTradingAccount.create({
        data: {
          userId,
          accountName: options?.accountName || 'Default Paper Account',
          baseCurrency: 'USD',
          initialBalance: initialCash,
          cashBalance: initialCash,
        }
      });

      await tx.paperTradingLedger.create({
        data: {
          accountId: account.id,
          type: 'ACCOUNT_INITIALIZED',
          amount: initialCash,
          description: 'Initial virtual cash funding'
        }
      });

      return account;
    });
  }

  async getAccounts(userId: string) {
    return prisma.paperTradingAccount.findMany({ where: { userId } });
  }

  async getAccountById(userId: string, accountId: string) {
    const account = await prisma.paperTradingAccount.findFirst({ where: { id: accountId, userId } });
    if (!account) throw new NotFoundException('Account not found');
    return account;
  }
  
  async getLedger(userId: string, accountId: string) {
    await this.getAccountById(userId, accountId);
    return prisma.paperTradingLedger.findMany({
      where: { accountId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getPositions(userId: string, accountId: string) {
    await this.getAccountById(userId, accountId);
    return prisma.position.findMany({
      where: { accountId },
      include: { instrument: true }
    });
  }

  async getPortfolio(userId: string, accountId: string) {
    const account = await this.getAccountById(userId, accountId);
    const positions = await prisma.position.findMany({
      where: { accountId },
      include: { instrument: true }
    });

    let totalPositionValue = new Prisma.Decimal(0);
    let totalUnrealizedPnl = new Prisma.Decimal(0);
    let totalGrossRealizedPnl = new Prisma.Decimal(0);

    const positionsWithPnl = await Promise.all(positions.map(async (pos) => {
      const currentPrice = await this.marketDataService.getLatestPrice(pos.instrumentId);
      const pnl = this.pnlService.calculatePnl(pos.quantity, pos.averageEntryPrice, currentPrice.price);
      
      totalPositionValue = totalPositionValue.add(pnl.marketValue);
      totalUnrealizedPnl = totalUnrealizedPnl.add(pnl.unrealizedPnl);
      totalGrossRealizedPnl = totalGrossRealizedPnl.add(pos.realizedPnl);

      return {
        ...pos,
        marketValue: pnl.marketValue,
        unrealizedPnl: pnl.unrealizedPnl
      };
    }));

    const totalPortfolioValue = account.cashBalance.add(totalPositionValue);
    const netPnl = totalPortfolioValue.sub(account.initialBalance);

    // Sum fees
    const feeRecords = await prisma.paperTradingLedger.findMany({ where: { accountId, type: 'FEE' } });
    const totalFees = feeRecords.reduce((sum, record) => sum.add(record.amount), new Prisma.Decimal(0));
    
    // totalFees is already negative in the ledger, so grossRealizedPnl + totalFees is net realized.
    const realizedTradingPnl = totalGrossRealizedPnl.add(totalFees);

    return {
      accountId: account.id,
      initialBalance: account.initialBalance,
      cashBalance: account.cashBalance,
      totalPositionValue,
      totalPortfolioValue,
      grossRealizedPnl: totalGrossRealizedPnl,
      realizedTradingPnl,
      totalFees,
      unrealizedPnl: totalUnrealizedPnl,
      netPnl,
      positions: positionsWithPnl
    };
  }
}

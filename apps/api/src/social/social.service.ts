import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { prisma } from 'database';

@Injectable()
export class SocialService {
  async shareStrategy(userId: string, strategyId: string, content: string) {
    const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
    if (!strategy || strategy.userId !== userId) throw new NotFoundException('Strategy not found');
    
    // Make public
    await prisma.strategy.update({ where: { id: strategyId }, data: { isPublic: true } });
    
    return prisma.socialPost.create({
      data: {
        userId,
        type: 'STRATEGY',
        strategyId,
        content
      }
    });
  }

  async shareBacktest(userId: string, backtestId: string, content: string) {
    const bt = await prisma.backtestRun.findUnique({ where: { id: backtestId } });
    if (!bt || bt.userId !== userId) throw new NotFoundException('Backtest not found');
    
    return prisma.socialPost.create({
      data: {
        userId,
        type: 'BACKTEST',
        backtestId,
        content
      }
    });
  }

  async shareVirtualSession(userId: string, virtualSessionId: string, content: string) {
    const vt = await prisma.virtualStrategySession.findUnique({ where: { id: virtualSessionId } });
    if (!vt || vt.userId !== userId) throw new NotFoundException('Virtual Session not found');
    
    return prisma.socialPost.create({
      data: {
        userId,
        type: 'VIRTUAL',
        virtualSessionId,
        content
      }
    });
  }

  async getHomeFeed(): Promise<any> {
    return prisma.socialPost.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: {
          select: { id: true, email: true }
        },
        strategy: { select: { id: true, name: true, type: true, description: true } },
        backtest: { include: { metrics: true } },
        virtualSession: true
      }
    });
  }
}

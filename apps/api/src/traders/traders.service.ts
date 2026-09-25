import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma } from 'database';

@Injectable()
export class TradersService {
  async searchTraders(query: Record<string, string>) {
    const { search, experienceLevel, riskPreference, market, sortBy, page = '1', limit = '20' } = query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where: Record<string, unknown> = { isPublic: true };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (experienceLevel) where.experienceLevel = experienceLevel;
    if (riskPreference) where.riskPreference = riskPreference;
    if (market) where.marketsTraded = { has: market };

    let orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' };
    if (sortBy === 'newest') orderBy = { createdAt: 'desc' };
    else if (sortBy === 'oldest') orderBy = { createdAt: 'asc' };
    else if (sortBy === 'alphabetical') orderBy = { firstName: 'asc' };

    const profiles = await prisma.profile.findMany({
      where,
      orderBy,
      skip,
      take,
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        experienceLevel: true,
        riskPreference: true,
        marketsTraded: true,
        isVerified: true,
      }
    });

    const total = await prisma.profile.count({ where });

    return { data: profiles, total, page: parseInt(page as string, 10), limit: take };
  }

  async getTraderProfile(id: string) {
    const profile = await prisma.profile.findFirst({
      where: { userId: id, isPublic: true },
      select: {
        userId: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        bio: true,
        experienceLevel: true,
        riskPreference: true,
        marketsTraded: true,
        isVerified: true,
      }
    });

    if (!profile) throw new NotFoundException('Trader profile not found');

    // Fetch public stats if available
    const backtestRuns = await prisma.backtestRun.findMany({
      where: { userId: id, status: 'COMPLETED' },
      include: { metrics: true }
    });

    return { ...profile, publicBacktests: backtestRuns.length };
  }

  async getTraderStrategies(id: string) {
    const profile = await prisma.profile.findFirst({ where: { userId: id, isPublic: true } });
    if (!profile) throw new NotFoundException('Trader profile not found');

    const strategies = await prisma.strategy.findMany({
      where: { userId: id, status: 'ACTIVE' },
      select: {
        id: true,
        name: true,
        description: true,
        type: true,
        createdAt: true,
      }
    });

    return strategies;
  }

  async getSavedTraders(userId: string) {
    const saved = await prisma.savedTrader.findMany({
      where: { userId },
      include: {
        savedUser: {
          include: { profile: true }
        }
      }
    });

    return saved.map(s => ({
      id: s.id,
      savedUserId: s.savedUserId,
      createdAt: s.createdAt,
      profile: {
        firstName: s.savedUser.profile?.firstName,
        lastName: s.savedUser.profile?.lastName,
        avatarUrl: s.savedUser.profile?.avatarUrl,
        isVerified: s.savedUser.profile?.isVerified,
      }
    }));
  }

  async saveTrader(userId: string, targetId: string) {
    if (userId === targetId) throw new BadRequestException('Cannot save yourself');
    const targetProfile = await prisma.profile.findFirst({ where: { userId: targetId, isPublic: true } });
    if (!targetProfile) throw new NotFoundException('Target trader not found');

    try {
      const saved = await prisma.savedTrader.create({
        data: { userId, savedUserId: targetId }
      });
      return saved;
    } catch (e: unknown) {
      if (typeof e === 'object' && e !== null && 'code' in e && (e as { code: string }).code === 'P2002') {
        throw new BadRequestException('Trader already saved');
      }
      throw e;
    }
  }

  async unsaveTrader(userId: string, targetId: string) {
    const record = await prisma.savedTrader.findUnique({
      where: { userId_savedUserId: { userId, savedUserId: targetId } }
    });

    if (!record) throw new NotFoundException('Saved trader not found');

    await prisma.savedTrader.delete({ where: { id: record.id } });
    return { success: true };
  }
}

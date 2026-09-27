import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { prisma, Watchlist, WatchlistItem, Instrument } from 'database';

export type WatchlistWithItems = Watchlist & {
  items: (WatchlistItem & { instrument: Instrument })[];
};

@Injectable()
export class WatchlistService {
  async getWatchlists(userId: string): Promise<WatchlistWithItems[]> {
    return prisma.watchlist.findMany({
      where: { userId },
      include: {
        items: {
          include: { instrument: true }
        }
      }
    });
  }

  async getWatchlist(userId: string, watchlistId: string): Promise<WatchlistWithItems> {
    const w = await prisma.watchlist.findUnique({
      where: { id: watchlistId },
      include: {
        items: {
          include: { instrument: true }
        }
      }
    });
    if (!w) throw new NotFoundException('Watchlist not found');
    if (w.userId !== userId) throw new ForbiddenException('Not your watchlist');
    return w;
  }

  async createWatchlist(userId: string, name: string): Promise<Watchlist> {
    if (!name) throw new BadRequestException('Name is required');
    return prisma.watchlist.create({
      data: { userId, name }
    });
  }

  async updateWatchlist(userId: string, watchlistId: string, name: string): Promise<Watchlist> {
    if (!name) throw new BadRequestException('Name is required');
    const w = await prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!w) throw new NotFoundException('Watchlist not found');
    if (w.userId !== userId) throw new ForbiddenException('Not your watchlist');

    return prisma.watchlist.update({
      where: { id: watchlistId },
      data: { name }
    });
  }

  async deleteWatchlist(userId: string, watchlistId: string): Promise<void> {
    const w = await prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!w) throw new NotFoundException('Watchlist not found');
    if (w.userId !== userId) throw new ForbiddenException('Not your watchlist');

    await prisma.watchlist.delete({ where: { id: watchlistId } });
  }

  async addInstrument(userId: string, watchlistId: string, instrumentId: string): Promise<WatchlistItem> {
    const w = await prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!w) throw new NotFoundException('Watchlist not found');
    if (w.userId !== userId) throw new ForbiddenException('Not your watchlist');

    const i = await prisma.instrument.findUnique({ where: { id: instrumentId } });
    if (!i) throw new NotFoundException('Instrument not found');

    // Duplicate prevention
    const existing = await prisma.watchlistItem.findUnique({
      where: { watchlistId_instrumentId: { watchlistId, instrumentId } }
    });
    if (existing) throw new BadRequestException('Instrument already in watchlist');

    return prisma.watchlistItem.create({
      data: { watchlistId, instrumentId }
    });
  }

  async removeInstrument(userId: string, watchlistId: string, instrumentId: string): Promise<void> {
    const w = await prisma.watchlist.findUnique({ where: { id: watchlistId } });
    if (!w) throw new NotFoundException('Watchlist not found');
    if (w.userId !== userId) throw new ForbiddenException('Not your watchlist');

    const item = await prisma.watchlistItem.findUnique({
      where: { watchlistId_instrumentId: { watchlistId, instrumentId } }
    });
    if (!item) throw new NotFoundException('Instrument not in watchlist');

    await prisma.watchlistItem.delete({
      where: { id: item.id }
    });
  }
}

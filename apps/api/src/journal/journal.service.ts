import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { prisma } from 'database';
import { CreateJournalDto } from './dto/create-journal.dto';
import { UpdateJournalDto } from './dto/update-journal.dto';

@Injectable()
export class JournalService {
  async create(userId: string, createJournalDto: CreateJournalDto) {
    const { tags, attachments, strategyId, orderId, positionId, ...data } = createJournalDto;

    // Validate relationships ownership
    if (strategyId) {
      const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
      if (!strategy || strategy.userId !== userId) {
        throw new ForbiddenException('Strategy not found or not owned by user');
      }
    }
    
    if (orderId) {
      const order = await prisma.order.findUnique({ 
        where: { id: orderId },
        include: { account: true }
      });
      if (!order || order.account.userId !== userId) {
        throw new ForbiddenException('Order not found or not owned by user');
      }
    }

    if (positionId) {
      const position = await prisma.position.findUnique({ 
        where: { id: positionId },
        include: { account: true }
      });
      if (!position || position.account.userId !== userId) {
        throw new ForbiddenException('Position not found or not owned by user');
      }
    }

    const journalEntry = await prisma.journalEntry.create({
      data: {
        ...data,
        userId,
        strategyId,
        orderId,
        positionId,
        tags: {
          create: tags?.map(name => ({ name, userId })) || []
        },
        attachments: {
          create: attachments?.map(fileUrl => ({ fileUrl })) || []
        }
      },
      include: {
        tags: true,
        attachments: true
      }
    });

    return journalEntry;
  }

  async findAll(userId: string, filters: Record<string, string | string[]> = {}) {
    const where: Record<string, unknown> = { userId };
    
    if (filters.reviewType) where.reviewType = filters.reviewType as string;
    if (filters.strategyId) where.strategyId = filters.strategyId as string;
    
    if (filters.tags) {
      const tagArray = Array.isArray(filters.tags) ? filters.tags : [filters.tags];
      where.tags = { some: { name: { in: tagArray } } };
    }

    const limit = filters.limit ? parseInt(filters.limit as string, 10) : 50;
    const offset = filters.offset ? parseInt(filters.offset as string, 10) : 0;

    return prisma.journalEntry.findMany({
      where,
      include: {
        tags: true,
        attachments: true
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset
    });
  }

  async findOne(userId: string, id: string) {
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: {
        tags: true,
        attachments: true
      }
    });

    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.userId !== userId) throw new ForbiddenException('Not authorized');

    return entry;
  }

  async update(userId: string, id: string, updateJournalDto: UpdateJournalDto) {
    const entry = await this.findOne(userId, id); // validates ownership

    const { tags, attachments, strategyId, orderId, positionId, ...data } = updateJournalDto;

    // Validate ownership of updated relationships
    if (strategyId && strategyId !== entry.strategyId) {
      const strategy = await prisma.strategy.findUnique({ where: { id: strategyId } });
      if (!strategy || strategy.userId !== userId) throw new ForbiddenException('Strategy not found or not owned by user');
    }
    
    if (orderId && orderId !== entry.orderId) {
      const order = await prisma.order.findUnique({ where: { id: orderId }, include: { account: true } });
      if (!order || order.account.userId !== userId) throw new ForbiddenException('Order not found or not owned by user');
    }

    if (positionId && positionId !== entry.positionId) {
      const position = await prisma.position.findUnique({ where: { id: positionId }, include: { account: true } });
      if (!position || position.account.userId !== userId) throw new ForbiddenException('Position not found or not owned by user');
    }

    return prisma.journalEntry.update({
      where: { id },
      data: {
        ...data,
        strategyId: strategyId !== undefined ? strategyId : undefined,
        orderId: orderId !== undefined ? orderId : undefined,
        positionId: positionId !== undefined ? positionId : undefined,
        // Manage tags: delete all existing for this entry, recreate new ones
        ...(tags !== undefined && {
          tags: {
            deleteMany: {},
            create: tags.map(name => ({ name, userId }))
          }
        }),
        // Manage attachments: delete all existing, recreate
        ...(attachments !== undefined && {
          attachments: {
            deleteMany: {},
            create: attachments.map(fileUrl => ({ fileUrl }))
          }
        })
      },
      include: {
        tags: true,
        attachments: true
      }
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id); // validates ownership

    await prisma.journalEntry.delete({
      where: { id }
    });

    return { success: true };
  }
}

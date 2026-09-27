import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma } from 'database';

@Injectable()
export class FollowService {
  async followTrader(followerUserId: string, followedUserId: string) {
    if (followerUserId === followedUserId) {
      throw new BadRequestException('Cannot follow yourself');
    }

    const targetUser = await prisma.user.findUnique({ where: { id: followedUserId } });
    if (!targetUser) throw new NotFoundException('Trader not found');

    const existing = await prisma.follow.findUnique({
      where: { followerUserId_followedUserId: { followerUserId, followedUserId } },
    });

    if (existing) {
      return existing; // idempotent
    }

    try {
      return await prisma.follow.create({
        data: { followerUserId, followedUserId },
      });
    } catch {
      throw new ConflictException('Failed to follow trader');
    }
  }

  async unfollowTrader(followerUserId: string, followedUserId: string) {
    const existing = await prisma.follow.findUnique({
      where: { followerUserId_followedUserId: { followerUserId, followedUserId } },
    });

    if (!existing) return { success: true }; // Idempotent

    await prisma.follow.delete({
      where: { id: existing.id },
    });

    return { success: true };
  }

  async getFollowers(userId: string) {
    return prisma.follow.findMany({
      where: { followedUserId: userId },
      include: { follower: { select: { id: true, email: true } } },
    });
  }

  async getFollowing(userId: string) {
    return prisma.follow.findMany({
      where: { followerUserId: userId },
      include: { followed: { select: { id: true, email: true } } },
    });
  }
}

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { prisma, Prisma, Challenge, Achievement } from 'database';
import { CreateChallengeDto } from './dto/challenge.dto';
import { PaperAccountService } from '../trading/paper-account.service';

@Injectable()
export class ChallengesService {
  constructor(private paperService: PaperAccountService) {}

  async listPublished(): Promise<Challenge[]> {
    return prisma.challenge.findMany({
      where: { status: 'PUBLISHED' },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getChallenge(id: string): Promise<Challenge | null> {
    const c = await prisma.challenge.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Challenge not found');
    return c;
  }

  async createChallenge(dto: CreateChallengeDto): Promise<Challenge> {
    return prisma.challenge.create({
      data: {
        title: dto.title,
        description: dto.description,
        startingCapital: new Prisma.Decimal(dto.startingCapital),
        targetReturnPercent: new Prisma.Decimal(dto.targetReturnPercent),
        maxDrawdownPercent: new Prisma.Decimal(dto.maxDrawdownPercent),
        durationDays: dto.durationDays,
        status: 'PUBLISHED',
      },
    });
  }

  async joinChallenge(userId: string, challengeId: string) {
    const challenge = await this.getChallenge(challengeId);
    if (!challenge || challenge.status !== 'PUBLISHED') {
      throw new BadRequestException('Challenge is not available');
    }

    const existing = await prisma.challengeParticipant.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
    });
    if (existing) {
      throw new BadRequestException('Already joined this challenge');
    }

    // Attempt to isolate account logic and participation in an idempotent way
    const account = await this.paperService.createAccount(userId, {
      accountName: `Challenge: ${challenge.title}`,
      initialBalance: Number(challenge.startingCapital),
    });

    try {
      return await prisma.challengeParticipant.create({
        data: {
          userId,
          challengeId,
          accountId: account.id,
        },
      });
    } catch (e) {
      throw new BadRequestException('Already joined this challenge');
    }
  }

  async getParticipation(userId: string, challengeId: string) {
    const p = await prisma.challengeParticipant.findUnique({
      where: { userId_challengeId: { userId, challengeId } },
      include: { challenge: true, account: true },
    });
    if (!p) throw new NotFoundException('Not participating in this challenge');
    return p;
  }

  async checkProgress(userId: string, challengeId: string) {
    const p = await this.getParticipation(userId, challengeId);
    
    // Authoritative source of truth for P&L
    const portfolio = await this.paperService.getPortfolio(userId, p.accountId);

    const targetReturn = p.challenge.targetReturnPercent;
    const initial = p.challenge.startingCapital;
    const totalEquity = portfolio.totalPortfolioValue; 
    
    const returnPct = totalEquity.minus(initial).div(initial).mul(100);
    
    let newStatus = p.status;
    let achievements: Achievement[] = [];
    if (p.status === 'ACTIVE') {
      if (returnPct.gte(targetReturn)) {
        newStatus = 'COMPLETED';
        await prisma.challengeParticipant.update({
          where: { id: p.id },
          data: { status: 'COMPLETED', completedAt: new Date() },
        });

        // Award achievement idempotently
        const existing = await prisma.achievement.findFirst({
          where: { userId, type: 'CHALLENGE_COMPLETED_' + p.challengeId }
        });
        
        if (!existing) {
          const ach = await prisma.achievement.create({
            data: {
              userId,
              type: 'CHALLENGE_COMPLETED_' + p.challengeId,
              title: `Completed: ${p.challenge.title}`,
              description: `Target return of ${targetReturn.toString()}% achieved using authoritative financial engine!`,
            }
          });
          achievements.push(ach);
        }
      }
    }

    return {
      status: newStatus,
      currentReturn: returnPct.toNumber(),
      targetReturn: targetReturn.toNumber(),
      achievements
    };
  }

  async getLeaderboard(challengeId: string) {
    const participants = await prisma.challengeParticipant.findMany({
      where: { challengeId, status: 'COMPLETED' },
      include: { user: { include: { profile: true } }, account: true },
      orderBy: { completedAt: 'asc' },
    });
    
    // Note: ranking purely by completion timestamp due to ambiguity in source docs.
    return participants.map((p, idx) => ({
      userId: p.userId,
      firstName: p.user.profile?.firstName || "Unknown",
      avatarUrl: p.user.profile?.avatarUrl || null,
      status: p.status,
      joinedAt: p.joinedAt,
      completedAt: p.completedAt,
    }));
  }

  async getUserAchievements(userId: string): Promise<Achievement[]> {
    return prisma.achievement.findMany({
      where: { userId },
      orderBy: { earnedAt: 'desc' },
    });
  }
}

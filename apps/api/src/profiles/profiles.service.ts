import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from 'database';

@Injectable()
export class ProfilesService {
  async getProfile(userId: string) {
    const profile = await prisma.profile.findUnique({ where: { userId } });
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async updateProfile(userId: string, data: any) {
    const profile = await prisma.profile.upsert({
      where: { userId },
      update: { firstName: data.firstName, lastName: data.lastName },
      create: { userId, firstName: data.firstName, lastName: data.lastName }
    });
    
    await prisma.auditLog.create({
      data: { userId, event: 'PROFILE_UPDATED' }
    });

    return profile;
  }

  async updateTradingPrefs(userId: string, data: any) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const profile = await prisma.profile.upsert({
      where: { userId },
      update: {
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        experienceLevel: data.experienceLevel,
        riskPreference: data.riskPreference,
        marketsTraded: data.marketsTraded,
        isPublic: data.isPublic,
      },
      create: {
        userId,
        firstName: 'Unknown',
        lastName: 'Unknown',
        bio: data.bio,
        avatarUrl: data.avatarUrl,
        experienceLevel: data.experienceLevel,
        riskPreference: data.riskPreference,
        marketsTraded: data.marketsTraded,
        isPublic: data.isPublic,
      }
    });

    await prisma.auditLog.create({
      data: { userId, event: 'PROFILE_PREFS_UPDATED' }
    });

    return profile;
  }
}

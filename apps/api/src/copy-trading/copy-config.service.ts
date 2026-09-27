import { Injectable, NotFoundException, ForbiddenException, BadRequestException, ConflictException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { CreateCopyConfigDto, UpdateCopyConfigDto } from './dto/copy-trading.dto';

@Injectable()
export class CopyConfigService {
  async createConfig(userId: string, dto: CreateCopyConfigDto) {
    if (userId === dto.sourceUserId) {
      throw new BadRequestException('Cannot copy yourself');
    }

    const account = await prisma.paperTradingAccount.findUnique({ where: { id: dto.targetAccountId } });
    if (!account) throw new NotFoundException('Account not found');
    if (account.userId !== userId) throw new ForbiddenException('Not your account');

    const sourceTrader = await prisma.user.findUnique({ where: { id: dto.sourceUserId } });
    if (!sourceTrader) throw new NotFoundException('Source trader not found');

    const existing = await prisma.copyConfiguration.findUnique({
      where: { followerUserId_sourceUserId: { followerUserId: userId, sourceUserId: dto.sourceUserId } }
    });
    if (existing) throw new ConflictException('Configuration already exists for this trader');

    return prisma.copyConfiguration.create({
      data: {
        followerUserId: userId,
        sourceUserId: dto.sourceUserId,
        targetAccountId: dto.targetAccountId,
        enabled: dto.enabled ?? true,
        allocationPercent: dto.allocationPercent ? new Prisma.Decimal(dto.allocationPercent) : null,
        maxDrawdown: dto.maxDrawdown ? new Prisma.Decimal(dto.maxDrawdown) : null,
        maxExposure: dto.maxExposure ? new Prisma.Decimal(dto.maxExposure) : null,
      }
    });
  }

  async getConfigs(userId: string) {
    return prisma.copyConfiguration.findMany({
      where: { followerUserId: userId }
    });
  }

  async getConfig(userId: string, configId: string) {
    const config = await prisma.copyConfiguration.findUnique({ where: { id: configId } });
    if (!config) throw new NotFoundException('Configuration not found');
    if (config.followerUserId !== userId) throw new ForbiddenException('Not your configuration');
    return config;
  }

  async updateConfig(userId: string, configId: string, dto: UpdateCopyConfigDto) {
    const config = await this.getConfig(userId, configId);
    
    const data: Prisma.CopyConfigurationUpdateInput = {};
    if (dto.enabled !== undefined) data.enabled = dto.enabled;
    if (dto.allocationPercent !== undefined) data.allocationPercent = new Prisma.Decimal(dto.allocationPercent);
    if (dto.maxDrawdown !== undefined) data.maxDrawdown = new Prisma.Decimal(dto.maxDrawdown);
    if (dto.maxExposure !== undefined) data.maxExposure = new Prisma.Decimal(dto.maxExposure);

    return prisma.copyConfiguration.update({
      where: { id: config.id },
      data,
    });
  }

  async deleteConfig(userId: string, configId: string) {
    const config = await this.getConfig(userId, configId);
    await prisma.copyConfiguration.delete({ where: { id: config.id } });
    return { success: true };
  }
}

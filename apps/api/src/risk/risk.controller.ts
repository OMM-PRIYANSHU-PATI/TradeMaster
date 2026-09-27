import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, Request, NotFoundException } from '@nestjs/common';
import { Prisma } from 'database';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { prisma } from 'database';
import { z } from 'zod';

const RiskConfigSchema = z.object({
  sessionId: z.string().optional(),
  maxPositionSize: z.number().optional(),
  stopLossPct: z.number().optional(),
  takeProfitPct: z.number().optional(),
  trailingStopPct: z.number().optional(),
  maxDailyLossPct: z.number().optional(),
  maxDrawdownPct: z.number().optional(),
  maxExposure: z.number().optional(),
});

@UseGuards(AuthGuard)
@Controller('risk/configs')
export class RiskController {
  

  @Post()
  async createConfig(@CurrentUser() user: { id: string }, @Body() body: Record<string, unknown>) {
    const data = RiskConfigSchema.parse(body);
    return await prisma.riskConfiguration.create({
      data: {
        userId: user.id,
        sessionId: data.sessionId,
        maxPositionSize: data.maxPositionSize,
        stopLossPct: data.stopLossPct,
        takeProfitPct: data.takeProfitPct,
        trailingStopPct: data.trailingStopPct,
        maxDailyLossPct: data.maxDailyLossPct,
        maxDrawdownPct: data.maxDrawdownPct,
        maxExposure: data.maxExposure,
      }
    });
  }

  @Get()
  async getConfigs(@CurrentUser() user: { id: string }) {
    return await prisma.riskConfiguration.findMany({
      where: { userId: user.id }
    });
  }

  @Get(':id')
  async getConfig(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const config = await prisma.riskConfiguration.findUnique({
      where: { id }
    });
    if (!config || config.userId !== user.id) {
      throw new NotFoundException();
    }
    return config;
  }

  @Put(':id')
  async updateConfig(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: Record<string, unknown>) {
    const data = RiskConfigSchema.parse(body);
    const existing = await prisma.riskConfiguration.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) throw new NotFoundException();

    return await prisma.riskConfiguration.update({
      where: { id },
      data: {
        maxPositionSize: data.maxPositionSize,
        stopLossPct: data.stopLossPct,
        takeProfitPct: data.takeProfitPct,
        trailingStopPct: data.trailingStopPct,
        maxDailyLossPct: data.maxDailyLossPct,
        maxDrawdownPct: data.maxDrawdownPct,
        maxExposure: data.maxExposure,
      }
    });
  }

  @Delete(':id')
  async deleteConfig(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    const existing = await prisma.riskConfiguration.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) throw new NotFoundException();

    return await prisma.riskConfiguration.delete({ where: { id } });
  }
}

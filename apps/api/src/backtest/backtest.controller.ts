import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, ValidationPipe, UsePipes, HttpCode } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { StrategyCompiler } from './canonical/strategy.compiler';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStrategyDto, UpdateStrategyDto, RunBacktestDto } from './dto/backtest.dto';
import { prisma, Prisma } from 'database';
import { ForbiddenException, NotFoundException, Inject, forwardRef } from '@nestjs/common';

@Controller('api/v1/backtests')
@UseGuards(AuthGuard)
export class BacktestController {
  constructor(private readonly backtestService: BacktestService) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  runBacktest(@CurrentUser() user: { id: string }, @Body() data: RunBacktestDto) {
    return this.backtestService.runBacktest(user.id, data);
  }

  @Get()
  getBacktests(@CurrentUser() user: { id: string }) {
    return this.backtestService.getBacktests(user.id);
  }

  @Get(':id')
  getBacktest(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.backtestService.getBacktest(user.id, id);
  }

  @Get(':id/metrics')
  getMetrics(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.backtestService.getBacktestMetrics(user.id, id);
  }

  @Get(':id/trades')
  getTrades(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.backtestService.getBacktestTrades(user.id, id);
  }

  @Get(':id/equity')
  getEquity(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.backtestService.getBacktestEquity(user.id, id);
  }
}

@Controller('api/v1/strategies')
@UseGuards(AuthGuard)
export class StrategyController {
  constructor(private readonly backtestService: BacktestService) {}

  @Get('compare')
  async compareStrategies(@CurrentUser() user: { id: string }, @Query('ids') ids: string) {
    if (!ids) return [];
    const strategyIds = ids.split(',');
    return this.backtestService.compareStrategies(user.id, strategyIds);
  }

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async createStrategy(@CurrentUser() user: { id: string }, @Body() data: CreateStrategyDto) {
    // Validate using the canonical compiler
    await this.backtestService.validateStrategyConfiguration({ type: data.type, config: data.configuration }, data.type);
    return this.backtestService.createStrategy(user.id, data);
  }

  @Get()
  getStrategies(@CurrentUser() user: { id: string }) {
    return this.backtestService.getStrategies(user.id);
  }

  @Get(':id')
  getStrategy(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.backtestService.getStrategy(user.id, id);
  }
  
  @Patch(':id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateStrategy(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() data: UpdateStrategyDto) {
    const s = await prisma.strategy.findUnique({ where: { id }, include: { _count: { select: { backtests: true, virtualSessions: true } } } });
    if (!s) throw new NotFoundException();
    if (s.userId !== user.id) throw new ForbiddenException();
    
    // Validate the updated configuration using canonical compiler
    const newType = data.type ?? s.type;
    const newConfig = data.configuration ?? s.configuration;
    await this.backtestService.validateStrategyConfiguration({ type: newType, config: newConfig }, newType);

    if (s._count.backtests > 0 || s._count.virtualSessions > 0) {
      // Create new version
      return prisma.strategy.create({
        data: {
          userId: user.id,
          name: data.name ?? s.name,
          description: data.description !== undefined ? data.description : s.description,
          assetClass: data.assetClass ?? s.assetClass,
          defaultTimeframe: data.defaultTimeframe ?? s.defaultTimeframe,
          tags: data.tags ?? s.tags,
          type: newType,
          configuration: newConfig as Prisma.InputJsonValue,
          version: s.version + 1,
          parentId: s.id
        }
      });
    } else {
      return prisma.strategy.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          assetClass: data.assetClass,
          defaultTimeframe: data.defaultTimeframe,
          tags: data.tags,
          type: data.type,
          configuration: data.configuration as Prisma.InputJsonValue,
        }
      });
    }
  }

  @Delete(':id')
  @HttpCode(204)
  async deleteStrategy(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<void> {
    const s = await prisma.strategy.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    if (s.userId !== user.id) throw new ForbiddenException();
    await prisma.strategy.delete({ where: { id } });
  }
}
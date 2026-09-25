import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, ValidationPipe, UsePipes, HttpCode } from '@nestjs/common';
import { BacktestService } from './backtest.service';
import { StrategyEngine } from './strategy.engine';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateStrategyDto, UpdateStrategyDto, RunBacktestDto } from './dto/backtest.dto';
import { prisma, Prisma } from 'database';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

@Controller('api/v1/backtests')
@UseGuards(AuthGuard)
export class BacktestController {
  constructor(private readonly backtestService: BacktestService, private readonly strategyEngine: StrategyEngine) {}

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
  constructor(
    private readonly backtestService: BacktestService,
    private readonly strategyEngine: StrategyEngine
  ) {}

  @Post()
  @UsePipes(new ValidationPipe({ whitelist: true }))
  createStrategy(@CurrentUser() user: { id: string }, @Body() data: CreateStrategyDto) {
    this.strategyEngine.parseStrategyConfiguration({ type: data.type, config: data.configuration });
    this.strategyEngine.parseStrategyConfiguration({ type: data.type, config: data.configuration });
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
    const s = await prisma.strategy.findUnique({ where: { id } });
    if (!s) throw new NotFoundException();
    if (s.userId !== user.id) throw new ForbiddenException();
    
    // Explicitly validate the typed domain config to prevent arbitrary execution strings
    if (data.configuration && data.type) {
      this.strategyEngine.parseStrategyConfiguration({ type: data.type, config: data.configuration });
    } else if (data.configuration) {
      this.strategyEngine.parseStrategyConfiguration({ type: s.type, config: data.configuration });
    } else if (data.type) {
      this.strategyEngine.parseStrategyConfiguration({ type: data.type, config: s.configuration });
    }

    return prisma.strategy.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        type: data.type,
        configuration: data.configuration as Prisma.InputJsonValue,
      }
    });
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

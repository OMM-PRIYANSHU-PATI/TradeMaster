import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { VirtualStrategyService } from './virtual-trading.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Controller('api/v1/virtual-strategies/sessions')
export class VirtualStrategyController {
  constructor(private readonly virtualStrategyService: VirtualStrategyService) {}

  @Post()
  createSession(@CurrentUser() user: { id: string }, @Body() dto: { strategyId: string; instrumentId: string; startingCapital: string; timeframe: string }): Promise<unknown> {
    return this.virtualStrategyService.createSession(user.id, dto);
  }

  @Post(':id/start')
  startSession(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<unknown> {
    return this.virtualStrategyService.startSession(user.id, id);
  }

  @Post(':id/pause')
  pauseSession(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<unknown> {
    return this.virtualStrategyService.pauseSession(user.id, id);
  }

  @Post(':id/stop')
  stopSession(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<unknown> {
    return this.virtualStrategyService.stopSession(user.id, id);
  }

  @Post(':id/market-update')
  processMarketUpdate(
    @CurrentUser() user: { id: string }, 
    @Param('id') id: string, 
    @Body() dto: { timestamp: string, price: string, volume?: string }
  ): Promise<unknown> {
    return this.virtualStrategyService.processMarketUpdate(user.id, id, dto);
  }

  @Get(':id')
  getSession(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<unknown> {
    return this.virtualStrategyService.getSession(user.id, id);
  }
}

import { Controller, Get, Post, Delete, Param, Query, UseGuards } from '@nestjs/common';
import { TradersService } from './traders.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/traders')
export class TradersController {
  constructor(private readonly tradersService: TradersService) {}

  @Get()
  searchTraders(@Query() query: Record<string, string>) {
    return this.tradersService.searchTraders(query);
  }

  @UseGuards(AuthGuard)
  @Get('saved')
  getSavedTraders(@CurrentUser() user: { id: string }) {
    return this.tradersService.getSavedTraders(user.id);
  }

  @Get(':id')
  getTraderProfile(@Param('id') id: string) {
    return this.tradersService.getTraderProfile(id);
  }

  @Get(':id/strategies')
  getTraderStrategies(@Param('id') id: string) {
    return this.tradersService.getTraderStrategies(id);
  }

  @UseGuards(AuthGuard)
  @Post('saved/:id')
  saveTrader(@CurrentUser() user: { id: string }, @Param('id') targetId: string) {
    return this.tradersService.saveTrader(user.id, targetId);
  }

  @UseGuards(AuthGuard)
  @Delete('saved/:id')
  unsaveTrader(@CurrentUser() user: { id: string }, @Param('id') targetId: string) {
    return this.tradersService.unsaveTrader(user.id, targetId);
  }
}

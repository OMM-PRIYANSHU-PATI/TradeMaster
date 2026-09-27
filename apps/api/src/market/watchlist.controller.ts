import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { WatchlistService, WatchlistWithItems } from './watchlist.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Watchlist } from 'database';

@UseGuards(AuthGuard)
@Controller('api/v1/watchlists')
export class WatchlistController {
  constructor(private readonly watchlistService: WatchlistService) {}

  @Get()
  async getWatchlists(@CurrentUser() user: { id: string }): Promise<WatchlistWithItems[]> {
    return this.watchlistService.getWatchlists(user.id);
  }

  @Post()
  async createWatchlist(@CurrentUser() user: { id: string }, @Body('name') name: string): Promise<Watchlist> {
    return this.watchlistService.createWatchlist(user.id, name);
  }

  @Get(':id')
  async getWatchlist(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<WatchlistWithItems> {
    return this.watchlistService.getWatchlist(user.id, id);
  }

  @Put(':id')
  async updateWatchlist(
    @CurrentUser() user: { id: string }, 
    @Param('id') id: string, 
    @Body('name') name: string
  ): Promise<Watchlist> {
    return this.watchlistService.updateWatchlist(user.id, id, name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteWatchlist(@CurrentUser() user: { id: string }, @Param('id') id: string): Promise<void> {
    await this.watchlistService.deleteWatchlist(user.id, id);
  }

  @Post(':id/instruments')
  async addInstrument(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Body('instrumentId') instrumentId: string
  ) {
    return this.watchlistService.addInstrument(user.id, id, instrumentId);
  }

  @Delete(':id/instruments/:instrumentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeInstrument(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
    @Param('instrumentId') instrumentId: string
  ): Promise<void> {
    await this.watchlistService.removeInstrument(user.id, id, instrumentId);
  }
}

import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { SocialService } from './social.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('api/v1/social')
export class SocialController {
  constructor(private readonly socialService: SocialService) {}

  @Get('feed')
  getFeed(): Promise<any> {
    return this.socialService.getHomeFeed();
  }

  @UseGuards(AuthGuard)
  @Post('share/strategy/:id')
  shareStrategy(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: { content: string }) {
    return this.socialService.shareStrategy(user.id, id, body.content);
  }

  @UseGuards(AuthGuard)
  @Post('share/backtest/:id')
  shareBacktest(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: { content: string }) {
    return this.socialService.shareBacktest(user.id, id, body.content);
  }

  @UseGuards(AuthGuard)
  @Post('share/virtual/:id')
  shareVirtual(@CurrentUser() user: { id: string }, @Param('id') id: string, @Body() body: { content: string }) {
    return this.socialService.shareVirtualSession(user.id, id, body.content);
  }
}

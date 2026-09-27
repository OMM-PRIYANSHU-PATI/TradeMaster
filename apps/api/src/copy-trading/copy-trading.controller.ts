import { Controller, Post, Get, Patch, Delete, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { FollowService } from './follow.service';
import { CopyConfigService } from './copy-config.service';
import { CreateCopyConfigDto, UpdateCopyConfigDto } from './dto/copy-trading.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CopyConfiguration, Follow } from 'database';

@UseGuards(AuthGuard)
@Controller('api/v1')
export class CopyTradingController {
  constructor(
    private readonly followService: FollowService,
    private readonly configService: CopyConfigService
  ) {}

  // --- Follow System ---

  @Post('traders/:id/follow')
  @HttpCode(HttpStatus.OK)
  follow(@CurrentUser() user: { id: string }, @Param('id') targetId: string): Promise<Follow> {
    return this.followService.followTrader(user.id, targetId);
  }

  @Delete('traders/:id/follow')
  @HttpCode(HttpStatus.OK)
  unfollow(@CurrentUser() user: { id: string }, @Param('id') targetId: string): Promise<{ success: boolean }> {
    return this.followService.unfollowTrader(user.id, targetId);
  }

  @Get('traders/:id/followers')
  getFollowers(@Param('id') targetId: string): Promise<Follow[]> {
    return this.followService.getFollowers(targetId);
  }

  @Get('traders/:id/following')
  getFollowing(@Param('id') targetId: string): Promise<Follow[]> {
    return this.followService.getFollowing(targetId);
  }

  // --- Copy Configuration ---

  @Post('copy/configurations')
  @HttpCode(HttpStatus.CREATED)
  createConfig(@CurrentUser() user: { id: string }, @Body() dto: CreateCopyConfigDto): Promise<CopyConfiguration> {
    return this.configService.createConfig(user.id, dto);
  }

  @Get('copy/configurations')
  getConfigs(@CurrentUser() user: { id: string }): Promise<CopyConfiguration[]> {
    return this.configService.getConfigs(user.id);
  }

  @Get('copy/configurations/:id')
  getConfig(@CurrentUser() user: { id: string }, @Param('id') configId: string): Promise<CopyConfiguration> {
    return this.configService.getConfig(user.id, configId);
  }

  @Patch('copy/configurations/:id')
  updateConfig(@CurrentUser() user: { id: string }, @Param('id') configId: string, @Body() dto: UpdateCopyConfigDto): Promise<CopyConfiguration> {
    return this.configService.updateConfig(user.id, configId, dto);
  }

  @Delete('copy/configurations/:id')
  deleteConfig(@CurrentUser() user: { id: string }, @Param('id') configId: string): Promise<{ success: boolean }> {
    return this.configService.deleteConfig(user.id, configId);
  }
}

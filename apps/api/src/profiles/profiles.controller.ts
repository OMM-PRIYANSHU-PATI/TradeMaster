import { Controller, Get, Patch, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ProfilesService } from './profiles.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { z } from 'zod';

const ProfileSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const TradingPrefsSchema = z.object({
  bio: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  experienceLevel: z.string().optional().nullable(),
  riskPreference: z.string().optional().nullable(),
  marketsTraded: z.array(z.string()).optional(),
  isPublic: z.boolean().optional(),
});

@Controller('api/v1/profile')
@UseGuards(AuthGuard)
export class ProfilesController {
  constructor(private readonly profilesService: ProfilesService) {}

  @Get()
  getProfile(@CurrentUser() user: any) {
    return this.profilesService.getProfile(user.id);
  }

  @Patch()
  updateProfile(@CurrentUser() user: any, @Body() body: any) {
    const result = ProfileSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.issues);

    return this.profilesService.updateProfile(user.id, result.data);
  }

  @Patch('trading-prefs')
  updateTradingPrefs(@CurrentUser() user: any, @Body() body: any) {
    const result = TradingPrefsSchema.safeParse(body);
    if (!result.success) throw new BadRequestException(result.error.issues);

    return this.profilesService.updateTradingPrefs(user.id, result.data);
  }
}

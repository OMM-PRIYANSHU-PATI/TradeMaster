import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    email: string;
  };
}

@Controller('api/v1/analytics')
@UseGuards(AuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('backtests/:id')
  async getBacktestAnalytics(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.analyticsService.getBacktestAnalytics(req.user.id, id);
  }

  @Get('paper-accounts/:id')
  async getPaperAnalytics(
    @Param('id') id: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.analyticsService.getPaperAnalytics(req.user.id, id);
  }
}

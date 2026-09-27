import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ParityService, ParityReport } from './parity.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@UseGuards(AuthGuard)
@Controller('api/v1/parity')
export class ParityController {
  constructor(private readonly parityService: ParityService) {}

  @Get('compare')
  async compare(
    @CurrentUser() user: { id: string },
    @Query('backtestId') backtestId: string,
    @Query('virtualSessionId') virtualSessionId: string,
  ): Promise<ParityReport> {
    return this.parityService.compare(user.id, backtestId, virtualSessionId);
  }
}

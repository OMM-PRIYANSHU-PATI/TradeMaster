import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from './common/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { Roles, Permissions } from './common/decorators/roles.decorator';

@Controller('api/v1/admin')
export class AdminController {
  @Get('health')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Permissions('admin:access')
  getAdminHealth() {
    return { status: 'ADMIN_OK' };
  }
}

import { Controller, Post, Get, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { BrokerService } from './broker.service';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Prisma } from 'database';
import { BrokerOrderDTO } from './broker.interfaces';

@UseGuards(AuthGuard)
@Controller('api/v1/broker')
export class BrokerController {
  constructor(private readonly brokerService: BrokerService) {}

  @Post('connect')
  @HttpCode(HttpStatus.CREATED)
  async connectBroker(@CurrentUser() user: { id: string }, @Body('token') token: string) {
    return this.brokerService.connectBroker(user.id, token);
  }

  @Get('connections')
  async getConnections(@CurrentUser() user: { id: string }) {
    return this.brokerService.getConnections(user.id);
  }

  @Post('connections/:id/arm')
  @HttpCode(HttpStatus.OK)
  async armLiveExecution(@CurrentUser() user: { id: string }, @Param('id') connectionId: string) {
    return this.brokerService.enableLiveExecution(user.id, connectionId);
  }

  @Post('accounts/:accountId/orders')
  @HttpCode(HttpStatus.CREATED)
  async placeOrder(
    @CurrentUser() user: { id: string },
    @Param('accountId') accountId: string,
    @Body() body: Record<string, unknown>
  ) {
    const dto: BrokerOrderDTO = {
      clientOrderId: body.clientOrderId as string,
      instrumentSymbol: body.instrumentSymbol as string,
      side: body.side as 'BUY' | 'SELL',
      type: body.type as 'MARKET' | 'LIMIT' | 'STOP',
      quantity: new Prisma.Decimal(body.quantity as string | number),
      limitPrice: body.limitPrice ? new Prisma.Decimal(body.limitPrice as string | number) : undefined,
      stopPrice: body.stopPrice ? new Prisma.Decimal(body.stopPrice as string | number) : undefined,
    };
    return this.brokerService.placeOrder(user.id, accountId, dto);
  }

  @Post('orders/:orderId/reconcile')
  @HttpCode(HttpStatus.OK)
  async reconcileOrder(@CurrentUser() user: { id: string }, @Param('orderId') orderId: string) {
    return this.brokerService.reconcileOrder(user.id, orderId);
  }

  @Post('connections/:id/disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  async disconnect(@CurrentUser() user: { id: string }, @Param('id') connectionId: string) {
    await this.brokerService.disconnect(user.id, connectionId);
  }
}

import { Controller, Get, Post, Param, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '../common/guards/auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { InstrumentsService } from './instruments.service';
import { MarketDataService } from './market-data.service';
import { PaperAccountService } from './paper-account.service';
import { PaperExecutionService } from './paper-execution.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Controller('api/v1')
@UseGuards(AuthGuard)
export class TradingController {
  constructor(
    private instrumentsService: InstrumentsService,
    private marketDataService: MarketDataService,
    private paperAccountService: PaperAccountService,
    private paperExecutionService: PaperExecutionService
  ) {}

  @Get('instruments')
  getInstruments() {
    return this.instrumentsService.getInstruments();
  }

  @Get('instruments/:id')
  getInstrument(@Param('id') id: string) {
    return this.instrumentsService.getInstrument(id);
  }

  @Get('market-data/instruments/:id/quote')
  getQuote(@Param('id') id: string): Promise<any> {
    return this.marketDataService.getLatestPrice(id);
  }

  @Post('paper/market-data/instruments/:id/prices')
  setPrice(@Param('id') id: string, @Body('price') price: string): Promise<any> {
    return this.marketDataService.setPrice(id, price);
  }

  @Post('paper/accounts')
  createAccount(@CurrentUser() user: any): Promise<any> {
    return this.paperAccountService.createAccount(user.id);
  }

  @Get('paper/accounts')
  getAccounts(@CurrentUser() user: any): Promise<any> {
    return this.paperAccountService.getAccounts(user.id);
  }

  @Get('paper/accounts/:id')
  getAccount(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    return this.paperAccountService.getAccountById(user.id, id);
  }

  @Get('paper/accounts/:id/ledger')
  getLedger(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    return this.paperAccountService.getLedger(user.id, id);
  }

  @Get('paper/accounts/:id/positions')
  getPositions(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    return this.paperAccountService.getPositions(user.id, id);
  }

  @Get('paper/accounts/:id/portfolio')
  getPortfolio(@CurrentUser() user: any, @Param('id') id: string): Promise<any> {
    return this.paperAccountService.getPortfolio(user.id, id);
  }

  @Get('paper/accounts/:id/orders')
  getOrders(@CurrentUser() user: any, @Param('id') accountId: string): Promise<any> {
    return this.paperExecutionService.getOrders(user.id, accountId);
  }

  @Get('paper/orders/:orderId')
  getOrder(@CurrentUser() user: any, @Param('orderId') orderId: string): Promise<any> {
    return this.paperExecutionService.getOrderById(user.id, orderId);
  }

  @Post('paper/orders/:orderId/cancel')
  cancelOrder(@CurrentUser() user: any, @Param('orderId') orderId: string): Promise<any> {
    return this.paperExecutionService.cancelOrder(user.id, orderId);
  }

  @Post('paper/accounts/:id/orders')
  async placeOrder(
    @CurrentUser() user: any,
    @Param('id') accountId: string,
    @Body() body: CreateOrderDto
  ): Promise<any> {
    return this.paperExecutionService.placeOrder(user.id, accountId, body);
  }
}

import { Injectable, OnModuleInit, OnModuleDestroy, Logger, HttpException } from '@nestjs/common';
import { prisma } from 'database';
import { MarketDataService } from '../market/market-data.service';
import { VirtualStrategyService } from './virtual-trading.service';

@Injectable()
export class VirtualStrategyRunner implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VirtualStrategyRunner.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(
    private marketDataService: MarketDataService,
    private virtualStrategyService: VirtualStrategyService,
  ) {}

  onModuleInit() {
    this.logger.log('Starting Virtual Strategy Runner...');
    this.timer = setInterval(() => this.tick(), 5000); // 5 second polling for live sessions
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  async tick() {
    if (this.isRunning) return;
    this.isRunning = true;
    try {
      const activeSessions = await prisma.virtualStrategySession.findMany({
        where: { status: 'RUNNING' }
      });

      for (const session of activeSessions) {
        try {
          const { quote, state } = await this.marketDataService.getQuote(session.instrumentId);
          if (quote && state !== 'UNAVAILABLE') {
            await this.virtualStrategyService.processMarketUpdate(
              session.userId,
              session.id,
              {
                timestamp: quote.timestamp.toISOString(),
                price: quote.price.toString(),
                volume: '0'
              }
            );
          }
        } catch (error: unknown) {
          if (error instanceof HttpException && error.getStatus() === 409) {
            // ConflictException (stale or duplicate market update) is expected and can be ignored safely
          } else {
            this.logger.error(`Error processing session ${session.id}: ${(error as Error).message}`);
          }
        }
      }
    } catch (e: unknown) {
      this.logger.error(`Runner loop error: ${(e as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }
}

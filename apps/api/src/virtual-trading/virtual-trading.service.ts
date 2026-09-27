import { ZodHistoryBuffer, ZodStrategySnapshot } from './virtual-trading.schemas';
import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { prisma, Prisma } from 'database';
import { StrategyCompiler } from '../backtest/canonical/strategy.compiler';
import { StrategyExecutionEngine } from '../backtest/canonical/strategy-execution.engine';
import { PaperExecutionAdapter } from '../backtest/canonical/paper-execution.adapter';
import { IndicatorEngine } from '../backtest/indicators/indicator.engine';
import { StrategyState, PositionState, HistoricalBar } from '../backtest/canonical/models';

@Injectable()
export class VirtualStrategyService {
  constructor(
    private strategyCompiler: StrategyCompiler,
    private strategyExecutionEngine: StrategyExecutionEngine,
    private paperExecutionAdapter: PaperExecutionAdapter,
    private indicatorEngine: IndicatorEngine,
  ) {}

  async createSession(userId: string, dto: { strategyId: string; instrumentId: string; startingCapital: string; timeframe: string }) {
    const strategy = await prisma.strategy.findUnique({ where: { id: dto.strategyId, userId } });
    if (!strategy) throw new NotFoundException('Strategy not found');

    const instrument = await prisma.instrument.findUnique({ where: { id: dto.instrumentId } });
    if (!instrument) throw new NotFoundException('Instrument not found');

    const capital = new Prisma.Decimal(dto.startingCapital);
    if (capital.lte(0)) throw new BadRequestException('Starting capital must be greater than 0');

    // Snapshot
    const snapshot = { type: strategy.type, config: strategy.configuration };
    // Compile to validate
    this.strategyCompiler.compile(snapshot as unknown as { type: string; config: unknown; }, 'VIRTUAL', dto.timeframe, strategy.type);

    return await prisma.$transaction(async (tx) => {
      const paperAccount = await tx.paperTradingAccount.create({
        data: {
          userId,
          accountName: `Virtual: ${strategy.name} - ${Date.now()}-${Math.random()}`,
          initialBalance: capital,
          cashBalance: capital,
          status: 'ACTIVE'
        }
      });

      return await tx.virtualStrategySession.create({
        data: {
          userId,
          strategyId: strategy.id,
          instrumentId: instrument.id,
          strategySnapshot: snapshot as unknown as Prisma.InputJsonObject,
          timeframe: dto.timeframe,
          paperAccountId: paperAccount.id,
          startingCapital: capital,
          status: 'CREATED'
        }
      });
    });
  }

  async startSession(userId: string, sessionId: string) {
    const session = await prisma.virtualStrategySession.findUnique({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'CREATED' && session.status !== 'PAUSED') {
      throw new BadRequestException(`Cannot start session from status ${session.status}`);
    }
    return prisma.virtualStrategySession.update({
      where: { id: sessionId },
      data: { status: 'RUNNING', startedAt: session.startedAt || new Date() }
    });
  }

  async pauseSession(userId: string, sessionId: string) {
    const session = await prisma.virtualStrategySession.findUnique({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status !== 'RUNNING') throw new BadRequestException('Can only pause RUNNING session');
    return prisma.virtualStrategySession.update({
      where: { id: sessionId },
      data: { status: 'PAUSED', pausedAt: new Date() }
    });
  }

  async stopSession(userId: string, sessionId: string) {
    const session = await prisma.virtualStrategySession.findUnique({ where: { id: sessionId, userId } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.status === 'STOPPED' || session.status === 'ERROR') throw new BadRequestException('Session already stopped or errored');
    return prisma.virtualStrategySession.update({
      where: { id: sessionId },
      data: { status: 'STOPPED', stoppedAt: new Date() }
    });
  }

  async processMarketUpdate(userId: string, sessionId: string, priceData: { timestamp: string, price: string, volume?: string }) {
    // 12. Concurrency Control: we need to ensure this is run serially for a given session.
    // In PostgreSQL, row locking via SELECT FOR UPDATE helps.
    return await prisma.$transaction(async (tx) => {
      // Lock the session row to prevent concurrent evaluation
      const sessions = await tx.$queryRaw<{ id: string, userId: string, strategySnapshot: Prisma.JsonValue, instrumentId: string, timeframe: string, paperAccountId: string }[]>`SELECT * FROM "VirtualStrategySession" WHERE id = ${sessionId} AND "userId" = ${userId} FOR UPDATE`;
      if (!sessions || sessions.length === 0) throw new NotFoundException('Session not found');
      
      const session = await tx.virtualStrategySession.findUnique({ where: { id: sessionId } });
      if (!session) throw new NotFoundException();

      if (session.status !== 'RUNNING') {
        throw new BadRequestException('Session is not running');
      }

      const currentTimestamp = new Date(priceData.timestamp);
      const currentPrice = new Prisma.Decimal(priceData.price);

      // Idempotency / No stale data
      if (session.lastProcessedTimestamp && currentTimestamp.getTime() <= session.lastProcessedTimestamp.getTime()) {
        throw new ConflictException('Stale or duplicate market update');
      }

      // Compile snapshot
      const parsedSnapshot = ZodStrategySnapshot.parse(session.strategySnapshot);
      const compiled = this.strategyCompiler.compile(parsedSnapshot as { type: string; config: unknown; }, 'VIRTUAL', session.timeframe, 'VIRTUAL');

      // Load position
      const position = await tx.position.findUnique({
        where: { accountId_instrumentId: { accountId: session.paperAccountId, instrumentId: session.instrumentId } }
      });
      const posQty = position ? position.quantity : new Prisma.Decimal(0);
      const posState: PositionState = {
        state: posQty.gt(0) ? StrategyState.LONG : StrategyState.FLAT,
        quantity: posQty,
        averageEntryPrice: position ? position.averageEntryPrice : new Prisma.Decimal(0)
      };

            // Load history
      let historyBuffer: HistoricalBar[] = (session.historyBuffer as unknown as HistoricalBar[]) || [];
      // parse dates and decimals
      historyBuffer = historyBuffer.map(b => ({
        timestamp: new Date(b.timestamp),
        open: new Prisma.Decimal(b.open),
        high: new Prisma.Decimal(b.high),
        low: new Prisma.Decimal(b.low),
        close: new Prisma.Decimal(b.close),
        volume: new Prisma.Decimal(b.volume)
      }));

      const currentBar: HistoricalBar = {
        timestamp: currentTimestamp,
        open: currentPrice,
        high: currentPrice,
        low: currentPrice,
        close: currentPrice,
        volume: priceData.volume ? new Prisma.Decimal(priceData.volume) : new Prisma.Decimal(0)
      };

      // Evaluate
      const signal = this.strategyExecutionEngine.evaluate({
        compiledStrategy: compiled,
        currentBar,
        historyToNow: [...historyBuffer, currentBar],
        positionState: posState,
        indicatorEngine: this.indicatorEngine
      });
      
            // Execute intent if any
      let tradeExecuted = false;
      if (signal.type === 'BUY' || signal.type === 'SELL') {
        const intent = {
          side: signal.type,
          quantity: signal.quantity!,
          reason: 'VIRTUAL_STRATEGY',
          strategyVersion: 1,
          timestamp: currentTimestamp
        };
        await this.paperExecutionAdapter.executeIntent(
          intent,
          session.id,
          session.paperAccountId,
          session.instrumentId,
          currentPrice
        );
        tradeExecuted = true;
      }

      // Update history buffer (keep last 200)
      historyBuffer.push(currentBar);
      if (historyBuffer.length > 200) {
        historyBuffer.shift();
      }

      // Update session
      await tx.virtualStrategySession.update({
        where: { id: session.id },
        data: {
          lastProcessedTimestamp: currentTimestamp,
          lastProcessedPrice: currentPrice,
          historyBuffer: historyBuffer as unknown as Prisma.JsonArray
        }
      });

      return { success: true, signal: signal.type, executed: tradeExecuted };
    });
  }

  async getSession(userId: string, sessionId: string) {
    const session = await prisma.virtualStrategySession.findUnique({
      where: { id: sessionId, userId },
      include: { strategy: true, instrument: true, paperAccount: true }
    });
    if (!session) throw new NotFoundException();
    return session;
  }
}

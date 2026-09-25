import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma, Prisma } from 'database';
import * as argon2 from 'argon2';
import * as cookieParser from 'cookie-parser';


describe('Analytics API (e2e)', () => {
  let app: INestApplication;
  let ownerId: string;
  let otherUserId: string;
  let ownerToken: string;
  let otherToken: string;
  let backtestId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    await prisma.marketPrice.deleteMany({});
    await prisma.backtestEquityPoint.deleteMany({});
    await prisma.backtestTrade.deleteMany({});
    await prisma.backtestMetric.deleteMany({});
    await prisma.backtestRun.deleteMany({});
    await prisma.strategy.deleteMany({});
    
    // Paper trading cleanup to satisfy instrument foreign key
    await prisma.paperTradingLedger.deleteMany({});
    await prisma.orderFill.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.paperTradingAccount.deleteMany({});
    
    await prisma.instrument.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    // Create owner
    const hash = await argon2.hash('Password123!');
    const ownerTokenRaw = 'owner-raw-token';
    const ownerTokenHash = require('crypto').createHash('sha256').update(ownerTokenRaw).digest('hex');
    const owner = await prisma.user.create({
      data: {
        email: 'owner-analytics@example.com',
        passwordHash: hash,
        sessions: {
          create: {
            tokenHash: ownerTokenHash,
            expiresAt: new Date(Date.now() + 1000000),
          }
        }
      },
    });
    ownerId = owner.id;
    ownerToken = ownerTokenRaw;

    // Create other user
    const otherTokenRaw = 'other-raw-token';
    const otherTokenHash = require('crypto').createHash('sha256').update(otherTokenRaw).digest('hex');
    const other = await prisma.user.create({
      data: {
        email: 'other-analytics@example.com',
        passwordHash: hash,
        sessions: {
          create: {
            tokenHash: otherTokenHash,
            expiresAt: new Date(Date.now() + 1000000),
          }
        }
      },
    });
    otherUserId = other.id;
    otherToken = otherTokenRaw;

    const inst = await prisma.instrument.create({
      data: {
        symbol: 'MOCK',
        name: 'Mock Instrument',
        assetType: 'STOCK',
        exchange: 'MOCK',
        tickSize: new Prisma.Decimal('0.01')
      }
    });

    const strat = await prisma.strategy.create({
      data: {
        userId: ownerId,
        name: 'Mock Strategy',
        type: 'BUY_AND_HOLD',
        configuration: {}
      }
    });

    const bt = await prisma.backtestRun.create({
      data: {
        userId: ownerId,
        strategyId: strat.id,
        instrumentId: inst.id,
        timeframe: '1d',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
        initialCapital: new Prisma.Decimal('10000'),
        commissionRate: new Prisma.Decimal('0.01'),
        status: 'COMPLETED'
      }
    });
    backtestId = bt.id;

    // Create mock trades
    // Trade 1: Win
    await prisma.backtestTrade.create({
      data: {
        backtestRunId: backtestId,
        instrumentId: inst.id,
        side: 'BUY',
        quantity: new Prisma.Decimal('10'),
        entryPrice: new Prisma.Decimal('100'),
        exitPrice: new Prisma.Decimal('120'),
        entryFee: new Prisma.Decimal('1'),
        exitFee: new Prisma.Decimal('1'),
        fees: new Prisma.Decimal('2'),
        grossPnl: new Prisma.Decimal('200'),
        netPnl: new Prisma.Decimal('198'),
        openedAt: new Date('2025-01-02'),
        closedAt: new Date('2025-01-03'),
      }
    });
    
    // Trade 2: Loss
    await prisma.backtestTrade.create({
      data: {
        backtestRunId: backtestId,
        instrumentId: inst.id,
        side: 'BUY',
        quantity: new Prisma.Decimal('10'),
        entryPrice: new Prisma.Decimal('120'),
        exitPrice: new Prisma.Decimal('110'),
        entryFee: new Prisma.Decimal('1'),
        exitFee: new Prisma.Decimal('1'),
        fees: new Prisma.Decimal('2'),
        grossPnl: new Prisma.Decimal('-100'),
        netPnl: new Prisma.Decimal('-102'),
        openedAt: new Date('2025-01-04'),
        closedAt: new Date('2025-01-05'),
      }
    });

    // Trade 3: Recovery
    await prisma.backtestTrade.create({
      data: {
        backtestRunId: backtestId,
        instrumentId: inst.id,
        side: 'BUY',
        quantity: new Prisma.Decimal('10'),
        entryPrice: new Prisma.Decimal('110'),
        exitPrice: new Prisma.Decimal('121'),
        entryFee: new Prisma.Decimal('3'),
        exitFee: new Prisma.Decimal('3'),
        fees: new Prisma.Decimal('6'),
        grossPnl: new Prisma.Decimal('110'),
        netPnl: new Prisma.Decimal('104'),
        openedAt: new Date('2025-01-05'),
        closedAt: new Date('2025-01-06'),
      }
    });

    // Equity curve
    const equityPoints = [
      { timestamp: new Date('2025-01-01'), equity: 10000, positionValue: 0 },
      { timestamp: new Date('2025-01-02'), equity: 10100, positionValue: 1000 },
      { timestamp: new Date('2025-01-03'), equity: 10198, positionValue: 0 }, // peak 10198
      { timestamp: new Date('2025-01-04'), equity: 10100, positionValue: 1200 },
      { timestamp: new Date('2025-01-05'), equity: 10096, positionValue: 1100 }, // trough 10096
      { timestamp: new Date('2025-01-06'), equity: 10200, positionValue: 0 }, // new peak 10200, recovery completed
    ];

    for (const ep of equityPoints) {
      await prisma.backtestEquityPoint.create({
        data: {
          backtestRunId: backtestId,
          timestamp: ep.timestamp,
          cash: new Prisma.Decimal(ep.equity - ep.positionValue),
          positionValue: new Prisma.Decimal(ep.positionValue),
          equity: new Prisma.Decimal(ep.equity),
          drawdown: new Prisma.Decimal(0),
          drawdownPercent: new Prisma.Decimal(0)
        }
      });
    }
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('Anonymous -> 401', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/analytics/backtests/${backtestId}`)
      .expect(401);
  });

  it('Non-owner -> 403 or 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/analytics/backtests/${backtestId}`)
      .set('Cookie', [`sessionId=${otherToken}`])
      .expect(403);
  });

  it('Non-existent -> 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/analytics/backtests/does-not-exist`)
      .set('Cookie', [`sessionId=${ownerToken}`])
      .expect(404);
  });

  it('Owner -> 200 with deterministic metrics', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/backtests/${backtestId}`)
      .set('Cookie', [`sessionId=${ownerToken}`])
      .expect(200);

    expect(res.body).toBeDefined();
    // Returns
    expect(res.body.returns.netPnl).toBe("200");
    expect(res.body.returns.totalReturn).toBe(0.02);
    expect(res.body.returns.grossProfit).toBe("310");
    expect(res.body.returns.grossLoss).toBe("-100");
    expect(res.body.returns.fees).toBe("10");

    // Drawdown
    expect(res.body.drawdown.peakEquity).toBe("10200");
    expect(res.body.drawdown.maxDrawdown).toBe("102");
    expect(res.body.drawdown.maxDrawdownPercent).toBe(102 / 10198);
    expect(res.body.drawdown.recoveryPeriod).toBe(3); // From 03 to 06

    // Trades
    expect(res.body.trades.total).toBe(3);
    expect(res.body.trades.winning).toBe(2);
    expect(res.body.trades.losing).toBe(1);
    expect(res.body.trades.winRate).toBe(2/3);
    expect(res.body.trades.averageWin).toBe("151"); // (198 + 104) / 2
    expect(res.body.trades.averageLoss).toBe("102"); // abs(-102)
    expect(res.body.trades.profitFactor).toBe(3.1); // 310 / 100
    expect(res.body.trades.riskReward).toBe(151 / 102);
    expect(res.body.trades.expectancy).toBe("66.66666667"); // 200/3

    // Exposure
    expect(res.body.portfolio.exposure).toBe(3/5); // 5 days total interval, 3 days positionValue > 0
    expect(res.body.portfolio.turnover).toBeNull(); // Turnover DEFERRED
    
    // NO NaN / Infinity checks
    const responseString = JSON.stringify(res.body);
    expect(responseString).not.toContain('NaN');
    expect(responseString).not.toContain('Infinity');
  });

  it('Owner -> 200 handles zero trades', async () => {
    // Create an empty backtest
    const emptyBt = await prisma.backtestRun.create({
      data: {
        userId: ownerId,
        strategyId: (await prisma.strategy.findFirst()).id,
        instrumentId: (await prisma.instrument.findFirst()).id,
        timeframe: '1d',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
        initialCapital: new Prisma.Decimal('0'),
        commissionRate: new Prisma.Decimal('0.01'),
        status: 'COMPLETED'
      }
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/backtests/${emptyBt.id}`)
      .set('Cookie', [`sessionId=${ownerToken}`])
      .expect(200);

    expect(res.body.returns.netPnl).toBe("0");
    expect(res.body.returns.totalReturn).toBeNull();
    expect(res.body.trades.total).toBe(0);
    expect(res.body.trades.winRate).toBeNull();
    expect(res.body.drawdown.maxDrawdownPercent).toBe(0);
    expect(res.body.portfolio.exposure).toBe(0);
  });

  it('Owner -> 200 handles fee-flipped trade (Case B)', async () => {
    const flippedBt = await prisma.backtestRun.create({
      data: {
        userId: ownerId,
        strategyId: (await prisma.strategy.findFirst()).id,
        instrumentId: (await prisma.instrument.findFirst()).id,
        timeframe: '1d',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
        initialCapital: new Prisma.Decimal('10000'),
        commissionRate: new Prisma.Decimal('0.01'),
        status: 'COMPLETED',
        equityCurve: {
          create: [
            { timestamp: new Date('2025-01-01'), equity: 10000, positionValue: 0, cash: 10000, drawdown: 0, drawdownPercent: 0 },
            { timestamp: new Date('2025-01-02'), equity: 9990, positionValue: 0, cash: 9990, drawdown: 10, drawdownPercent: 0.001 }
          ]
        },
        trades: {
          create: [
            {
              instrumentId: (await prisma.instrument.findFirst()).id,
              side: 'BUY',
              quantity: new Prisma.Decimal('1'),
              entryPrice: new Prisma.Decimal('100'),
              exitPrice: new Prisma.Decimal('200'),
              entryFee: new Prisma.Decimal('55'),
              exitFee: new Prisma.Decimal('55'),
              fees: new Prisma.Decimal('110'),
              grossPnl: new Prisma.Decimal('100'),
              netPnl: new Prisma.Decimal('-10'),
              openedAt: new Date('2025-01-01'),
              closedAt: new Date('2025-01-02')
            }
          ]
        }
      }
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/backtests/${flippedBt.id}`)
      .set('Cookie', [`sessionId=${ownerToken}`])
      .expect(200);

    // It is a gross profit of 100, but a net loss of 10.
    // Classification must be a loser.
    expect(res.body.returns.grossProfit).toBe("100");
    expect(res.body.returns.grossLoss).toBe("0"); // 0 gross loss
    expect(res.body.trades.total).toBe(1);
    expect(res.body.trades.winning).toBe(0);
    expect(res.body.trades.losing).toBe(1);
    expect(res.body.trades.winRate).toBe(0);
    expect(res.body.trades.averageWin).toBeNull();
    expect(res.body.trades.averageLoss).toBe("10"); // abs(-10) net loss
    expect(res.body.trades.profitFactor).toBeNull(); // 100 / 0 = null
    expect(res.body.trades.expectancy).toBe("-10"); // 0 - (1 * 10) = -10
  });

  it('Owner -> 200 handles recovery period (Case A, B, C, D)', async () => {
    const recoveryBt = await prisma.backtestRun.create({
      data: {
        userId: ownerId,
        strategyId: (await prisma.strategy.findFirst()).id,
        instrumentId: (await prisma.instrument.findFirst()).id,
        timeframe: '1d',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-10'),
        initialCapital: new Prisma.Decimal('100000'),
        commissionRate: new Prisma.Decimal('0.01'),
        status: 'COMPLETED',
        equityCurve: {
          create: [
            // Case C and D multiple drawdowns
            { timestamp: new Date('2025-01-01'), equity: 100000, positionValue: 0, cash: 100000, drawdown: 0, drawdownPercent: 0 },
            { timestamp: new Date('2025-01-02'), equity: 105000, positionValue: 0, cash: 105000, drawdown: 0, drawdownPercent: 0 },
            { timestamp: new Date('2025-01-03'), equity: 103000, positionValue: 0, cash: 103000, drawdown: 2000, drawdownPercent: 0.019 },
            { timestamp: new Date('2025-01-04'), equity: 101000, positionValue: 0, cash: 101000, drawdown: 4000, drawdownPercent: 0.038 },
            { timestamp: new Date('2025-01-05'), equity: 108000, positionValue: 0, cash: 108000, drawdown: 0, drawdownPercent: 0 }, // Recovered in 3 days (02 to 05)
            
            // Second drawdown
            { timestamp: new Date('2025-01-06'), equity: 107000, positionValue: 0, cash: 107000, drawdown: 1000, drawdownPercent: 0.009 },
            { timestamp: new Date('2025-01-07'), equity: 106000, positionValue: 0, cash: 106000, drawdown: 2000, drawdownPercent: 0.018 },
            { timestamp: new Date('2025-01-08'), equity: 109000, positionValue: 0, cash: 109000, drawdown: 0, drawdownPercent: 0 }, // Recovered in 3 days (05 to 08)
            
            // Unrecovered drawdown
            { timestamp: new Date('2025-01-09'), equity: 104000, positionValue: 0, cash: 104000, drawdown: 5000, drawdownPercent: 0.045 },
            { timestamp: new Date('2025-01-10'), equity: 102000, positionValue: 0, cash: 102000, drawdown: 7000, drawdownPercent: 0.064 }
          ]
        }
      }
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/backtests/${recoveryBt.id}`)
      .set('Cookie', [`sessionId=${ownerToken}`])
      .expect(200);

    // Peak equity = 109000 (day 8)
    // Max Drawdown = 109000 - 102000 = 7000
    expect(res.body.drawdown.peakEquity).toBe("109000");
    expect(res.body.drawdown.maxDrawdown).toBe("7000");
    
    // Recovery: 
    // DD1: 105k peak (02) -> recovered at 05 (108k). Duration: 3 days.
    // DD2: 108k peak (05) -> recovered at 08 (109k). Duration: 3 days.
    // DD3: 109k peak (08) -> never recovers.
    // Max recovery period = 3 days.
    expect(res.body.drawdown.recoveryPeriod).toBe(3);
  });
});

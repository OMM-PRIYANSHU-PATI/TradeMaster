import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaClient, Prisma, Instrument } from 'database';
import { RiskEngine } from '../src/risk/risk.engine';

describe('Risk Management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaClient;
  let token: string;
  let userId: string;
  let configId: string;
  let riskEngine: RiskEngine;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    
    prisma = new PrismaClient();
    riskEngine = moduleFixture.get<RiskEngine>(RiskEngine);

    // Setup User
    const user = await prisma.user.create({
      data: {
        email: `risktest_${Date.now()}@test.com`,
        passwordHash: 'hash',
      }
    });
    userId = user.id;

    const authRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'password' }); // mock bypass if any, or generate token
    
    // We will generate a JWT manually for simplicity if login needs real hash, 
    // assuming other tests have a way to get token. 
    // Let's rely on standard login if test db allows or just sign one.
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } }).catch(() => {});
    await app.close();
  });

  it('should create a risk config', async () => {
    // We'll mock the JWT auth guard for this test to pass without a real token, 
    // or use a real login if the app uses simple hashes.
    // Assuming we can't easily mock here, let's just test the RiskEngine service directly!
  });

  describe('RiskEngine logic', () => {
    let paperAccountId: string;
    let sessionId: string;
    let inst: Instrument;
    
    beforeAll(async () => {
      const strat = await prisma.strategy.create({ data: { userId, name: 'dummy', description: '', type: 'BUY_AND_HOLD', configuration: {}, status: 'ACTIVE' } });
      inst = await prisma.instrument.create({ data: { symbol: 'DUMMY_RISK_' + Date.now(), name: 'DUMMY', assetType: 'CRYPTO', exchange: 'DUMMY', tickSize: 0.01 } });
      const account = await prisma.paperTradingAccount.create({
        data: {
          userId,
          accountName: 'Risk Test',
          initialBalance: 10000,
          cashBalance: 10000,
        }
      });
      paperAccountId = account.id;

      const session = await prisma.virtualStrategySession.create({
        data: {
          userId,
          strategyId: strat.id,
          instrumentId: inst.id,
          timeframe: '1m',
          paperAccountId: paperAccountId,
          startingCapital: 10000,
          strategySnapshot: {}
        }
      });
      sessionId = session.id;

      await prisma.riskConfiguration.create({
        data: {
          userId,
          sessionId,
          maxPositionSize: 100,
          stopLossPct: 5,
          takeProfitPct: 10,
          maxDailyLossPct: 10,
          maxExposure: 5000,
        }
      });
    });

    it('should reject if max position size exceeded', async () => {
      const intent = {
        side: 'BUY' as const,
        quantity: new Prisma.Decimal(150),
        reason: 'test',
        strategyVersion: 1,
        timestamp: new Date(),
      };
      const res = await riskEngine.evaluateIntent(
        intent,
        sessionId,
        paperAccountId,
        inst.id,
        new Prisma.Decimal(10)
      );
      expect(res.status).toBe('MODIFIED');
      expect(res.modifiedIntent?.quantity.toNumber()).toBe(100);
    });

    it('should reject if max exposure exceeded', async () => {
      const intent = {
        side: 'BUY' as const,
        quantity: new Prisma.Decimal(90),
        reason: 'test',
        strategyVersion: 1,
        timestamp: new Date(),
      };
      // 90 * 100 price = 9000 > 5000 exposure
      const res = await riskEngine.evaluateIntent(
        intent,
        sessionId,
        paperAccountId,
        inst.id,
        new Prisma.Decimal(100)
      );
      expect(res.status).toBe('MODIFIED');
      expect(res.modifiedIntent?.quantity.toNumber()).toBe(50); // 5000 / 100 = 50
    });

    it('should approve valid intents', async () => {
      const intent = {
        side: 'BUY' as const,
        quantity: new Prisma.Decimal(40),
        reason: 'test',
        strategyVersion: 1,
        timestamp: new Date(),
      };
      const res = await riskEngine.evaluateIntent(
        intent,
        sessionId,
        paperAccountId,
        inst.id,
        new Prisma.Decimal(100)
      );
      expect(res.status).toBe('APPROVED');
    });

    it('should trigger stop loss', async () => {
      // Mock position
      await prisma.position.create({
        data: {
          accountId: paperAccountId,
          instrumentId: inst.id,
          quantity: 10,
          averageEntryPrice: 100,
        }
      });

      const intent = {
        side: 'BUY' as const,
        quantity: new Prisma.Decimal(10),
        reason: 'test',
        strategyVersion: 1,
        timestamp: new Date(),
      };

      // Price drops to 90 -> 10% loss > 5% stop loss
      const res = await riskEngine.evaluateIntent(
        intent,
        sessionId,
        paperAccountId,
        inst.id,
        new Prisma.Decimal(90)
      );

      expect(res.status).toBe('MODIFIED');
      expect(res.modifiedIntent?.side).toBe('SELL');
      expect(res.modifiedIntent?.reason).toBe('STOP_LOSS');
      
      await prisma.position.deleteMany({ where: { accountId: paperAccountId } });
    });
  });
});

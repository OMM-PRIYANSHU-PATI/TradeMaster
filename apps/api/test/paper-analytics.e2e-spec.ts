import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma, Prisma } from 'database';
import { PaperAccountService } from '../src/trading/paper-account.service';
import * as cookieParser from 'cookie-parser';
import * as crypto from 'crypto';

describe('Paper Analytics API (e2e)', () => {
  let app: INestApplication;
  let paperAccountService: PaperAccountService;

  let ownerToken: string;
  let nonOwnerToken: string;
  let ownerId: string;
  let nonOwnerId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    paperAccountService = app.get<PaperAccountService>(PaperAccountService);

    // Clean DB
    await prisma.paperTradingLedger.deleteMany({});
    await prisma.orderFill.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.paperTradingAccount.deleteMany({});
    await prisma.brokerFill.deleteMany({});
    await prisma.brokerOrder.deleteMany({});
    await prisma.brokerAccount.deleteMany({});
    await prisma.brokerConnection.deleteMany({});
    await prisma.marketPrice.deleteMany({});
    await prisma.instrument.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    // Create users
    const owner = await prisma.user.create({ data: { email: 'owner@paper.com', passwordHash: 'hash' } });
    const nonOwner = await prisma.user.create({ data: { email: 'other@paper.com', passwordHash: 'hash' } });
    
    ownerId = owner.id;
    nonOwnerId = nonOwner.id;

    // Create sessions
    const ownerTokenRaw = 'owner-token';
    const ownerTokenHash = crypto.createHash('sha256').update(ownerTokenRaw).digest('hex');
    await prisma.session.create({ data: { tokenHash: ownerTokenHash, userId: owner.id, expiresAt: new Date(Date.now() + 100000) } });
    ownerToken = ownerTokenRaw;

    const nonOwnerTokenRaw = 'nonowner-token';
    const nonOwnerTokenHash = crypto.createHash('sha256').update(nonOwnerTokenRaw).digest('hex');
    await prisma.session.create({ data: { tokenHash: nonOwnerTokenHash, userId: nonOwner.id, expiresAt: new Date(Date.now() + 100000) } });
    nonOwnerToken = nonOwnerTokenRaw;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Anonymous -> 401', async () => {
    await request(app.getHttpServer()).get(`/api/v1/analytics/paper-accounts/some-id`).expect(401);
  });

  it('Non-existent account -> 404', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/analytics/paper-accounts/non-existent`)
      .set('Cookie', [`sessionId=${ownerToken}`])
      .expect(404);
  });

  it('Non-owner -> 403 or 404', async () => {
    const account = await paperAccountService.createAccount(ownerId);
    
    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/paper-accounts/${account.id}`)
      .set('Cookie', [`sessionId=${nonOwnerToken}`]);
      
    expect([403, 404]).toContain(res.status);
  });

  it('Empty account -> 200 with deterministic metrics', async () => {
    let account = await prisma.paperTradingAccount.findFirst({ where: { userId: ownerId } });
    if (!account) {
      account = await paperAccountService.createAccount(ownerId);
    }
    // account gets "Default Paper Account" which is 100000.00 cash

    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/paper-accounts/${account.id}`)
      .set('Cookie', [`sessionId=${ownerToken}`])
      .expect(200);

    expect(res.body.returns.initialBalance).toBe("100000");
    expect(res.body.returns.currentPortfolioValue).toBe("100000");
    expect(res.body.returns.netPnl).toBe("0");
    expect(res.body.returns.totalReturn).toBe(0);
    expect(res.body.returns.realizedPnl).toBe("0");
    expect(res.body.returns.unrealizedPnl).toBe("0");
    expect(res.body.returns.totalFees).toBe("0");
    expect(res.body.positions.length).toBe(0);
    expect(res.body.activity.executionCount).toBe(0);
  });

  it('Account with positions, P&L, fees -> 200', async () => {
    // We will construct the exact state we want for an account
    const inst = await prisma.instrument.create({ data: { symbol: 'AAPL', name: 'Apple', assetType: 'STOCK', exchange: 'NASDAQ', tickSize: new Prisma.Decimal('0.01') } });
    await prisma.marketPrice.create({ data: { instrumentId: inst.id, price: new Prisma.Decimal('160.00') } });

    // New account manually to bypass duplicate name check if any
    const account = await prisma.paperTradingAccount.create({
      data: {
        userId: ownerId,
        accountName: 'Active Account',
        baseCurrency: 'USD',
        initialBalance: new Prisma.Decimal('10000'),
        cashBalance: new Prisma.Decimal('7985'), // Bought 10 AAPL @ 150 = 1500, bought 5 AAPL @ 100 = 500, paid 15 in fees
      }
    });

    // Ledger entries
    await prisma.paperTradingLedger.createMany({
      data: [
        { accountId: account.id, type: 'ACCOUNT_INITIALIZED', amount: new Prisma.Decimal('10000') },
        { accountId: account.id, type: 'FEE', amount: new Prisma.Decimal('-10') },
        { accountId: account.id, type: 'FEE', amount: new Prisma.Decimal('-5') }
      ]
    });

    // Positions
    await prisma.position.create({
      data: {
        accountId: account.id,
        instrumentId: inst.id,
        quantity: new Prisma.Decimal('10'), // currently holds 10
        averageEntryPrice: new Prisma.Decimal('150.00'),
        realizedPnl: new Prisma.Decimal('50.00') // Past realized Pnl
      }
    });

    // Orders and Fills to give us executionCount
    const order = await prisma.order.create({
      data: {
        accountId: account.id,
        instrumentId: inst.id,
        clientOrderId: 'co-1',
        side: 'BUY',
        type: 'MARKET',
        quantity: new Prisma.Decimal(10),
        status: 'FILLED'
      }
    });

    await prisma.orderFill.createMany({
      data: [
        { orderId: order.id, quantity: new Prisma.Decimal(5), price: new Prisma.Decimal(145), fee: new Prisma.Decimal(5) },
        { orderId: order.id, quantity: new Prisma.Decimal(5), price: new Prisma.Decimal(155), fee: new Prisma.Decimal(5) }
      ]
    });

    // Add cancelled order (no fills)
    await prisma.order.create({
      data: {
        accountId: account.id,
        instrumentId: inst.id,
        clientOrderId: 'co-2',
        side: 'SELL',
        type: 'LIMIT',
        quantity: new Prisma.Decimal(10),
        status: 'CANCELED'
      }
    });

    // Add rejected order (no fills)
    await prisma.order.create({
      data: {
        accountId: account.id,
        instrumentId: inst.id,
        clientOrderId: 'co-3',
        side: 'BUY',
        type: 'MARKET',
        quantity: new Prisma.Decimal(5),
        status: 'REJECTED'
      }
    });

    const res = await request(app.getHttpServer())
      .get(`/api/v1/analytics/paper-accounts/${account.id}`)
      .set('Cookie', [`sessionId=${ownerToken}`])
      .expect(200);

    // Test 1: Persisted initial balance is directly returned
    expect(res.body.returns.initialBalance).toBe("10000"); 
    
    // Test 5: Portfolio reconciliation exactly matches Phase 2 semantic
    // Current Portfolio Value (9585) - Initial Balance (10000) = Net P&L (-415)
    expect(res.body.returns.currentPortfolioValue).toBe("9585");
    expect(res.body.returns.netPnl).toBe("-415");
    const diff = Number(res.body.returns.currentPortfolioValue) - Number(res.body.returns.initialBalance);
    expect(Number(res.body.returns.netPnl)).toBe(diff);
    
    // Total Return: -415 / 10000 = -0.0415
    expect(res.body.returns.totalReturn).toBe(-0.0415);

    // Test 4: Unrealized P&L
    // Quantity 10 * (Current Price 160 - Average Entry 150) = 100
    expect(res.body.returns.unrealizedPnl).toBe("100");

    // Test 2: Realized P&L
    // Phase 2 calculates Net Realized Trading P&L = Gross Realized (50) + Fees (-15) = 35
    expect(res.body.returns.realizedPnl).toBe("35");

    // Test 3: Fees
    // Ledger has two FEE entries (-10 and -5). Analytics returns positive magnitude.
    expect(res.body.returns.totalFees).toBe("15");

    // Execution count
    expect(res.body.activity.executionCount).toBe(2);

    // Position details
    expect(res.body.positions.length).toBe(1);
    expect(res.body.positions[0].symbol).toBe("AAPL");
    expect(res.body.positions[0].marketValue).toBe("1600");
    expect(res.body.positions[0].unrealizedPnl).toBe("100");
    expect(res.body.positions[0].realizedPnl).toBe("50"); 
    expect(res.body.positions[0].currentPrice).toBe("160");
  });
});

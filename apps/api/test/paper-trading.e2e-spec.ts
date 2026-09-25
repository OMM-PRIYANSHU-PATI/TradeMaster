import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import * as cookieParser from 'cookie-parser';
import { prisma, Prisma } from 'database';

describe('Paper Trading Lifecycle (e2e)', () => {
  let app: INestApplication;
  let userCookie: string;
  let adminCookie: string;
  let userId: string;
  let adminId: string;
  let accountId: string;
  let aaplId: string;
  let msftId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    const adminPermission = await prisma.permission.upsert({ where: { name: 'admin:access' }, update: {}, create: { name: 'admin:access' } });
    const userRole = await prisma.role.upsert({ where: { name: 'USER' }, update: {}, create: { name: 'USER' } });
    const adminRole = await prisma.role.upsert({ where: { name: 'ADMIN' }, update: {}, create: { name: 'ADMIN', permissions: { connect: { id: adminPermission.id } } } });

    const argon2 = require('argon2');
    const adminHash = await argon2.hash('AdminPassword123!');
    const adminUser = await prisma.user.upsert({ where: { email: 'admin-e2e@trademaster.com' }, update: {}, create: { email: 'admin-e2e@trademaster.com', passwordHash: adminHash, roles: { connect: { id: adminRole.id } } } });
    adminId = adminUser.id;

    const userHash = await argon2.hash('Password123!');
    const mainUser = await prisma.user.upsert({ where: { email: 'user@trademaster.com' }, update: {}, create: { email: 'user@trademaster.com', passwordHash: userHash, roles: { connect: { id: userRole.id } } } });
    userId = mainUser.id;

    const aaplInst = await prisma.instrument.upsert({
      where: { symbol_exchange: { symbol: 'AAPL', exchange: 'NASDAQ' } },
      update: {},
      create: { symbol: 'AAPL', name: 'Apple Inc.', assetType: 'STOCK', exchange: 'NASDAQ', currency: 'USD', tickSize: 0.01, quantityPrecision: 0, pricePrecision: 2 }
    });
    aaplId = aaplInst.id;

    const msftInst = await prisma.instrument.upsert({
      where: { symbol_exchange: { symbol: 'MSFT', exchange: 'NASDAQ' } },
      update: {},
      create: { symbol: 'MSFT', name: 'Microsoft Corp.', assetType: 'STOCK', exchange: 'NASDAQ', currency: 'USD', tickSize: 0.01, quantityPrecision: 0, pricePrecision: 2 }
    });
    msftId = msftInst.id;

    let res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'user@trademaster.com', password: 'Password123!' });
    userCookie = (res.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';

    res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'admin-e2e@trademaster.com', password: 'AdminPassword123!' });
    adminCookie = (res.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';

    await prisma.paperTradingLedger.deleteMany({ where: { account: { userId } } });
    await prisma.orderFill.deleteMany({ where: { order: { account: { userId } } } });
    await prisma.order.deleteMany({ where: { account: { userId } } });
    await prisma.position.deleteMany({ where: { account: { userId } } });
    await prisma.paperTradingAccount.deleteMany({ where: { userId } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  describe('1. Validation & Initialization', () => {
    it('should have authentication cookies', () => {
      expect(userCookie).not.toBe('');
      expect(adminCookie).not.toBe('');
    });

    it('creates paper account successfully', async () => {
      const res = await request(app.getHttpServer()).post('/api/v1/paper/accounts').set('Cookie', `sessionId=${userCookie}`);
      expect(res.status).toBe(201);
      accountId = res.body.id;
    });
  });

  describe('2. Order Security & Ownership', () => {
    it('User B cannot GET User A account', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${accountId}`).set('Cookie', `sessionId=${adminCookie}`);
      expect(res.status).toBe(404);
    });

    it('User B cannot GET User A portfolio', async () => {
      const res = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${accountId}/portfolio`).set('Cookie', `sessionId=${adminCookie}`);
      expect(res.status).toBe(404);
    });
  });

  describe('3. DTO Financial Validation', () => {
    beforeAll(async () => {
      await request(app.getHttpServer()).post(`/api/v1/paper/market-data/instruments/${msftId}/prices`).set('Cookie', `sessionId=${userCookie}`).send({ price: '200' });
    });

    it('quantity = 0 -> 400', async () => {
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: msftId, side: 'BUY', type: 'MARKET', quantity: '0'
      });
      expect(res.status).toBe(400);
    });

    it('quantity < 0 -> 400', async () => {
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: msftId, side: 'BUY', type: 'MARKET', quantity: '-10'
      });
      expect(res.status).toBe(400);
    });

    it('quantity = "abc" -> 400', async () => {
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: msftId, side: 'BUY', type: 'MARKET', quantity: 'abc'
      });
      expect(res.status).toBe(400);
    });

    it('limitPrice = -50 -> 400', async () => {
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: msftId, side: 'BUY', type: 'LIMIT', quantity: '10', limitPrice: '-50'
      });
      expect(res.status).toBe(400);
    });

    it('LIMIT without limitPrice -> 400', async () => {
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: msftId, side: 'BUY', type: 'LIMIT', quantity: '10'
      });
      expect(res.status).toBe(400);
    });

    it('MARKET with limitPrice -> 400', async () => {
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: msftId, side: 'BUY', type: 'MARKET', quantity: '10', limitPrice: '200'
      });
      expect(res.status).toBe(400);
    });
  });

  describe('4. Transaction Atomicity', () => {
    it('failed execution leaves ZERO state (insufficient cash)', async () => {
      const preAcc = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${accountId}`).set('Cookie', `sessionId=${userCookie}`);
      const preLedger = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${accountId}/ledger`).set('Cookie', `sessionId=${userCookie}`);
      
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: msftId, side: 'BUY', type: 'MARKET', quantity: '1000'
      });
      expect(res.status).toBe(400);
      
      const postAcc = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${accountId}`).set('Cookie', `sessionId=${userCookie}`);
      const postLedger = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${accountId}/ledger`).set('Cookie', `sessionId=${userCookie}`);
      
      expect(postAcc.body.cashBalance).toBe(preAcc.body.cashBalance);
      expect(postLedger.body.length).toBe(preLedger.body.length);
      
      const openOrders = await prisma.order.findMany({ where: { accountId, instrumentId: msftId } });
      expect(openOrders.length).toBe(0);
    });
  });

  describe('5. Limit Order Determinism & Precision', () => {
    let limitOrderId: string;
    
    it('LIMIT BUY below current price -> remains OPEN', async () => {
      // MSFT current is 200
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: msftId, side: 'BUY', type: 'LIMIT', quantity: '5.5', limitPrice: '150.25' // Non-integer precision test
      });
      expect(res.status).toBe(201);
      limitOrderId = res.body.order.id;
      expect(res.body.order.status).toBe('OPEN');
    });

    it('unrelated price movement does not trigger', async () => {
      await request(app.getHttpServer()).post(`/api/v1/paper/market-data/instruments/${aaplId}/prices`).set('Cookie', `sessionId=${userCookie}`).send({ price: '120' });
      const order = await request(app.getHttpServer()).get(`/api/v1/paper/orders/${limitOrderId}`).set('Cookie', `sessionId=${userCookie}`);
      expect(order.body.status).toBe('OPEN');
    });

    it('price moves down to limit -> FILLED', async () => {
      await request(app.getHttpServer()).post(`/api/v1/paper/market-data/instruments/${msftId}/prices`).set('Cookie', `sessionId=${userCookie}`).send({ price: '150' });
      const order = await request(app.getHttpServer()).get(`/api/v1/paper/orders/${limitOrderId}`).set('Cookie', `sessionId=${userCookie}`);
      expect(order.body.status).toBe('FILLED');
    });
    
    it('FILLED -> CANCELLED is rejected', async () => {
      const res = await request(app.getHttpServer()).post(`/api/v1/paper/orders/${limitOrderId}/cancel`).set('Cookie', `sessionId=${userCookie}`);
      expect(res.status).toBe(400); // Invalid state transition
    });
  });

  describe('6. Ledger Append-Only', () => {
    it('Ledger API does not permit modification', async () => {
      // No PUT/DELETE endpoints exist in controller. Just asserting standard REST is 404.
      const res = await request(app.getHttpServer()).put(`/api/v1/paper/accounts/${accountId}/ledger/123`).set('Cookie', `sessionId=${userCookie}`);
      expect(res.status).toBe(404);
    });
  });

  describe('7. Order Idempotency', () => {
    it('same clientOrderId rejected', async () => {
      const clientOrderId = crypto.randomUUID();
      await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: aaplId, side: 'BUY', type: 'MARKET', quantity: '1', clientOrderId
      });
      const dup = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({
        instrumentId: aaplId, side: 'BUY', type: 'MARKET', quantity: '1', clientOrderId
      });
      expect(dup.status).toBe(400);
    });
  });

  describe('8. Final Deterministic Scenario', () => {
    beforeAll(async () => {
      await prisma.paperTradingLedger.deleteMany({ where: { accountId } });
      await prisma.orderFill.deleteMany({ where: { order: { accountId } } });
      await prisma.order.deleteMany({ where: { accountId } });
      await prisma.position.deleteMany({ where: { accountId } });
      
      const initialCash = new Prisma.Decimal('100000.00');
      await prisma.paperTradingAccount.update({ where: { id: accountId }, data: { cashBalance: initialCash } });
      await prisma.paperTradingLedger.create({ data: { accountId, type: 'ACCOUNT_INITIALIZED', amount: initialCash } });
      
      await request(app.getHttpServer()).post(`/api/v1/paper/market-data/instruments/${aaplId}/prices`).set('Cookie', `sessionId=${userCookie}`).send({ price: '100' });
    });

    it('Executes the exact scenario and matches values', async () => {
      // BUY 100 @ 100
      await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({ instrumentId: aaplId, side: 'BUY', type: 'MARKET', quantity: '100' });
      
      // Price moves to 110
      await request(app.getHttpServer()).post(`/api/v1/paper/market-data/instruments/${aaplId}/prices`).set('Cookie', `sessionId=${userCookie}`).send({ price: '110' });
      
      // SELL 40 @ 110
      await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${accountId}/orders`).set('Cookie', `sessionId=${userCookie}`).send({ instrumentId: aaplId, side: 'SELL', type: 'MARKET', quantity: '40' });

      const pRes = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${accountId}/portfolio`).set('Cookie', `sessionId=${userCookie}`);
      const p = pRes.body;

      expect(new Prisma.Decimal(p.cashBalance).equals(new Prisma.Decimal('94385.60'))).toBe(true);
      
      const aaplPos = p.positions.find((pos: { instrumentId: string }) => pos.instrumentId === aaplId);
      expect(new Prisma.Decimal(aaplPos.quantity).equals(new Prisma.Decimal('60'))).toBe(true);
      expect(new Prisma.Decimal(aaplPos.marketValue).equals(new Prisma.Decimal('6600.00'))).toBe(true);
      
      expect(new Prisma.Decimal(p.grossRealizedPnl).equals(new Prisma.Decimal('400.00'))).toBe(true);
      expect(new Prisma.Decimal(p.unrealizedPnl).equals(new Prisma.Decimal('600.00'))).toBe(true);
      expect(new Prisma.Decimal(p.totalFees).equals(new Prisma.Decimal('-14.40'))).toBe(true);
      expect(new Prisma.Decimal(p.realizedTradingPnl).equals(new Prisma.Decimal('385.60'))).toBe(true);
      
      expect(new Prisma.Decimal(p.totalPortfolioValue).equals(new Prisma.Decimal('100985.60'))).toBe(true);
      expect(new Prisma.Decimal(p.netPnl).equals(new Prisma.Decimal('985.60'))).toBe(true);

      // Verify equations
      // cash + position market value = portfolio value
      expect(new Prisma.Decimal(p.cashBalance).add(new Prisma.Decimal(p.totalPositionValue)).equals(new Prisma.Decimal(p.totalPortfolioValue))).toBe(true);
      
      // portfolio value - initial balance = net P&L
      expect(new Prisma.Decimal(p.totalPortfolioValue).sub(new Prisma.Decimal('100000')).equals(new Prisma.Decimal(p.netPnl))).toBe(true);
    });
  });
});

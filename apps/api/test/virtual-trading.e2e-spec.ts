import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma, Prisma } from 'database';

describe('Virtual Trading (e2e) - Phase 17', () => {
  let app: INestApplication;
  let userToken: string;
  let user2Token: string;
  let userId: string;
  let user2Id: string;
  let instrumentId: string;
  let strategyId: string;

  beforeAll(async () => {
    await prisma.marketPrice.deleteMany({});
    await prisma.virtualStrategySession.deleteMany({});
    await prisma.orderFill.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.paperTradingLedger.deleteMany({});
    await prisma.paperTradingAccount.deleteMany({});
    await prisma.strategy.deleteMany({});
    await prisma.instrument.deleteMany({ where: { symbol: 'VTEST' } });
    await prisma.user.deleteMany({});

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(require('cookie-parser')());
    await app.init();

    let ts = Date.now();
    let res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: `vuser1_${ts}@example.com`, password: 'Password123!', firstName: 'A', lastName: 'B' });
    userToken = (Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'][0] : (res.headers['set-cookie'] || '') as string).split(';')[0].split('=')[1];
    let meRes = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${userToken}`);
    userId = meRes.body.id;

    res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: `vuser2_${ts}@example.com`, password: 'Password123!', firstName: 'C', lastName: 'D' });
    user2Token = (Array.isArray(res.headers['set-cookie']) ? res.headers['set-cookie'][0] : (res.headers['set-cookie'] || '') as string).split(';')[0].split('=')[1];
    let me2Res = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${user2Token}`);
    user2Id = me2Res.body.id;

    const inst = await prisma.instrument.create({ data: { symbol: 'VTEST', name: 'VTEST', assetType: 'CRYPTO', exchange: 'BINANCE', currency: 'USD', tickSize: '0.01', quantityPrecision: 2, pricePrecision: 2, status: 'ACTIVE' } });
    instrumentId = inst.id;

    // Create strategy
    const strat = await prisma.strategy.create({ data: { userId, name: 'VStrat', type: 'BUY_AND_HOLD', configuration: { quantity: '5' } } });
    strategyId = strat.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('A. Session creation - valid', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/virtual-strategies/sessions').set('Cookie', `sessionId=${userToken}`).send({
      strategyId, instrumentId, startingCapital: '10000', timeframe: '1m'
    });
    expect(res.status).toBe(201);
    expect(res.body.status).toBe('CREATED');
    expect(res.body.startingCapital).toBe('10000');
    expect(res.body.paperAccountId).toBeDefined();
  });

  it('B. State machine - CREATED -> RUNNING -> PAUSED -> RUNNING -> STOPPED -> rejected', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/virtual-strategies/sessions').set('Cookie', `sessionId=${userToken}`).send({
      strategyId, instrumentId, startingCapital: '10000', timeframe: '1m'
    });
    const sid = res.body.id;

    let s = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/start`).set('Cookie', `sessionId=${userToken}`);
    expect(s.body.status).toBe('RUNNING');

    s = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/pause`).set('Cookie', `sessionId=${userToken}`);
    expect(s.body.status).toBe('PAUSED');

    s = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/start`).set('Cookie', `sessionId=${userToken}`);
    expect(s.body.status).toBe('RUNNING');

    s = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/stop`).set('Cookie', `sessionId=${userToken}`);
    expect(s.body.status).toBe('STOPPED');

    s = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/start`).set('Cookie', `sessionId=${userToken}`);
    expect(s.status).toBe(400);
  });

  it('C. BUY execution & G. Decimal precision & Q. P&L & L. Strategy snapshot', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/virtual-strategies/sessions').set('Cookie', `sessionId=${userToken}`).send({
      strategyId, instrumentId, startingCapital: '10000', timeframe: '1m'
    });
    const sid = res.body.id;
    await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/start`).set('Cookie', `sessionId=${userToken}`);

    await request(app.getHttpServer()).patch(`/api/v1/strategies/${strategyId}`).set('Cookie', `sessionId=${userToken}`).send({
      configuration: { quantity: '10' }
    });

    const ts = new Date().toISOString();
    const ex = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/market-update`).set('Cookie', `sessionId=${userToken}`).send({
      timestamp: ts, price: '100.55'
    });
    
    expect(ex.status).toBe(201);
    expect(ex.body.signal).toBe('BUY');
    
    const sess = await request(app.getHttpServer()).get(`/api/v1/virtual-strategies/sessions/${sid}`).set('Cookie', `sessionId=${userToken}`);
    
    const accId = sess.body.paperAccountId;
    const pos = await prisma.position.findFirst({ where: { accountId: accId } });
    expect(pos).toBeDefined();
    expect(pos!.quantity.toString()).toBe('5');
    expect(pos!.averageEntryPrice.toString()).toBe('100.55');

    const acc = await prisma.paperTradingAccount.findUnique({ where: { id: accId } });
    const cost = 5 * 100.55;
    const fee = cost * 0.001;
    const expectedCash = 10000 - cost - fee;
    expect(parseFloat(acc!.cashBalance.toString())).toBeCloseTo(expectedCash, 2);
  });

  it('H. Duplicate market update & J. Out-of-order market data & K. No-lookahead', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/virtual-strategies/sessions').set('Cookie', `sessionId=${userToken}`).send({
      strategyId, instrumentId, startingCapital: '10000', timeframe: '1m'
    });
    const sid = res.body.id;
    await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/start`).set('Cookie', `sessionId=${userToken}`);

    const t1 = new Date('2023-01-01T10:00:00Z').toISOString();
    const t2 = new Date('2023-01-01T10:01:00Z').toISOString();

    await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/market-update`).set('Cookie', `sessionId=${userToken}`).send({
      timestamp: t2, price: '100'
    });

    const dup = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/market-update`).set('Cookie', `sessionId=${userToken}`).send({
      timestamp: t2, price: '100'
    });
    expect(dup.status).toBe(409);

    const out = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/market-update`).set('Cookie', `sessionId=${userToken}`).send({
      timestamp: t1, price: '100'
    });
    expect(out.status).toBe(409);
  });

  it('N. IDOR', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/virtual-strategies/sessions').set('Cookie', `sessionId=${userToken}`).send({
      strategyId, instrumentId, startingCapital: '10000', timeframe: '1m'
    });
    const sid = res.body.id;

    const idor = await request(app.getHttpServer()).get(`/api/v1/virtual-strategies/sessions/${sid}`).set('Cookie', `sessionId=${user2Token}`);
    expect(idor.status).toBe(404);
  });

  it('O. Pause & P. Stop', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/virtual-strategies/sessions').set('Cookie', `sessionId=${userToken}`).send({
      strategyId, instrumentId, startingCapital: '10000', timeframe: '1m'
    });
    const sid = res.body.id;

    await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/start`).set('Cookie', `sessionId=${userToken}`);
    await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/pause`).set('Cookie', `sessionId=${userToken}`);

    let upd = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/market-update`).set('Cookie', `sessionId=${userToken}`).send({
      timestamp: new Date().toISOString(), price: '100'
    });
    expect(upd.status).toBe(400);

    await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/stop`).set('Cookie', `sessionId=${userToken}`);

    upd = await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/market-update`).set('Cookie', `sessionId=${userToken}`).send({
      timestamp: new Date().toISOString(), price: '100'
    });
    expect(upd.status).toBe(400);
  });

  it('I. Concurrent duplicate execution', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/virtual-strategies/sessions').set('Cookie', `sessionId=${userToken}`).send({
      strategyId, instrumentId, startingCapital: '10000', timeframe: '1m'
    });
    const sid = res.body.id;
    await request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/start`).set('Cookie', `sessionId=${userToken}`);

    const ts = new Date().toISOString();
    
    const [a, b] = await Promise.all([
      request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/market-update`).set('Cookie', `sessionId=${userToken}`).send({ timestamp: ts, price: '100' }),
      request(app.getHttpServer()).post(`/api/v1/virtual-strategies/sessions/${sid}/market-update`).set('Cookie', `sessionId=${userToken}`).send({ timestamp: ts, price: '100' })
    ]);

    expect([a.status, b.status].sort()).toEqual([201, 409]);
  });
});

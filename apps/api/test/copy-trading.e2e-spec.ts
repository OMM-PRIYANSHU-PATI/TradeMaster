import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma } from 'database';
import { CopyExecutionService } from '../src/copy-trading/copy-execution.service';

describe('Copy Trading (e2e)', () => {
  let app: INestApplication;
  let sourceToken: string;
  let followerToken: string;
  let sourceId: string;
  let followerId: string;
  let sourceAccountId: string;
  let targetAccountId: string;
  let instrumentId: string;

  beforeAll(async () => {
    await prisma.copyTrade.deleteMany({});
    await prisma.copyEvent.deleteMany({});
    await prisma.copyConfiguration.deleteMany({});
    await prisma.follow.deleteMany({});
    await prisma.orderFill.deleteMany({});
    await prisma.paperTradingLedger.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.marketPrice.deleteMany({});
    await prisma.brokerFill.deleteMany({});
    await prisma.brokerOrder.deleteMany({});
    await prisma.brokerAccount.deleteMany({});
    await prisma.brokerConnection.deleteMany({});
    await prisma.instrument.deleteMany({});
    await prisma.paperTradingAccount.deleteMany({});
    await prisma.user.deleteMany({});

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(require('cookie-parser')());
    await app.init();

    // Source User
    const res1 = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: 'source@example.com', password: 'Password123!', firstName: 'Source', lastName: 'Trader' });
    sourceToken = (res1.headers['set-cookie'] as unknown as string[])[0].split(';')[0].split('=')[1];
    
    // Follower User
    const res2 = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: 'follower@example.com', password: 'Password123!', firstName: 'Follower', lastName: 'User' });
    followerToken = (res2.headers['set-cookie'] as unknown as string[])[0].split(';')[0].split('=')[1];

    sourceId = (await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${sourceToken}`)).body.id;
    followerId = (await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${followerToken}`)).body.id;

    // Accounts
    // Accounts
    const acc1 = await prisma.paperTradingAccount.create({
      data: { userId: sourceId, accountName: 'Source Acc', initialBalance: 10000, cashBalance: 10000 }
    });
    sourceAccountId = acc1.id;

    const acc2 = await prisma.paperTradingAccount.create({
      data: { userId: followerId, accountName: 'Target Acc', initialBalance: 10000, cashBalance: 10000 }
    });
    targetAccountId = acc2.id;

    // Instrument
    instrumentId = 'instr-' + Date.now();
    await prisma.instrument.create({
      data: { id: instrumentId, symbol: 'COPYTEST', name: 'Copy Test Asset', assetType: 'CRYPTO', exchange: 'CRYPTO', tickSize: 0.01 }
    });
  });

  afterAll(async () => {
    await prisma.copyTrade.deleteMany({});
    await prisma.copyEvent.deleteMany({});
    await prisma.copyConfiguration.deleteMany({});
    await prisma.follow.deleteMany({});
    await prisma.orderFill.deleteMany({});
    await prisma.paperTradingLedger.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.marketPrice.deleteMany({});
    await prisma.brokerFill.deleteMany({});
    await prisma.brokerOrder.deleteMany({});
    await prisma.brokerAccount.deleteMany({});
    await prisma.brokerConnection.deleteMany({});
    await prisma.instrument.deleteMany({});
    await prisma.paperTradingAccount.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  it('1. Follow trader', async () => {
    const res = await request(app.getHttpServer()).post(`/api/v1/traders/${sourceId}/follow`).set('Cookie', `sessionId=${followerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.followerUserId).toBe(followerId);
  });

  it('2. Duplicate follow rejected/idempotent', async () => {
    const res = await request(app.getHttpServer()).post(`/api/v1/traders/${sourceId}/follow`).set('Cookie', `sessionId=${followerToken}`);
    expect(res.status).toBe(200);
  });

  it('3. Cannot follow self', async () => {
    const res = await request(app.getHttpServer()).post(`/api/v1/traders/${followerId}/follow`).set('Cookie', `sessionId=${followerToken}`);
    expect(res.status).toBe(400);
  });

  it('6. Create configuration', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/copy/configurations').set('Cookie', `sessionId=${followerToken}`).send({
      sourceUserId: sourceId,
      targetAccountId,
      allocationPercent: 50,
      maxExposure: 5000,
    });
    expect(res.status).toBe(201);
    expect(res.body.allocationPercent).toBe("50");
  });

  it('20. Private copy data cannot be accessed by another user (IDOR)', async () => {
    const confs = await request(app.getHttpServer()).get('/api/v1/copy/configurations').set('Cookie', `sessionId=${followerToken}`);
    const configId = confs.body[0].id;

    const res = await request(app.getHttpServer()).get(`/api/v1/copy/configurations/${configId}`).set('Cookie', `sessionId=${sourceToken}`);
    expect(res.status).toBe(403);
  });

  it('11. Source trade generates copy event & 12. Valid copy executes', async () => {
    // We must ensure there is a price in market data. Let's mock the market price by putting it in cache or directly using placeOrder for MARKET order.
    // The market data service will return 150 for our test symbol if it's missing, let's see.
    // Let's seed market price if possible, or just place an order.
    
    // Fake the price for COPYTEST
    await request(app.getHttpServer())
      .post(`/api/v1/paper/market-data/instruments/${instrumentId}/prices`)
      .set('Cookie', `sessionId=${sourceToken}`)
      .send({ price: '150' });
    
    const res = await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${sourceAccountId}/orders`).set('Cookie', `sessionId=${sourceToken}`).send({
      instrumentId, side: 'BUY', type: 'MARKET', quantity: '10'
    });
    console.log('Place order response:', res.status, res.body);

    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('FILLED');

    // Wait slightly for async event to process
    await new Promise(r => setTimeout(r, 100));

    // Check target account
    const followerOrders = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${targetAccountId}/orders`).set('Cookie', `sessionId=${followerToken}`);
    expect(followerOrders.body.length).toBe(1);
    
    // Allocation was 50%, source bought 10, follower should buy 5
    expect(followerOrders.body[0].filledQuantity).toBe("5");

    const copyEvents = await prisma.copyEvent.findMany();
    expect(copyEvents.length).toBe(1);
    expect(copyEvents[0].status).toBe('COMPLETED');
  });

  it('13. Same source event processed twice -> one target execution', async () => {
    // Manually trigger the event logic again
    const events = await prisma.copyEvent.findMany();
    const event = events[0];
    
    // Simulate double event emission
    const copyService = app.get(CopyExecutionService);
    const order = await prisma.order.findUnique({ where: { id: event.sourceOrderId }, include: { account: true, instrument: true } });
    
    await copyService.handlePaperOrderExecuted(order);

    const followerOrders = await request(app.getHttpServer()).get(`/api/v1/paper/accounts/${targetAccountId}/orders`).set('Cookie', `sessionId=${followerToken}`);
    // Should still be exactly 1 order
    expect(followerOrders.body.length).toBe(1);
  });

  it('18. Failed copy is persisted correctly', async () => {
    // Set max exposure to $1 to force failure
    const confs = await request(app.getHttpServer()).get('/api/v1/copy/configurations').set('Cookie', `sessionId=${followerToken}`);
    await request(app.getHttpServer()).patch(`/api/v1/copy/configurations/${confs.body[0].id}`).set('Cookie', `sessionId=${followerToken}`).send({
      maxExposure: 1
    });

    // Source trades again
    await request(app.getHttpServer()).post(`/api/v1/paper/accounts/${sourceAccountId}/orders`).set('Cookie', `sessionId=${sourceToken}`).send({
      instrumentId, side: 'BUY', type: 'MARKET', quantity: '10'
    });
    await new Promise(r => setTimeout(r, 100));

    const copyTrades = await prisma.copyTrade.findMany({ where: { status: 'FAILED' } });
    expect(copyTrades.length).toBeGreaterThan(0);
    expect(copyTrades[0].errorMessage).toContain('Max exposure limit exceeded');
  });
});

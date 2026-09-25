import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma, Prisma } from 'database';

describe('Journal API (e2e)', () => {
  let app: INestApplication;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;
  let u1StratId: string;
  let u1OrderId: string;
  let u2StratId: string;

  beforeAll(async () => {
    // Setup clean DB
    await prisma.journalAttachment.deleteMany({});
    await prisma.journalTag.deleteMany({});
    await prisma.journalEntry.deleteMany({});
    await prisma.orderFill.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.position.deleteMany({});
    await prisma.paperTradingAccount.deleteMany({});
    await prisma.marketPrice.deleteMany({});
    await prisma.instrument.deleteMany({});
    await prisma.strategy.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.user.deleteMany({});

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(require('cookie-parser')());
    await app.init();

    // Create User 1
    const argon2 = require('argon2');
    const hash = await argon2.hash('password');
    const u1 = await prisma.user.create({ data: { email: 'journal1@test.com', passwordHash: hash } });
    user1Id = u1.id;
    let res1 = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'journal1@test.com', password: 'password' });
    user1Token = (res1.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';

    // Create User 2
    const u2 = await prisma.user.create({ data: { email: 'journal2@test.com', passwordHash: hash } });
    user2Id = u2.id;
    let res2 = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'journal2@test.com', password: 'password' });
    user2Token = (res2.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';

    // Create Strategy for User 1
    const s1 = await prisma.strategy.create({ data: { user: { connect: { id: user1Id } }, name: 'S1', type: 'MOMENTUM', configuration: {} } });
    u1StratId = s1.id;

    // Create Strategy for User 2
    const s2 = await prisma.strategy.create({ data: { user: { connect: { id: user2Id } }, name: 'S2', type: 'MEAN_REVERSION', configuration: {} } });
    u2StratId = s2.id;

    // Create Order for User 1
    const inst = await prisma.instrument.create({ data: { symbol: 'AAPL', name: 'Apple', assetType: 'STOCK', exchange: 'NASDAQ', tickSize: new Prisma.Decimal(0.01) } });
    const acc1 = await prisma.paperTradingAccount.create({ data: { user: { connect: { id: user1Id } }, accountName: 'acc1', initialBalance: new Prisma.Decimal(10000), cashBalance: new Prisma.Decimal(10000) } });
    const o1 = await prisma.order.create({
      data: {
        accountId: acc1.id,
        instrumentId: inst.id,
        clientOrderId: 'o1',
        side: 'BUY',
        type: 'MARKET',
        quantity: new Prisma.Decimal(10)
      }
    });
    u1OrderId = o1.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('Anonymous -> 401', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/journal')
      .expect(401);
  });

  let entryId: string;

  it('Create journal entry (User 1) -> 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/journal')
      .set('Cookie', [`sessionId=${user1Token}`])
      .send({
        reviewType: 'TRADE',
        notes: 'Good trade',
        emotion: 'Calm',
        strategyId: u1StratId,
        orderId: u1OrderId,
        tags: ['breakout', 'morning'],
        attachments: ['https://example.com/pic1.png']
      })
      .expect(201);

    expect(res.body.userId).toBe(user1Id);
    expect(res.body.reviewType).toBe('TRADE');
    expect(res.body.tags).toHaveLength(2);
    expect(res.body.attachments).toHaveLength(1);
    entryId = res.body.id;
  });

  it('User 1 -> User 2 Strategy reference -> rejected 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/journal')
      .set('Cookie', [`sessionId=${user1Token}`])
      .send({
        reviewType: 'TRADE',
        strategyId: u2StratId // belongs to User 2
      })
      .expect(403);
  });

  it('User 2 -> Cannot read User 1 journal (403 or 404)', async () => {
    await request(app.getHttpServer())
      .get(`/api/v1/journal/${entryId}`)
      .set('Cookie', [`sessionId=${user2Token}`])
      .expect(403); // Service throws ForbiddenException
  });

  it('List filters by tag', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/journal?tags=breakout`)
      .set('Cookie', [`sessionId=${user1Token}`])
      .expect(200);

    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe(entryId);
  });

  it('Update journal entry (User 1)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/journal/${entryId}`)
      .set('Cookie', [`sessionId=${user1Token}`])
      .send({
        notes: 'Updated notes',
        tags: ['afternoon'] // Replaces old tags
      })
      .expect(200);
      
    expect(res.body.notes).toBe('Updated notes');
    expect(res.body.tags).toHaveLength(1);
    expect(res.body.tags[0].name).toBe('afternoon');
  });
  
  it('Delete journal entry (User 2) -> 403', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/journal/${entryId}`)
      .set('Cookie', [`sessionId=${user2Token}`])
      .expect(403);
  });

  it('Delete journal entry (User 1) -> 200', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/journal/${entryId}`)
      .set('Cookie', [`sessionId=${user1Token}`])
      .expect(200);

    await request(app.getHttpServer())
      .get(`/api/v1/journal/${entryId}`)
      .set('Cookie', [`sessionId=${user1Token}`])
      .expect(404);
  });
});

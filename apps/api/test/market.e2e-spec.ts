import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma } from 'database';
import * as crypto from 'crypto';

describe('Market & Watchlist (e2e)', () => {
  let app: INestApplication;
  let testSessionId: string;
  let otherSessionId: string;
  let testUser: { id: string; email: string };
  let otherUser: { id: string; email: string };
  
  let testInstrument: { id: string };
  let decInstrument: { id: string };
  let tinyInstrument: { id: string };
  let errInstrument: { id: string };
  let timeoutInstrument: { id: string };
  let malformedInstrument: { id: string };
  
  let watchlistId: string;
  let uniqueSuffix: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(require('cookie-parser')());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    // Clean DB specifically for these entities
    await prisma.watchlistItem.deleteMany();
    await prisma.watchlist.deleteMany();
    
    uniqueSuffix = Date.now().toString();

    // Users
    testUser = await prisma.user.create({
      data: { email: `market1-${uniqueSuffix}@test.com`, passwordHash: 'hash' },
    });
    otherUser = await prisma.user.create({
      data: { email: `market2-${uniqueSuffix}@test.com`, passwordHash: 'hash' },
    });

    // Instruments
    testInstrument = await prisma.instrument.create({
      data: { symbol: `TEST-AAPL-${uniqueSuffix}`, name: 'Test Apple', assetType: 'STOCK', exchange: 'NASDAQ', tickSize: 0.01 },
    });
    decInstrument = await prisma.instrument.create({
      data: { symbol: `TEST-DECIMAL-${uniqueSuffix}`, name: 'Decimal', assetType: 'STOCK', exchange: 'NASDAQ', tickSize: 0.00000001 },
    });
    tinyInstrument = await prisma.instrument.create({
      data: { symbol: `TEST-TINY-${uniqueSuffix}`, name: 'Tiny', assetType: 'CRYPTO', exchange: 'BINANCE', tickSize: 0.00000001 },
    });
    errInstrument = await prisma.instrument.create({
      data: { symbol: `ERROR-${uniqueSuffix}`, name: 'Error', assetType: 'STOCK', exchange: 'NASDAQ', tickSize: 0.01 },
    });
    timeoutInstrument = await prisma.instrument.create({
      data: { symbol: `TIMEOUT-${uniqueSuffix}`, name: 'Timeout', assetType: 'STOCK', exchange: 'NASDAQ', tickSize: 0.01 },
    });
    malformedInstrument = await prisma.instrument.create({
      data: { symbol: `MALFORMED-${uniqueSuffix}`, name: 'Malformed', assetType: 'STOCK', exchange: 'NASDAQ', tickSize: 0.01 },
    });

    // Sessions
    testSessionId = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: {
        userId: testUser.id,
        tokenHash: crypto.createHash('sha256').update(testSessionId).digest('hex'),
        expiresAt: new Date(Date.now() + 1000000),
      }
    });

    otherSessionId = crypto.randomBytes(32).toString('hex');
    await prisma.session.create({
      data: {
        userId: otherUser.id,
        tokenHash: crypto.createHash('sha256').update(otherSessionId).digest('hex'),
        expiresAt: new Date(Date.now() + 1000000),
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Live Market Data (Quotes)', () => {
    it('returns exact precision for floating points (LIVE)', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/market/quotes/${decInstrument.id}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(200);

      expect(response.body.state).toBe('LIVE');
      expect(response.body.price).toBe('100.12345678'); // Preserves exact string
    });

    it('returns exact precision for tiny numbers', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/market/quotes/${tinyInstrument.id}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(200);

      expect(response.body.price).toBe('0.00000001');
    });

    it('falls back to CACHED gracefully on Provider 500', async () => {
      // Setup: insert valid cached price first
      await prisma.marketPrice.create({
        data: {
          instrumentId: errInstrument.id,
          price: 150,
          timestamp: new Date(),
          source: 'PAPER',
        }
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/market/quotes/${errInstrument.id}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(200);

      expect(response.body.state).toBe('CACHED');
      expect(response.body.price).toBe('150');
    });

    it('falls back to STALE gracefully on Provider Timeout with old cache', async () => {
      // Insert old cache (6 minutes ago)
      await prisma.marketPrice.create({
        data: {
          instrumentId: timeoutInstrument.id,
          price: 200,
          timestamp: new Date(Date.now() - 360000), // 6 minutes ago
          source: 'PAPER',
        }
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/market/quotes/${timeoutInstrument.id}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(200);

      expect(response.body.state).toBe('STALE');
      expect(response.body.price).toBe('200');
    });

    it('returns 404 UNAVAILABLE if provider fails and no cache exists', async () => {
      // Use malformed instrument. It will throw BadRequest which triggers fallback logic.
      // But there is no cache!
      const response = await request(app.getHttpServer())
        .get(`/api/v1/market/quotes/${malformedInstrument.id}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(404);

      expect(response.body.state).toBe('UNAVAILABLE');
    });

    it('does NOT mutate PaperTrading logic via MarketData API', async () => {
      // Just check that hitting the endpoint doesn't break.
      await request(app.getHttpServer())
        .get(`/api/v1/market/quotes/${testInstrument.id}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(200);

      // Verify no random orders were created
      const orders = await prisma.order.count({ where: { account: { userId: testUser.id } } });
      expect(orders).toBe(0);
    });
  });

  describe('Watchlists (Full CRUD & IDOR)', () => {
    it('Create Watchlist', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/watchlists')
        .set('Cookie', [`sessionId=${testSessionId}`])
        .send({ name: 'Alpha' })
        .expect(201);
      watchlistId = res.body.id;
    });

    it('Rename Watchlist (Update)', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/watchlists/${watchlistId}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .send({ name: 'Alpha Updated' })
        .expect(200);
      expect(res.body.name).toBe('Alpha Updated');
    });

    it('IDOR: Block Update by Other User', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/watchlists/${watchlistId}`)
        .set('Cookie', [`sessionId=${otherSessionId}`])
        .send({ name: 'Hacked' })
        .expect(403);
    });

    it('Add Instrument', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/watchlists/${watchlistId}/instruments`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .send({ instrumentId: testInstrument.id })
        .expect(201);
    });

    it('Prevent duplicate Instrument addition', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/watchlists/${watchlistId}/instruments`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .send({ instrumentId: testInstrument.id })
        .expect(400); // BadRequest
    });

    it('Remove Instrument', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/watchlists/${watchlistId}/instruments/${testInstrument.id}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(204);
    });

    it('IDOR: Block Delete by Other User', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/watchlists/${watchlistId}`)
        .set('Cookie', [`sessionId=${otherSessionId}`])
        .expect(403);
    });

    it('Delete Watchlist', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/watchlists/${watchlistId}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(204);

      // Verify it's gone
      await request(app.getHttpServer())
        .get(`/api/v1/watchlists/${watchlistId}`)
        .set('Cookie', [`sessionId=${testSessionId}`])
        .expect(404);
    });
  });
});

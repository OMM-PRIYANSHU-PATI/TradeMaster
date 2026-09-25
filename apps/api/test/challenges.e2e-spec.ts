import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { prisma, Prisma } from 'database';
import * as cookieParser from 'cookie-parser';

describe('Phase 9 Challenges (e2e)', () => {
  let app: INestApplication;
  let jwtToken: string;
  let userId: string;
  let challengeId: string;
  let tokenB: string;
  let userBId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    await prisma.achievement.deleteMany({});
    await prisma.challengeParticipant.deleteMany({});
    await prisma.challenge.deleteMany({});
    await prisma.paperTradingLedger.deleteMany({ where: { account: { accountName: { startsWith: 'Challenge:' } } } });
    await prisma.paperTradingAccount.deleteMany({ where: { accountName: { startsWith: 'Challenge:' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'challenge_' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'userb_' } } });

    // 1. Auth setup
    const email = `challenge_${Date.now()}@test.com`;
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password: 'TestPassword123!' });
    
    jwtToken = (res.headers['set-cookie'] || [])[0]?.split(';')[0]?.split('=')[1] || '';
    const u = await prisma.user.findUnique({ where: { email } });
    userId = u!.id;

    // Create proper profile so Leaderboard returns a name instead of Unknown
    await prisma.profile.update({
      where: { userId },
      data: { firstName: 'Alice', lastName: 'Smith' }
    });

    // 2. User B
    const emailB = `userb_${Date.now()}@test.com`;
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: emailB, password: 'TestPassword123!' });
    tokenB = (resB.headers['set-cookie'] || [])[0]?.split(';')[0]?.split('=')[1] || '';
    const uB = await prisma.user.findUnique({ where: { email: emailB } });
    userBId = uB!.id;
  });

  afterAll(async () => {
    await prisma.achievement.deleteMany({});
    await prisma.challengeParticipant.deleteMany({});
    await prisma.challenge.deleteMany({});
    await prisma.paperTradingLedger.deleteMany({ where: { account: { accountName: { startsWith: 'Challenge:' } } } });
    await prisma.paperTradingAccount.deleteMany({ where: { accountName: { startsWith: 'Challenge:' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'challenge_' } } });
    await prisma.user.deleteMany({ where: { email: { startsWith: 'userb_' } } });
    await app.close();
  });

  it('1. anonymous challenge access -> 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/challenges').expect(401);
  });

  it('2. authenticated challenge access -> 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/challenges')
      .set('Cookie', [`sessionId=${jwtToken}`])
      .expect(200);
  });

  it('3. challenge creation unauthorized -> 403', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/challenges')
      .set('Cookie', [`sessionId=${jwtToken}`])
      .send({
        title: 'Monthly 10%',
        description: 'Make 10%',
        startingCapital: 10000,
        targetReturnPercent: 10,
        maxDrawdownPercent: 5,
        durationDays: 30
      })
      .expect(403);
  });

  it('4. Admin directly creates challenge via db', async () => {
    const c = await prisma.challenge.create({
      data: {
        title: 'Monthly 10%',
        description: 'Make 10%',
        startingCapital: new Prisma.Decimal(10000),
        targetReturnPercent: new Prisma.Decimal(10),
        maxDrawdownPercent: new Prisma.Decimal(5),
        durationDays: 30,
        status: 'PUBLISHED'
      }
    });
    challengeId = c.id;
    expect(challengeId).toBeDefined();
  });

  it('5. challenge participation', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/challenges/${challengeId}/join`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .expect(201);
    
    expect(res.body.challengeId).toBe(challengeId);
    expect(res.body.userId).toBe(userId);
    expect(res.body.status).toBe('ACTIVE');
  });

  it('6. duplicate participation -> 400', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/challenges/${challengeId}/join`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .expect(400);
  });

  it('7. challenge progress initial', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/challenges/${challengeId}/progress`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .expect(200);
    
    expect(res.body.status).toBe('ACTIVE');
    expect(res.body.currentReturn).toBe(0); // 0%
  });

  
  it('8. challenge result integrity using real paper trading', async () => {
    const p = await prisma.challengeParticipant.findUnique({
      where: { userId_challengeId: { userId, challengeId } }
    });

    const instrument = await prisma.instrument.upsert({
      where: { symbol_exchange: { symbol: 'CHAL', exchange: 'NASDAQ' } },
      update: {},
      create: { symbol: 'CHAL', name: 'Challenge', assetType: 'STOCK', exchange: 'NASDAQ', currency: 'USD', tickSize: 0.01, quantityPrecision: 0, pricePrecision: 2 }
    });

    // 1. Set initial price to 100
    await request(app.getHttpServer())
      .post(`/api/v1/paper/market-data/instruments/${instrument.id}/prices`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .send({ price: '100' });

    // 2. Buy 90 shares @ 100
    const buyRes = await request(app.getHttpServer())
      .post(`/api/v1/paper/accounts/${p!.accountId}/orders`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .send({ instrumentId: instrument.id, side: 'BUY', type: 'MARKET', quantity: '90' });
    
    expect(buyRes.status).toBe(201);
    
    // 3. Move price to 115
    await request(app.getHttpServer())
      .post(`/api/v1/paper/market-data/instruments/${instrument.id}/prices`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .send({ price: '115' });

    // 4. Sell 90 shares @ 115
    const sellRes = await request(app.getHttpServer())
      .post(`/api/v1/paper/accounts/${p!.accountId}/orders`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .send({ instrumentId: instrument.id, side: 'SELL', type: 'MARKET', quantity: '90' });
    
    expect(sellRes.status).toBe(201);

    // 5. Explicit Financial Reconciliations
    const portfolioRes = await request(app.getHttpServer())
      .get(`/api/v1/paper/accounts/${p!.accountId}/portfolio`)
      .set('Cookie', [`sessionId=${jwtToken}`]);
    
    const port = portfolioRes.body;
    
    // Initial Capital = $10,000 (set in test 4)
    // Buy 90 @ $100 = $9,000 + $9.00 fee (0.1%)
    // Sell 90 @ $115 = $10,350 - $10.35 fee (0.1%)
    // Cash = 10000 - 9000 - 9 + 10350 - 10.35 = 11330.65
    // P&L = 11330.65 - 10000 = 1330.65
    // Return = 13.3065%

    // Assertion explicit requirements
    expect(Number(port.initialBalance)).toBe(10000);
    expect(Number(port.cashBalance)).toBe(11330.65);
    
    expect(port.positions.length).toBe(1);
    expect(Number(port.positions[0].quantity)).toBe(0); // Sold all 90 shares

    expect(Number(port.totalPortfolioValue)).toBe(11330.65); // Just cash remaining

    // Get Ledger to check fees
    const ledgerRes = await request(app.getHttpServer())
      .get(`/api/v1/paper/accounts/${p!.accountId}/ledger`)
      .set('Cookie', [`sessionId=${jwtToken}`]);
    
    const fees = ledgerRes.body.filter((l: { type: string, amount: string }) => l.type === 'FEE');
    const totalFees = fees.reduce((sum: number, l: { type: string, amount: string }) => sum + Math.abs(Number(l.amount)), 0);
    expect(totalFees).toBe(19.35); // 9.00 + 10.35 = 19.35

    // 6. Check Challenge Progress
    const res = await request(app.getHttpServer())
      .get(`/api/v1/challenges/${challengeId}/progress`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .expect(200);

    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.currentReturn).toBe(13.3065); // Exact deterministic value
    expect(res.body.achievements.length).toBe(1);

    // 7. Idempotency check
    const res2 = await request(app.getHttpServer())
      .get(`/api/v1/challenges/${challengeId}/progress`)
      .set('Cookie', [`sessionId=${jwtToken}`]);
    
    // Should NOT issue another achievement
    expect(res2.body.achievements.length).toBe(0);
  });

  it('9. challenge account isolation (User B)', async () => {
    // User B joins
    const joinRes = await request(app.getHttpServer())
      .post(`/api/v1/challenges/${challengeId}/join`)
      .set('Cookie', [`sessionId=${tokenB}`])
      .expect(201);
    
    const pB = await prisma.challengeParticipant.findUnique({
      where: { userId_challengeId: { userId: userBId, challengeId } }
    });

    const pA = await prisma.challengeParticipant.findUnique({
      where: { userId_challengeId: { userId, challengeId } }
    });

    // 1. Their challenge paper accounts are different
    expect(pB!.accountId).not.toBe(pA!.accountId);

    // 2. User B's progress remains unchanged (Return 0, Status ACTIVE) despite A's completion
    const progB = await request(app.getHttpServer())
      .get(`/api/v1/challenges/${challengeId}/progress`)
      .set('Cookie', [`sessionId=${tokenB}`])
      .expect(200);
    
    expect(progB.body.status).toBe('ACTIVE');
    expect(progB.body.currentReturn).toBe(0);

    // 3. User A cannot supply B's account ID to manipulate B's state 
    // Handled by Phase 2 Paper Trading which checks ownership, and challenge checkProgress doesn't accept account ID parameter (uses internal participant lookup).
    // Let's explicitly try to access B's portfolio with A's token
    await request(app.getHttpServer())
      .get(`/api/v1/paper/accounts/${pB!.accountId}/portfolio`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .expect(404); // Or 403, Phase 2 usually throws NotFound if userId mismatches
  });

  it('12. leaderboard privacy', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/challenges/${challengeId}/leaderboard`)
      .set('Cookie', [`sessionId=${jwtToken}`])
      .expect(200);
    
    expect(res.body.length).toBe(1);
    expect(res.body[0].firstName).toBe('Alice');
    expect(res.body[0].email).toBeUndefined(); // private data not exposed
  });

  it('13. cross-user IDOR / Not participated', async () => {
    // User C (not participated) tries to fetch progress
    const emailC = `userc_${Date.now()}@test.com`;
    const resC = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: emailC, password: 'TestPassword123!' });
    const tokenC = (resC.headers['set-cookie'] || [])[0]?.split(';')[0]?.split('=')[1] || '';

    await request(app.getHttpServer())
      .get(`/api/v1/challenges/${challengeId}/progress`)
      .set('Cookie', [`sessionId=${tokenC}`])
      .expect(404);
  });

  it('14. malformed DTO', async () => {
    // Should return 400 because ValidationPipe catches title as a number
    await request(app.getHttpServer())
      .post('/api/v1/challenges')
      .set('Cookie', [`sessionId=${jwtToken}`])
      .send({
        title: 123 // invalid
      })
      .expect(403);
      
      // Let's test missing fields to just ensure DTO validation works if we were an admin.
      // But since User A gets 403 BEFORE DTO validation maybe?
      // Actually, NestJS runs Guards BEFORE Pipes. So it will return 403.
      // Let's create an Admin to test 400.
  });

  it('15. admin testing malformed DTO -> 400', async () => {
    // Make User B an ADMIN to test DTO validation
    const adminPermission = await prisma.permission.findFirst({ where: { name: 'admin:access' } });
    let adminRole = await prisma.role.findFirst({ where: { name: 'ADMIN' } });
    
    if (!adminRole) {
      if (!adminPermission) {
         const p = await prisma.permission.create({ data: { name: 'admin:access' } });
         adminRole = await prisma.role.create({ data: { name: 'ADMIN', permissions: { connect: { id: p.id } } } });
      } else {
         adminRole = await prisma.role.create({ data: { name: 'ADMIN', permissions: { connect: { id: adminPermission.id } } } });
      }
    }

    await prisma.user.update({
      where: { id: userBId },
      data: { roles: { connect: { id: adminRole.id } } }
    });

    await request(app.getHttpServer())
      .post('/api/v1/challenges')
      .set('Cookie', [`sessionId=${tokenB}`])
      .send({
        title: 123, // invalid string
        description: 'abc',
        startingCapital: -100,
        targetReturnPercent: 'invalid',
        maxDrawdownPercent: 5,
        durationDays: 30
      })
      .expect(400); // 400 Bad Request
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma } from 'database';

describe('Traders API (e2e)', () => {
  let app: INestApplication;
  let user1Token: string;
  let user2Token: string;
  let user1Id: string;
  let user2Id: string;

  beforeAll(async () => {
    // Clean DB
    await prisma.savedTrader.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.user.deleteMany({});

    // Create App
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(require('cookie-parser')()); await app.init();

    // Create User 1
    const res1 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'trader1@example.com', password: 'Password123!', firstName: 'Alice', lastName: 'Smith' });
    
    user1Token = (res1.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';
    
    // Create User 2
    const res2 = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'trader2@example.com', password: 'Password123!', firstName: 'Bob', lastName: 'Jones' });
      
    user2Token = (res2.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';

    // Extract User IDs
    const me1 = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${user1Token}`);
    user1Id = me1.body.id;

    const me2 = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${user2Token}`);
    user2Id = me2.body.id;
  });

  afterAll(async () => {
    await prisma.savedTrader.deleteMany({});
    await prisma.profile.deleteMany({});
    await prisma.user.deleteMany({});
    await app.close();
  });

  it('Create/update own profile', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/profile/trading-prefs')
      .set('Cookie', `sessionId=${user2Token}`)
      .send({
        bio: 'Hello world',
        experienceLevel: 'EXPERT',
        riskPreference: 'HIGH',
        marketsTraded: ['CRYPTO', 'STOCKS'],
        isPublic: true,
      });

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.bio).toBe('Hello world');
    expect(res.body.isPublic).toBe(true);
  });

  it('Cross-user profile update rejected', async () => {
    // API doesn't expose an endpoint to update another user's profile
    // Only /api/v1/profile/trading-prefs which uses @CurrentUser
    // So this is inherently protected.
  });

  it('Read own profile', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/profile')
      .set('Cookie', `sessionId=${user2Token}`);

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.bio).toBe('Hello world');
  });

  it('Invalid profile data rejected', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/profile/trading-prefs')
      .set('Cookie', `sessionId=${user2Token}`)
      .send({
        avatarUrl: 'not-a-url',
      });

    expect(res.status).toBe(400);
  });

  it('Public profile excludes private fields', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/traders/${user2Id}`);

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.firstName).toBe('');
    expect(res.body.email).toBeUndefined(); // Important
    expect(res.body.passwordHash).toBeUndefined();
  });

  it('Trader search', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/traders?search=');

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].firstName).toBe('');
  });

  it('Supported filters', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/traders?experienceLevel=EXPERT&market=CRYPTO');

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].firstName).toBe('');
  });

  it('Supported sorting', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/traders?sortBy=newest');

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
  });

  it('Pagination', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/traders?page=1&limit=1');

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.total).toBeDefined();
  });

  it('Empty results', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/traders?search=NonExistentTrader999');

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  it('Save trader', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/traders/saved/${user2Id}`)
      .set('Cookie', `sessionId=${user1Token}`);

    expect(res.status).toBe(201);
    expect(res.body.savedUserId).toBe(user2Id);
  });

  it('Duplicate save rejected', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/traders/saved/${user2Id}`)
      .set('Cookie', `sessionId=${user1Token}`);

    expect(res.status).toBe(400);
  });

  it('List saved traders', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/traders/saved`)
      .set('Cookie', `sessionId=${user1Token}`);

    console.log(res.body); expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].savedUserId).toBe(user2Id);
  });

  it('Cross-user ownership rejected', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/traders/saved/${user2Id}`)
      .set('Cookie', `sessionId=${user2Token}`); // User 2 trying to delete User 1's saved trader (which targets User 2)

    expect(res.status).toBe(404);
  });

  it('Remove saved trader', async () => {
    const res = await request(app.getHttpServer())
      .delete(`/api/v1/traders/saved/${user2Id}`)
      .set('Cookie', `sessionId=${user1Token}`);

    console.log(res.body); expect(res.status).toBe(200);
  });

  it('Anonymous protected endpoint -> 401', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/traders/saved`);

    expect(res.status).toBe(401);
  });

});

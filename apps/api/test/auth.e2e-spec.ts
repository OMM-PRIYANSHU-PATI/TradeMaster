import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import * as cookieParser from 'cookie-parser';
import * as crypto from 'crypto';
import { prisma } from 'database';
import * as argon2 from 'argon2';

describe('Auth E2E Lifecycle', () => {
  let app: INestApplication;

  const userEmail = 'user@trademaster.com';
  const userPassword = 'Password123!';
  let userCookie: string;

  const adminEmail = 'admin-e2e@trademaster.com';
  const adminPassword = 'AdminPassword123!';
  let adminCookie: string;

  const adminNoAccessEmail = 'admin-no-access@trademaster.com';
  const adminNoAccessPassword = 'AdminPassword123!';
  let adminNoAccessCookie: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    await app.init();

    await prisma.auditLog.deleteMany();
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.permission.deleteMany();
    await prisma.role.deleteMany();

    const adminPermission = await prisma.permission.create({ data: { name: 'admin:access' } });
    
    await prisma.role.create({ data: { name: 'USER' } });
    
    const adminRole = await prisma.role.create({
      data: {
        name: 'ADMIN',
        permissions: { connect: { id: adminPermission.id } }
      }
    });

    const adminNoAccessRole = await prisma.role.create({
      data: { name: 'ADMIN_NO_ACCESS' }
    });

    const adminHash = await argon2.hash(adminPassword);
    await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash: adminHash,
        roles: { connect: { id: adminRole.id } }
      }
    });

    const adminNoAccessHash = await argon2.hash(adminNoAccessPassword);
    await prisma.user.create({
      data: {
        email: adminNoAccessEmail,
        passwordHash: adminNoAccessHash,
        roles: { connect: { id: adminNoAccessRole.id } }
      }
    });
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  it('1. Register -> 201', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: userEmail, password: userPassword });
    if (res.status !== 201) console.log('REGISTER FAILED:', res.body);
    expect(res.status).toBe(201);
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    if (cookies && cookies[0]) {
      userCookie = cookies[0].split(';')[0].split('=')[1];
    }
  });

  it('2. Verify User exists & Password stored securely', async () => {
    const user = await prisma.user.findUnique({ where: { email: userEmail } });
    expect(user).toBeDefined();
    expect(user?.passwordHash).toBeDefined();
    expect(user?.passwordHash).not.toEqual(userPassword);
    
    const isValid = await argon2.verify(user!.passwordHash, userPassword);
    expect(isValid).toBe(true);
  });

  it('3. Verify USER role assigned', async () => {
    const user = await prisma.user.findUnique({ where: { email: userEmail }, include: { roles: true } });
    expect(user?.roles.some(r => r.name === 'USER')).toBe(true);
  });

  it('4. Verify Session Security Requirements', async () => {
    const session = await prisma.session.findFirst({ where: { user: { email: userEmail } } });
    expect(session).toBeDefined();

    const rawToken = userCookie;
    
    expect(rawToken).not.toEqual(session!.tokenHash);
    
    const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    expect(computedHash).toEqual(session!.tokenHash);
  });

  it('5. Login Admin -> 200', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: adminEmail, password: adminPassword });
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    if (cookies && cookies[0]) {
      adminCookie = cookies[0].split(';')[0].split('=')[1];
    }
  });

  it('6. Login Admin No Access -> 200', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: adminNoAccessEmail, password: adminNoAccessPassword });
    expect(res.status).toBe(200);
    const cookies = res.headers['set-cookie'] as unknown as string[] | undefined;
    if (cookies && cookies[0]) {
      adminNoAccessCookie = cookies[0].split(';')[0].split('=')[1];
    }
  });

  it('7. /auth/me -> Secure Response', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${userCookie}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(userEmail);
    expect(res.body.passwordHash).toBeUndefined();
    expect(res.body.tokenHash).toBeUndefined();
  });

  it('8. Anonymous RBAC -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/health');
    expect(res.status).toBe(401);
  });

  it('9. USER RBAC -> 403', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/health').set('Cookie', `sessionId=${userCookie}`);
    expect(res.status).toBe(403);
  });

  it('10. ADMIN without permission -> 403', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/health').set('Cookie', `sessionId=${adminNoAccessCookie}`);
    expect(res.status).toBe(403);
  });

  it('11. ADMIN with permission -> 200', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/admin/health').set('Cookie', `sessionId=${adminCookie}`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ADMIN_OK');
  });

  it('12. Logout -> 200 & Revoked', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/logout').set('Cookie', `sessionId=${userCookie}`);
    expect(res.status).toBe(200);

    const session = await prisma.session.findFirst({ where: { user: { email: userEmail } } });
    expect(session?.revokedAt).toBeDefined();
    expect(session?.revokedAt).not.toBeNull();
  });

  it('13. /auth/me after logout -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${userCookie}`);
    expect(res.status).toBe(401);
  });

  it('14. Duplicate Registration -> 400', async () => {
    const res = await request(app.getHttpServer()).post('/api/v1/auth/register').send({ email: adminEmail, password: adminPassword });
    expect(res.status).toBe(400); 
  });

  it('15. Rate Limiting -> 429', async () => {
    let status = 200;
    for (let i = 0; i < 15; i++) {
      const res = await request(app.getHttpServer()).post('/api/v1/auth/login').send({ email: 'rate@trademaster.com', password: 'abc' });
      if (res.status === 429) {
        status = 429;
        break;
      }
    }
    expect(status).toBe(429);
  });
});

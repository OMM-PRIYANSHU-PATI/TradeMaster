import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { prisma } from 'database';
import * as cookieParser from 'cookie-parser';
import { GeminiService } from '../src/ai/gemini/gemini.service';

describe('AI API (e2e)', () => {
  let app: INestApplication;
  let userToken: string;
  let userId: string;

  const mockGeminiService = {
    generateContent: jest.fn().mockResolvedValue('Mocked AI response'),
  };

  beforeAll(async () => {
    // Clear DB
    await prisma.savedTrader.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.session.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GeminiService)
      .useValue(mockGeminiService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();

    // Create user
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'aiuser@example.com', password: 'Password123!', firstName: 'Test', lastName: 'User' });
      
    userToken = (res.headers['set-cookie'] as unknown as string[])?.[0]?.split(';')[0]?.split('=')[1] || '';
    const me = await request(app.getHttpServer()).get('/api/v1/auth/me').set('Cookie', `sessionId=${userToken}`);
    userId = me.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Anonymous access to coach -> 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/coach')
      .send({ message: 'Hello' });
    expect(res.status).toBe(401);
  });

  it('Coach endpoint with empty message -> 400', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/coach')
      .set('Cookie', `sessionId=${userToken}`)
      .send({ message: '' });
    expect(res.status).toBe(400);
  });

  it('Coach endpoint with valid message -> 200', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/coach')
      .set('Cookie', `sessionId=${userToken}`)
      .send({ message: 'Explain RSI' });
      
    expect(res.status).toBe(200);
    expect(res.body.response).toBe('Mocked AI response');
    expect(mockGeminiService.generateContent).toHaveBeenCalledWith(
      'Explain RSI',
      expect.any(String),
      expect.any(String)
    );
  });

  it('Cannot explain backtest you do not own', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/ai/backtests/some-random-id/explain')
      .set('Cookie', `sessionId=${userToken}`);
      
    expect(res.status).toBe(404); // Or 403 based on getBacktest implementation
  });
});

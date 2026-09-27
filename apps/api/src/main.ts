import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import * as cookieParser from 'cookie-parser';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() { 
  const requiredEnvVars = ['DATABASE_URL', 'BROKER_ENCRYPTION_KEY'];
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      console.error(`FATAL: Missing required environment variable: ${envVar}`);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }

  const app = await NestFactory.create(AppModule);
  
  app.use(helmet());
  app.use(cookieParser());
  
  app.enableCors({
    origin: process.env.WEB_URL || 'http://localhost:4002',
    credentials: true,
  });

  app.useGlobalFilters(new AllExceptionsFilter());
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true
  }));

  const port = process.env.API_PORT || 3001;
  await app.listen(port);
}
bootstrap();

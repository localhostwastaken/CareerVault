import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module.js';

async function bootstrap(): Promise<void> {
  // rawBody lets the payments webhook verify provider signatures on the unparsed body.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });
  app.useLogger(app.get(Logger));
  // Trust exactly one fronting proxy so per-IP throttling sees the real client IP
  // (X-Forwarded-For) instead of bucketing everyone under the proxy address.
  app.set('trust proxy', 1);

  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  // Security response headers before any route runs (HSTS, X-Content-Type-Options,
  // X-Frame-Options: DENY, no X-Powered-By, ...). This is a pure JSON API called
  // cross-site with credentials, so contentSecurityPolicy and crossOriginEmbedderPolicy
  // are disabled: a page CSP/COEP adds no protection here and breaks Swagger UI.
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.disable('x-powered-by');
  app.enableCors({
    origin: config.get<string>('CORS_ORIGIN'),
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger exposes the entire API surface, so keep it off in production unless
  // an operator explicitly opts in via ENABLE_SWAGGER=true.
  const enableSwagger =
    config.get<string>('NODE_ENV') !== 'production' ||
    config.get<string>('ENABLE_SWAGGER') === 'true';
  if (enableSwagger) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('CareerVault API')
      .setDescription('Career verification platform API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup(
      'api/docs',
      app,
      SwaggerModule.createDocument(app, swaggerConfig),
    );
    app.get(Logger).log('Swagger UI mounted at /api/docs', 'Bootstrap');
  }

  const port = config.get<number>('PORT') ?? 9900;
  await app.listen(port);
  app
    .get(Logger)
    .log(`CareerVault API on http://localhost:${port}/api/v1`, 'Bootstrap');
}

void bootstrap();

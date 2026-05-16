import dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure CORS for demo purposes. Use CLIENT_ORIGIN or CLIENT_ORIGINS (comma-separated).
  const rawOrigins = process.env.CLIENT_ORIGIN || process.env.CLIENT_ORIGINS || '';
  const origins = rawOrigins
    ? rawOrigins.split(',').map((s) => s.trim()).filter(Boolean)
    : ['http://localhost:5173'];

  app.enableCors({
    origin: (origin, callback) => {
      // allow non-browser requests (e.g. curl / server-to-server)
      if (!origin) return callback(null, true);
      if (rawOrigins === '*') return callback(null, true);
      if (origins.indexOf(origin) !== -1) return callback(null, true);
      // allow localhost origins for demo convenience
      try {
        const url = new URL(origin);
        if (url.hostname === 'localhost' || url.hostname.endsWith('.localhost')) {
          return callback(null, true);
        }
      } catch (e) {
        // ignore
      }
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  });

  const port = parseInt(process.env.PORT || process.env.API_PORT || '3001', 10);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
}

bootstrap();

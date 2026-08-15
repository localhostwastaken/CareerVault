import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/v1/health (GET) is reachable', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect((res) => {
        // Terminus returns 200 when healthy, 503 when a dependency is down —
        // either proves the app booted and the route is wired.
        if (![200, 503].includes(res.status)) {
          throw new Error(`unexpected status ${res.status}`);
        }
      });
  });
});

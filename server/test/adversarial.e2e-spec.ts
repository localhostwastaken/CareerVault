import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Adversarial input against the real app and database (input hardening). Each attack is
// sent the way a client would send it, and the assertion is about what reached, or did not
// reach, the database and the response body.
const SLUG = randomBytes(4).toString('hex');
const PASSWORD = 'Adversarial-e2e-1';
const SQLI_NAME = "Robert'); DROP TABLE users;--";
// What a client must never see in an error: stack frames, ORM or table internals.
const LEAK = /prisma|stack|at .+\.ts:\d+|SELECT |INSERT |"users"|relation /i;

describe('adversarial input (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let storageDir: string;
  let prisma: PrismaService;

  const api = (path: string) => `/api/v1${path}`;
  const errorOf = (res: request.Response) =>
    (res.body as { error: { code: string; message: string } }).error;

  beforeAll(async () => {
    storageDir = mkdtempSync(join(tmpdir(), 'cv-adv-e2e-'));
    process.env.STORAGE_LOCAL_DIR = storageDir;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    http = app.getHttpServer() as App;
    prisma = moduleFixture.get(PrismaService);
  }, 60_000);

  afterAll(async () => {
    if (prisma)
      await prisma.user.deleteMany({ where: { email: { contains: SLUG } } });
    await app?.close();
    if (storageDir) rmSync(storageDir, { recursive: true, force: true });
  });

  describe('SQL injection', () => {
    it('refuses a classic tautology in the login email at the DTO', async () => {
      const res = await request(http)
        .post(api('/auth/login'))
        .send({ email: "' OR 1=1 --", password: 'anything' })
        .expect(400);

      expect(res.text).not.toMatch(LEAK);
    });

    it('stores SQL-looking text verbatim, as data, and every table survives', async () => {
      const usersBefore = await prisma.user.count();
      await request(http)
        .post(api('/auth/register'))
        .send({
          email: `sqli-${SLUG}@e2e-mail.test`,
          password: PASSWORD,
          fullName: SQLI_NAME,
          accountType: 'HOLDER',
        })
        .expect(201);

      const stored = await prisma.user.findFirstOrThrow({
        where: { email: `sqli-${SLUG}@e2e-mail.test` },
        select: { fullName: true },
      });
      expect(stored.fullName).toBe(SQLI_NAME);
      // The table is still there and grew (other suites register users in parallel).
      expect(await prisma.user.count()).toBeGreaterThan(usersBefore);
    });

    it('answers an injection-shaped share token as not found, without a query', async () => {
      const res = await request(http)
        .get(api(`/verify/${encodeURIComponent("' OR '1'='1")}`))
        .expect(200);

      expect((res.body as { data: { verdict: string } }).data.verdict).toBe(
        'NOT_FOUND',
      );
    });
  });

  describe('payload tampering', () => {
    it('refuses a __proto__ key in a JSON body', async () => {
      const res = await request(http)
        .post(api('/auth/login'))
        .set('Content-Type', 'application/json')
        .send(
          '{"email":"a@b.test","password":"x","__proto__":{"isAdmin":true}}',
        )
        .expect(400);

      expect(errorOf(res).message).toContain('a reserved key');
    });

    it('refuses constructor.prototype nested in a body', async () => {
      await request(http)
        .post(api('/auth/login'))
        .send({
          email: 'a@b.test',
          password: 'x',
          meta: { constructor: { prototype: { isAdmin: true } } },
        })
        .expect(400);
    });

    it('refuses a constructor key in the query string', async () => {
      await request(http)
        .get(api(`/verify/document/${randomUUID()}?constructor[prototype]=1`))
        .expect(400);
    });

    it('refuses a script tag in free text before it can reach a PDF or an email', async () => {
      const res = await request(http)
        .post(api('/auth/register'))
        .send({
          email: `xss-${SLUG}@e2e-mail.test`,
          password: PASSWORD,
          fullName: '<script>alert(document.cookie)</script>',
          accountType: 'HOLDER',
        })
        .expect(400);

      expect(errorOf(res).message).toContain('markup');
      expect(res.text).not.toContain('<script>');
    });

    it('refuses control characters', async () => {
      await request(http)
        .post(api('/auth/login'))
        .send({ email: 'nul\u0000@b.test', password: 'x' })
        .expect(400);
    });

    it('refuses a field the DTO does not declare', async () => {
      await request(http)
        .post(api('/auth/login'))
        .send({ email: 'a@b.test', password: 'x', role: 'ORG_ADMIN' })
        .expect(400);
    });
  });

  describe('malformed identifiers', () => {
    it.each([
      'not-a-uuid',
      "1' OR '1'='1",
      '../../etc/passwd',
      '00000000-0000-0000-0000-00000000000g',
    ])('refuses document id %j with a 400 and no internals', async (id) => {
      const res = await request(http)
        .get(api(`/verify/document/${encodeURIComponent(id)}`))
        .expect(400);

      expect(res.text).not.toMatch(LEAK);
    });

    it('refuses a magic-link token that is not 64 hex characters', async () => {
      await request(http)
        .post(api('/auth/verify-magic-link'))
        .send({ token: "x' UNION SELECT password_hash FROM users --" })
        .expect(400);
    });
  });
});

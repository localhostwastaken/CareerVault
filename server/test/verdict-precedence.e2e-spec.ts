import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { STEP_UP } from './fixtures/step-up.js';

// Verdict precedence over HTTP: INVALID > REVOKED > EXPIRED > VERIFIED. A document is issued
// through the real request → sign → approve flow, back-dated past its expiry, then edited
// through the encrypting client (so the row is still well-formed ciphertext). Public
// verification must report the tampering, never mask it as a merely expired document.

const SLUG = Date.now().toString(36);
const DOMAIN = `e2e-prec-${SLUG}.test`;
const PASSWORD = 'Password123@';

const CONDUCT =
  'Worked on the payments team and conducted themselves professionally throughout.';

interface Session {
  token: string;
  userId: string;
}

describe('verdict precedence (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let storageDir: string;
  let prisma: PrismaService;

  let admin: Session;
  let manager: Session;
  let hr: Session;
  let holder: Session;
  let orgId: string;
  let documentId: string;

  const api = (path: string) => `/api/v1${path}`;

  // Supertest types the body as `any`; every read goes through here instead.
  const data = <T>(res: request.Response): T => (res.body as { data: T }).data;

  const post = (path: string, body: object, token?: string) => {
    const req = request(http).post(api(path)).send(body);
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  const get = (path: string, token?: string) => {
    const req = request(http).get(api(path));
    return token ? req.set('Authorization', `Bearer ${token}`) : req;
  };

  const register = async (email: string): Promise<Session> => {
    const res = await post('/auth/register', {
      email,
      password: PASSWORD,
      fullName: email.split('@')[0],
      accountType: 'HOLDER',
    }).expect(201);
    const result = data<{ token: string; user: { id: string } }>(res);
    return { token: result.token, userId: result.user.id };
  };

  beforeAll(async () => {
    // Disposable key store and PDF storage; LocalKmsService reads the directory in its
    // constructor, and process.env wins over .env in @nestjs/config.
    storageDir = mkdtempSync(join(tmpdir(), 'cv-prec-e2e-'));
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

    admin = await register(`admin@${DOMAIN}`);
    manager = await register(`mgr-${SLUG}@e2e-mail.test`);
    hr = await register(`hr-${SLUG}@e2e-mail.test`);
    holder = await register(`emp-${SLUG}@e2e-mail.test`);

    const orgRes = await post(
      '/orgs',
      { name: `E2E Prec ${SLUG}`, domain: DOMAIN },
      admin.token,
    ).expect(201);
    orgId = data<{ id: string }>(orgRes).id;
    await post(`/orgs/${orgId}/verify-domain`, {}, admin.token).expect(200);
    const addMember = (email: string, role: string) =>
      post(`/orgs/${orgId}/members`, { email, role }, admin.token).expect(201);
    await addMember(`mgr-${SLUG}@e2e-mail.test`, 'MANAGER');
    await addMember(`hr-${SLUG}@e2e-mail.test`, 'HR');
    for (const signer of [manager, hr])
      await post(
        '/employee-keys/enroll',
        { ...STEP_UP, organizationId: orgId },
        signer.token,
      ).expect(201);

    const requested = await post(
      '/documents/request',
      {
        type: 'EXPERIENCE_LETTER',
        organizationId: orgId,
        managerUserId: manager.userId,
      },
      holder.token,
    ).expect(201);
    documentId = data<{ id: string }>(requested).id;

    await post(
      `/documents/${documentId}/sign`,
      {
        contentJson: {
          letterKind: 'EXPERIENCE',
          employeeName: 'Holder Person',
          employeeCode: `EMP-${SLUG}`,
          designation: 'Software Engineer',
          employmentType: 'FULL_TIME',
          dateOfJoining: '2022-06-01',
          conductSummary: CONDUCT,
          signatoryName: 'ignored — the server stamps the real signer',
          signatoryDesignation: 'Head of Engineering',
        },
        stepUp: STEP_UP,
      },
      manager.token,
    ).expect(200);

    await post(
      `/documents/${documentId}/approve`,
      { stepUp: STEP_UP },
      hr.token,
    ).expect(200);
  }, 90_000);

  afterAll(async () => {
    // Keyed on DOMAIN and SLUG, which are always set. An id is unset when beforeAll fails
    // early, and Prisma drops an undefined filter, so `{ organizationId: orgId }` would then
    // delete every document (and with them every organization) in the dev database.
    // Documents hold Restrict FKs to users and the org, so they go first. The erased holder
    // is matched by id, because erasure rewrites its email.
    if (prisma) {
      const ids = [admin, manager, hr, holder].flatMap((s) =>
        s ? [s.userId] : [],
      );
      await prisma.document.deleteMany({
        where: { organization: { domain: DOMAIN } },
      });
      await prisma.employeeKey.deleteMany({
        where: { organization: { domain: DOMAIN } },
      });
      await prisma.organization.deleteMany({ where: { domain: DOMAIN } });
      await prisma.user.deleteMany({
        where: { OR: [{ email: { contains: SLUG } }, { id: { in: ids } }] },
      });
    }
    await app?.close();
    if (storageDir) rmSync(storageDir, { recursive: true, force: true });
  }, 30_000);

  const verdictOf = async () =>
    data<{ verdict: string }>(
      await get(`/verify/document/${documentId}`).expect(200),
    ).verdict;

  const PAST = new Date('2020-01-01T00:00:00.000Z');

  it('verifies the freshly issued document', async () => {
    expect(await verdictOf()).toBe('VERIFIED');
  });

  it('reports the genuine document as EXPIRED once past its expiry', async () => {
    await prisma.document.update({
      where: { id: documentId },
      data: { expiresAt: PAST },
    });
    expect(await verdictOf()).toBe('EXPIRED');
  });

  it('reports the expired document as INVALID once its content is edited', async () => {
    const doc = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      select: { contentJson: true },
    });
    await prisma.document.update({
      where: { id: documentId },
      data: {
        contentJson: {
          ...(doc.contentJson as Record<string, unknown>),
          designation: 'Chief Technology Officer',
        },
      },
    });
    expect(await verdictOf()).toBe('INVALID');
  });
});

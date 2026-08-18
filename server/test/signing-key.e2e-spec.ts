import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Regression net for the failure that stopped managers signing on the deployed app:
// org signing keys are FILES, their reference is a DATABASE column, and the two drift the
// moment the key store is not durable. A container without a mounted disk loses the files
// on every deploy while the pointer survives, so every signature attempt died on an
// unhandled ENOENT that surfaced as a bare "Internal server error".
//
// The invariant these tests protect is not just "signing works again" — it is that
// recovering from key loss must NOT invalidate documents already issued. That only holds
// because each document records the public key it was signed under.

const SLUG = Date.now().toString(36);
const DOMAIN = `e2e-${SLUG}.test`;
const PASSWORD = 'Password123@';

const CONDUCT =
  'Worked on the platform team and conducted themselves professionally throughout.';

interface Session {
  token: string;
  userId: string;
}

describe('org signing key durability (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let storageDir: string;
  let prisma: PrismaService;

  let admin: Session;
  let manager: Session;
  let hr: Session;
  let holder: Session;
  let orgId: string;

  const api = (path: string) => `/api/v1${path}`;

  // Supertest types the response body as `any`; funnel every read through these so the
  // shape is asserted in one place instead of leaking `any` into each test.
  const data = <T>(res: request.Response): T => (res.body as { data: T }).data;
  const errorOf = (res: request.Response): { code: string; message: string } =>
    (res.body as { error: { code: string; message: string } }).error;

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

  const requestDocument = async (): Promise<string> => {
    const res = await post(
      '/documents/request',
      {
        type: 'EXPERIENCE_LETTER',
        organizationId: orgId,
        managerUserId: manager.userId,
        notes: 'For a visa application.',
      },
      holder.token,
    ).expect(201);
    return data<{ id: string }>(res).id;
  };

  const signAs = (documentId: string) =>
    post(
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
      },
      manager.token,
    );

  /** The wrapped per-org private keys. `master.key` is not one of them. */
  const orgKeyFiles = (): string[] =>
    readdirSync(join(storageDir, 'kms')).filter(
      (f) => f.endsWith('.key') && f !== 'master.key',
    );

  beforeAll(async () => {
    // Point the key store somewhere disposable BEFORE the module is built —
    // LocalKmsService resolves the directory in its constructor. process.env wins over
    // .env in @nestjs/config, so this is the whole isolation story.
    storageDir = mkdtempSync(join(tmpdir(), 'cv-kms-e2e-'));
    process.env.STORAGE_LOCAL_DIR = storageDir;

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [(await import('../src/app.module.js')).AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    // Same pipe as main.ts — the DTOs are the contract under test.
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
      { name: `E2E Acme ${SLUG}`, domain: DOMAIN },
      admin.token,
    ).expect(201);
    orgId = data<{ id: string }>(orgRes).id;

    // DNS_DRIVER=local bypasses the TXT check; this is what mints the org signing key.
    await post(`/orgs/${orgId}/verify-domain`, {}, admin.token).expect(200);

    await post(
      `/orgs/${orgId}/members`,
      { email: `mgr-${SLUG}@e2e-mail.test`, role: 'MANAGER' },
      admin.token,
    ).expect(201);
    await post(
      `/orgs/${orgId}/members`,
      { email: `hr-${SLUG}@e2e-mail.test`, role: 'HR' },
      admin.token,
    ).expect(201);
  }, 60_000);

  afterAll(async () => {
    // Documents hold Restrict FKs to users and the org, so they go first.
    await prisma.document.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({ where: { email: { contains: SLUG } } });
    await app?.close();
    rmSync(storageDir, { recursive: true, force: true });
  }, 30_000);

  let firstDocumentId: string;
  let firstDocumentHash: string;

  it('signs a draft and hands it to HR', async () => {
    firstDocumentId = await requestDocument();

    const signed = await signAs(firstDocumentId).expect(200);
    expect(data<{ status: string }>(signed).status).toBe('PENDING_HR');

    const approved = await post(
      `/documents/${firstDocumentId}/approve`,
      {},
      hr.token,
    ).expect(200);
    const doc = data<{ status: string; documentHash: string }>(approved);
    expect(doc.status).toBe('ISSUED');
    firstDocumentHash = doc.documentHash;

    expect(orgKeyFiles()).toHaveLength(1);
  }, 60_000);

  it('reports a readable failure when the key material cannot be decrypted', async () => {
    const documentId = await requestDocument();
    const [keyFile] = orgKeyFiles();
    const path = join(storageDir, 'kms', keyFile);

    // File present but unreadable — the shape of a surviving disk wrapped under a
    // different KMS_MASTER_KEY. hasKey() passes, so this exercises the decrypt path.
    writeFileSync(path, 'not-a-valid-wrapped-key', 'utf8');

    const res = await signAs(documentId).expect(503);
    expect(errorOf(res).code).toBe('SIGNING_KEY_UNAVAILABLE');
    // The old behaviour: a bare 500 whose message told the manager nothing.
    expect(errorOf(res).message).not.toBe('Internal server error');

    await prisma.document.deleteMany({ where: { id: documentId } });
  }, 60_000);

  it('re-keys the org when the key store is gone, without invalidating issued documents', async () => {
    const before = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { kmsKeyId: true },
    });

    // Exactly what a redeploy onto an ephemeral disk does: the files vanish, the database
    // pointer does not.
    for (const file of orgKeyFiles()) {
      rmSync(join(storageDir, 'kms', file));
    }

    const documentId = await requestDocument();
    const signed = await signAs(documentId).expect(200);
    expect(data<{ status: string }>(signed).status).toBe('PENDING_HR');

    const after = await prisma.organization.findUniqueOrThrow({
      where: { id: orgId },
      select: { kmsKeyId: true },
    });
    expect(after.kmsKeyId).not.toBe(before.kmsKeyId);

    expect(
      await prisma.auditLog.count({
        where: { entityId: orgId, action: 'ORG_SIGNING_KEY_REPLACED' },
      }),
    ).toBeGreaterThan(0);

    // The point of the whole design: a document issued under the PREVIOUS key still
    // verifies, because it carries the key it was signed with.
    const verify = await get(`/verify/hash/${firstDocumentHash}`).expect(200);
    const { verdict } = data<{ verdict: string }>(verify);
    expect(['VERIFIED', 'VERIFIED_PENDING_ANCHOR']).toContain(verdict);
  }, 60_000);
});

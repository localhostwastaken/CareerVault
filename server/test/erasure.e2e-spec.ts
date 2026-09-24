import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// GDPR Art. 17 end to end: an issued, anchored document whose holder erases their account
// keeps only its hash, signatures and Merkle proof. Its public lookup then returns no
// content and says the holder exercised their right to erasure, its credential can no longer
// be downloaded and says why, its PDF and version notes are gone, and the erasure itself is
// on the audit trail without any PII.

const SLUG = `${Date.now().toString(36)}er`;
const DOMAIN = `e2e-erase-${SLUG}.test`;
const PASSWORD = 'Password123@';
const HOLDER_NAME = `Erasable Person ${SLUG}`;
const EMPLOYEE_CODE = `EMP-${SLUG}`;

interface Session {
  token: string;
  userId: string;
}

interface VerifyResult {
  verdict: string;
  erased: boolean;
  document: { content: Record<string, unknown> } | null;
  checks: { key: string; status: string; detail: string }[];
}

describe('GDPR erasure (e2e)', () => {
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
  let documentHash: string;
  let rootHash: string | undefined;

  const api = (path: string) => `/api/v1${path}`;
  const data = <T>(res: request.Response): T => (res.body as { data: T }).data;

  const post = (path: string, body: object, token?: string) => {
    const req = request(http).post(api(path)).send(body);
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

  const verify = async () =>
    data<VerifyResult>(
      await request(http)
        .get(api(`/verify/hash/${documentHash}`))
        .expect(200),
    );

  const pdfPath = () =>
    join(storageDir, 'objects', 'documents', `${documentId}.pdf`);

  const changeSummaries = async () =>
    (
      await prisma.documentVersion.findMany({
        where: { documentId },
        select: { changeSummary: true },
      })
    ).map((v) => v.changeSummary);

  beforeAll(async () => {
    // process.env wins over .env: a disposable key store and PDF directory, and no cron, so
    // a platform-wide midnight batch can never run inside this app.
    storageDir = mkdtempSync(join(tmpdir(), 'cv-erase-e2e-'));
    process.env.STORAGE_LOCAL_DIR = storageDir;
    process.env.WORKER = 'false';

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
      { name: `E2E Erase ${SLUG}`, domain: DOMAIN },
      admin.token,
    ).expect(201);
    orgId = data<{ id: string }>(orgRes).id;
    await post(`/orgs/${orgId}/verify-domain`, {}, admin.token).expect(200);
    const addMember = (email: string, role: string) =>
      post(`/orgs/${orgId}/members`, { email, role }, admin.token).expect(201);
    await addMember(`mgr-${SLUG}@e2e-mail.test`, 'MANAGER');
    await addMember(`hr-${SLUG}@e2e-mail.test`, 'HR');

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
          employeeName: HOLDER_NAME,
          employeeCode: EMPLOYEE_CODE,
          designation: 'Software Engineer',
          employmentType: 'FULL_TIME',
          dateOfJoining: '2022-06-01',
          conductSummary: 'Delivered the payments migration on schedule.',
          signatoryName: 'ignored — the server stamps the real signer',
          signatoryDesignation: 'Head of Engineering',
        },
      },
      manager.token,
    ).expect(200);
    const approved = await post(
      `/documents/${documentId}/approve`,
      { notes: `Confirmed with ${HOLDER_NAME}` },
      hr.token,
    ).expect(200);
    documentHash = data<{ documentHash: string }>(approved).documentHash;

    const batch = await post('/merkle/run', {}, admin.token).expect(200);
    rootHash = data<{ rootHash: string }>(batch).rootHash;
  }, 90_000);

  afterAll(async () => {
    // Keyed on DOMAIN and SLUG, which are always set: an undefined id would drop the filter
    // and delete every row. The erased holder is matched by id, because erasure rewrote its
    // email. Documents hold Restrict FKs to users and the org, so they go first.
    if (prisma) {
      const ids = [admin, manager, hr, holder].flatMap((s) =>
        s ? [s.userId] : [],
      );
      await prisma.auditLog.deleteMany({
        where: { action: 'USER_ERASED', entityId: { in: ids } },
      });
      await prisma.document.deleteMany({
        where: { organization: { domain: DOMAIN } },
      });
      if (rootHash) await prisma.merkleRoot.deleteMany({ where: { rootHash } });
      await prisma.organization.deleteMany({ where: { domain: DOMAIN } });
      await prisma.user.deleteMany({
        where: { OR: [{ email: { contains: SLUG } }, { id: { in: ids } }] },
      });
    }
    await app?.close();
    if (storageDir) rmSync(storageDir, { recursive: true, force: true });
  }, 30_000);

  it('discloses the anchored document before erasure', async () => {
    const result = await verify();

    expect(result.verdict).toBe('VERIFIED');
    expect(result.erased).toBe(false);
    expect(result.document?.content.employeeName).toBe(HOLDER_NAME);
    expect(existsSync(pdfPath())).toBe(true);
    expect(await changeSummaries()).toContain(
      `Approved by HR: Confirmed with ${HOLDER_NAME}`,
    );
  });

  describe('after the holder erases their account', () => {
    beforeAll(async () => {
      await request(http)
        .delete(api('/users/me'))
        .set('Authorization', `Bearer ${holder.token}`)
        .expect(200);
    });

    it('returns no content from the public lookup and says why', async () => {
      const res = await request(http)
        .get(api(`/verify/hash/${documentHash}`))
        .expect(200);
      const result = data<VerifyResult>(res);

      expect(result.verdict).toBe('INVALID');
      expect(result.erased).toBe(true);
      expect(result.document).toBeNull();
      expect(result.checks.find((c) => c.key === 'integrity')).toMatchObject({
        status: 'fail',
        detail:
          'The holder exercised their right to erasure; the original content no longer exists.',
      });
      expect(res.text).not.toContain(HOLDER_NAME);
      expect(res.text).not.toContain(EMPLOYEE_CODE);
      expect(res.text).not.toContain('employeeName');
    });

    it('keeps the hash, both signatures and the Merkle proof, and nothing else', async () => {
      const document = await prisma.document.findUniqueOrThrow({
        where: { id: documentId },
        include: { merkleProof: true },
      });

      expect(document.status).toBe('ANCHORED');
      expect(document.documentHash).toBe(documentHash);
      expect(document.managerSignature).toEqual(expect.any(String));
      expect(document.hrSignature).toEqual(expect.any(String));
      expect(document.merkleProof).not.toBeNull();
      expect(document.salt).toBeNull();
      expect(document.contentJson).toEqual({});
      expect(document.renderedPdfUrl).toBeNull();
    });

    it('stores the scrubbed content still sealed', async () => {
      const [row] = await prisma.$queryRaw<{ content_json: unknown }[]>`
        SELECT content_json FROM documents WHERE id = ${documentId}::uuid`;

      expect(row.content_json).toMatch(/^cvenc:v1:/);
    });

    it('deletes the stored PDF', () => {
      expect(existsSync(pdfPath())).toBe(false);
    });

    it('drops the free-text change summary of every version', async () => {
      const summaries = await changeSummaries();

      expect(summaries.length).toBeGreaterThan(0);
      expect(summaries.every((summary) => summary === null)).toBe(true);
    });

    it('answers a credential download by the issuer with 410 Gone, saying why', async () => {
      const res = await request(http)
        .get(api(`/documents/${documentId}/credential`))
        .set('Authorization', `Bearer ${hr.token}`)
        .expect(410);

      expect(res.body).toMatchObject({
        success: false,
        error: {
          code: 'GONE',
          message: expect.stringContaining(
            'exercised their right to erasure',
          ) as string,
        },
      });
      expect(res.text).not.toContain(HOLDER_NAME);
    });

    it('records the erasure on the audit trail without PII', async () => {
      const rows = await prisma.auditLog.findMany({
        where: { action: 'USER_ERASED', entityId: holder.userId },
      });

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({
        actorId: holder.userId,
        entityType: 'USER',
        retentionTier: 'COMPLIANCE',
        newValue: null,
        oldValue: null,
      });
      expect(JSON.stringify(rows[0])).not.toContain(SLUG);
    });
  });
});

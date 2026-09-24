import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  generateSalt,
  hashDocument,
  signingStatementHash,
} from '../src/common/utils/crypto.util.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// FIELD_ENCRYPTION_STRICT=true (production) against a real database. Someone with write
// access to Postgres but not KMS_MASTER_KEY plants a complete, self-consistent document
// the only way they can: plaintext content and salt, a matching hash, and signatures made
// with their own RSA key, pinned as the document's signing key. Strict reads refuse it,
// and the Merkle batch's integrity gate skips it while the genuine document still anchors.

const SLUG = `${Date.now().toString(36)}st`;
const DOMAIN = `e2e-strict-${SLUG}.test`;
const PASSWORD = 'Password123@';
const PLANTED_NAME = `Planted Person ${SLUG}`;

interface Session {
  token: string;
  userId: string;
}

describe('strict field encryption and the batch integrity gate (e2e)', () => {
  let app: INestApplication;
  let http: App;
  let storageDir: string;
  let prisma: PrismaService;

  let admin: Session;
  let manager: Session;
  let hr: Session;
  let holder: Session;
  let orgId: string;
  let validId: string;
  let validHash: string;
  const plantedId = randomUUID();
  let plantedHash: string;
  let plantedSalt: string;
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

  const statusOf = async (id: string) => {
    const [row] = await prisma.$queryRaw<
      { status: string; proofs: bigint }[]
    >`SELECT d.status::text AS status,
             (SELECT count(*) FROM document_merkle_proofs p WHERE p.document_id = d.id) AS proofs
      FROM documents d WHERE d.id = ${id}::uuid`;
    return { status: row.status, proofs: Number(row.proofs) };
  };

  // Built with raw SQL, as a DB-only attacker would, because the app would seal it.
  const plant = async () => {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId, role: { in: ['MANAGER', 'HR'] } },
      select: { id: true, role: true },
    });
    const memberId = (role: string) =>
      members.find((m) => m.role === role)?.id as string;
    const content = {
      employeeName: PLANTED_NAME,
      designation: 'Chief Executive Officer',
    };
    plantedSalt = generateSalt();
    plantedHash = hashDocument(content, plantedSalt);
    const { privateKey, publicKey } = generateKeyPairSync('rsa', {
      modulusLength: 2048,
    });
    const signAs = (role: 'MANAGER' | 'HR') =>
      sign(
        'sha256',
        Buffer.from(
          signingStatementHash(plantedHash, role, memberId(role)),
          'hex',
        ),
        privateKey,
      ).toString('base64');
    const pem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

    await prisma.$executeRaw`
      INSERT INTO documents (id, type, status, holder_id, organization_id,
        signer_member_id, approver_member_id, content_json, salt, document_hash,
        manager_signature, hr_signature, signing_public_key_pem, issued_at, updated_at)
      VALUES (${plantedId}::uuid, 'EXPERIENCE_LETTER', 'ISSUED', ${holder.userId}::uuid,
        ${orgId}::uuid, ${memberId('MANAGER')}::uuid, ${memberId('HR')}::uuid,
        ${JSON.stringify(content)}::jsonb, ${plantedSalt}, ${plantedHash},
        ${signAs('MANAGER')}, ${signAs('HR')}, ${pem}, now(), now())`;
  };

  beforeAll(async () => {
    // process.env wins over .env: strict reads, a disposable key store, and no cron, so a
    // platform-wide midnight batch can never run inside this app.
    storageDir = mkdtempSync(join(tmpdir(), 'cv-strict-e2e-'));
    process.env.STORAGE_LOCAL_DIR = storageDir;
    process.env.FIELD_ENCRYPTION_STRICT = 'true';
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
      { name: `E2E Strict ${SLUG}`, domain: DOMAIN },
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
    validId = data<{ id: string }>(requested).id;
    await post(
      `/documents/${validId}/sign`,
      {
        contentJson: {
          letterKind: 'EXPERIENCE',
          employeeName: 'Genuine Person',
          employeeCode: `EMP-${SLUG}`,
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
      `/documents/${validId}/approve`,
      {},
      hr.token,
    ).expect(200);
    validHash = data<{ documentHash: string }>(approved).documentHash;

    await plant();
  }, 90_000);

  afterAll(async () => {
    // Keyed on DOMAIN and SLUG, which are always set: an undefined id would drop the filter
    // and delete every row. Documents hold Restrict FKs to users and the org, so they go
    // first; deleting them never reads an encrypted field.
    if (prisma) {
      await prisma.document.deleteMany({
        where: { organization: { domain: DOMAIN } },
      });
      if (rootHash)
        await prisma.merkleRoot.deleteMany({ where: { rootHash } });
      await prisma.organization.deleteMany({ where: { domain: DOMAIN } });
      await prisma.user.deleteMany({ where: { email: { contains: SLUG } } });
    }
    await app?.close();
    if (storageDir) rmSync(storageDir, { recursive: true, force: true });
  }, 30_000);

  it('refuses the planted row on read, naming the field but not the value', async () => {
    const error = await prisma.document
      .findUnique({ where: { id: plantedId } })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toMatch(
      /^Field "contentJson" holds a value that is not an R10 envelope/,
    );
    expect((error as Error).message).not.toContain(PLANTED_NAME);
    expect((error as Error).message).not.toContain(plantedSalt);
  });

  it('fails the public lookup of the planted hash closed, disclosing nothing', async () => {
    const res = await request(http)
      .get(api(`/verify/hash/${plantedHash}`))
      .expect(500);

    expect(res.text).not.toContain(PLANTED_NAME);
  });

  it('anchors the genuine document and skips the planted one', async () => {
    const res = await post('/merkle/run', {}, admin.token).expect(200);
    const batch = data<{ anchored: number; rootHash: string }>(res);
    rootHash = batch.rootHash;

    expect(batch.anchored).toBe(1);
    // A single-leaf tree's root is the leaf itself.
    expect(batch.rootHash).toBe(validHash);
    await expect(statusOf(validId)).resolves.toEqual({
      status: 'ANCHORED',
      proofs: 1,
    });
    await expect(statusOf(plantedId)).resolves.toEqual({
      status: 'ISSUED',
      proofs: 0,
    });
  });

  it('still verifies the genuine document, now anchored', async () => {
    const res = await request(http)
      .get(api(`/verify/hash/${validHash}`))
      .expect(200);

    expect(data<{ verdict: string }>(res).verdict).toBe('VERIFIED');
  });

  it('skips the planted row again on the next run, leaving nothing to anchor', async () => {
    const res = await post('/merkle/run', {}, admin.token).expect(200);

    expect(data<{ anchored: number }>(res).anchored).toBe(0);
    await expect(statusOf(plantedId)).resolves.toEqual({
      status: 'ISSUED',
      proofs: 0,
    });
  });
});

import { createPublicKey, verify } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import {
  hashDocument,
  signingStatementHash,
} from '../src/common/utils/crypto.util.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// R10 at rest: after a real request → sign → approve, the document's sensitive columns hold
// only envelopes when read the way a database dump would ($queryRaw is not a model
// operation, so the decrypting extension never sees it), while every API path still gets
// the plaintext, and verification still recomputes the hash and checks both signatures.

const SLUG = Date.now().toString(36);
const DOMAIN = `e2e-enc-${SLUG}.test`;
const PASSWORD = 'Password123@';
const ENVELOPE = /^cvenc:v1:/;

const CONDUCT =
  'Worked on the payments team and conducted themselves professionally throughout.';

interface Session {
  token: string;
  userId: string;
}

interface Credential {
  issuer: { publicKeyPem: string };
  credentialSubject: Record<string, unknown>;
  proof: {
    salt: string;
    documentHash: string;
    signerMemberId: string;
    approverMemberId: string;
    managerSignature: string;
    hrSignature: string;
  };
}

describe('field encryption at rest (e2e)', () => {
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
    storageDir = mkdtempSync(join(tmpdir(), 'cv-enc-e2e-'));
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
      { name: `E2E Enc ${SLUG}`, domain: DOMAIN },
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
    ).expect(200);

    const approved = await post(
      `/documents/${documentId}/approve`,
      {},
      hr.token,
    ).expect(200);
    documentHash = data<{ documentHash: string }>(approved).documentHash;
  }, 90_000);

  afterAll(async () => {
    // Documents hold Restrict FKs to users and the org, so they go first. Users are removed
    // by id because erasure rewrites the holder's email.
    await prisma.document.deleteMany({ where: { organizationId: orgId } });
    await prisma.organization.deleteMany({ where: { id: orgId } });
    await prisma.user.deleteMany({
      where: {
        id: { in: [admin, manager, hr, holder].map((s) => s.userId) },
      },
    });
    await app?.close();
    rmSync(storageDir, { recursive: true, force: true });
  }, 30_000);

  it('stores the signed document as envelopes', async () => {
    const [row] = await prisma.$queryRaw<
      {
        content_json: unknown;
        content_type: string;
        salt: string;
        manager_signature: string;
        hr_signature: string;
        document_hash: string;
      }[]
    >`SELECT content_json, jsonb_typeof(content_json) AS content_type, salt,
             manager_signature, hr_signature, document_hash
      FROM documents WHERE id = ${documentId}::uuid`;

    expect(row.content_type).toBe('string');
    expect(row.content_json).toMatch(ENVELOPE);
    expect(row.salt).toMatch(ENVELOPE);
    expect(row.manager_signature).toMatch(ENVELOPE);
    expect(row.hr_signature).toMatch(ENVELOPE);
    // The hash is public by design (verify-by-hash looks it up), so it stays plaintext.
    expect(row.document_hash).toBe(documentHash);
  });

  it('stores every version snapshot as envelopes', async () => {
    const versions = await prisma.$queryRaw<
      { content_json: unknown; change_summary: string }[]
    >`SELECT content_json, change_summary FROM document_versions
      WHERE document_id = ${documentId}::uuid`;

    expect(versions).toHaveLength(2);
    for (const version of versions) {
      expect(version.content_json).toMatch(ENVELOPE);
      expect(version.change_summary).toMatch(ENVELOPE);
    }
  });

  it('serves the plaintext content through the API', async () => {
    const res = await get(`/documents/${documentId}`, holder.token).expect(200);
    const listed = await get('/documents', holder.token).expect(200);

    const content = { employeeName: 'Holder Person', conductSummary: CONDUCT };
    expect(data<{ contentJson: object }>(res).contentJson).toMatchObject(
      content,
    );
    const [listedDoc] = data<{ id: string; contentJson: object }[]>(listed);
    expect(listedDoc.id).toBe(documentId);
    expect(listedDoc.contentJson).toMatchObject(content);
  });

  it('verifies publicly from the decrypted content, salt and signatures', async () => {
    const res = await get(`/verify/hash/${documentHash}`).expect(200);

    expect(data<{ verdict: string }>(res).verdict).toBe(
      'VERIFIED_PENDING_ANCHOR',
    );
  });

  it('exports a credential whose salt and signatures verify offline', async () => {
    const res = await get(
      `/documents/${documentId}/credential`,
      holder.token,
    ).expect(200);
    const { issuer, credentialSubject, proof } = JSON.parse(
      res.text,
    ) as Credential;

    const key = createPublicKey(issuer.publicKeyPem);
    const signedBy = (signature: string, role: 'MANAGER' | 'HR', id: string) =>
      verify(
        'sha256',
        Buffer.from(signingStatementHash(documentHash, role, id), 'hex'),
        key,
        Buffer.from(signature, 'base64'),
      );

    expect(proof.salt).toMatch(/^[0-9a-f]{64}$/);
    expect(proof.documentHash).toBe(documentHash);
    expect(hashDocument(credentialSubject, proof.salt)).toBe(documentHash);
    expect(
      signedBy(proof.managerSignature, 'MANAGER', proof.signerMemberId),
    ).toBe(true);
    expect(signedBy(proof.hrSignature, 'HR', proof.approverMemberId)).toBe(
      true,
    );
  });

  // GDPR erasure rewrites encrypted columns inside an array $transaction; the scrubbed
  // snapshots must still be sealed, not written back as plaintext `{}`.
  it('keeps erased version snapshots encrypted', async () => {
    await request(http)
      .delete(api('/users/me'))
      .set('Authorization', `Bearer ${holder.token}`)
      .expect(200);

    const raw = await prisma.$queryRaw<{ content_json: unknown }[]>`
      SELECT content_json FROM document_versions
      WHERE document_id = ${documentId}::uuid`;
    const read = await prisma.documentVersion.findMany({
      where: { documentId },
      select: { contentJson: true },
    });
    const document = await prisma.document.findUniqueOrThrow({
      where: { id: documentId },
      select: { salt: true },
    });

    expect(raw).toHaveLength(2);
    for (const version of raw) expect(version.content_json).toMatch(ENVELOPE);
    expect(read.map((v) => v.contentJson)).toEqual([{}, {}]);
    expect(document.salt).toBeNull();
  });
});

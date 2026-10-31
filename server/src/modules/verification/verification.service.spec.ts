import { randomBytes } from 'node:crypto';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { documentBytes } from '../../common/crypto/document-bytes.js';
import {
  employeeSeal,
  sha256Hex,
  signingStatementHash,
} from '../../common/utils/crypto.util.js';
import {
  buildMerkleTree,
  merkleProofFor,
  merkleRootHex,
} from '../../common/utils/merkle.util.js';
import { PlaintextFieldError } from '../../prisma/encryption/field-encryption.extension.js';
import { FieldDecryptionError } from '../../services/key-management/field-cipher.js';
import { DataKeyUnavailableError } from '../../services/key-management/key-management.service.js';
import { LocalKmsService } from '../../services/key-management/local-kms.service.js';
import { EmployeeKeyService } from '../employee-key/employee-key.service.js';
import { VerificationService } from './verification.service.js';

/**
 * Public verification, end to end on real cryptography: a real org RSA-2048 key, real
 * employee keys wrapped under the KMS master key, real seals and signatures. Only Prisma and
 * the chain are stubbed.
 */

const IDENTITY = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'EXPERIENCE_LETTER',
  organizationId: 'org-1',
  holderId: 'holder-1',
};
const CONTENT = { employeeName: 'Jane Doe', designation: 'Engineer' };
const SALT = 'a1'.repeat(32);
const MANAGER_KEY = Buffer.alloc(32, 11);
const HR_KEY = Buffer.alloc(32, 22);

let dir: string;
let kms: LocalKmsService;
let genuine: Record<string, unknown>;
let secrets: string[];

async function signerParts(
  role: 'MANAGER' | 'HR',
  key: Buffer,
  userId: string,
  memberId: string,
  kmsKeyId: string,
  documentHash: string,
  bytes: Buffer,
) {
  const keyRow = {
    id: `key-${role}`,
    userId,
    organizationId: IDENTITY.organizationId,
    version: 1,
    wrappedKey: await kms.wrapEmployeeKey(key, {
      organizationId: IDENTITY.organizationId,
      userId,
      version: 1,
    }),
  };
  const seal = employeeSeal(key, bytes);
  const signature = await kms.sign(
    kmsKeyId,
    signingStatementHash({
      documentHash,
      seal,
      role,
      memberId,
      employeeKeyId: keyRow.id,
    }),
  );
  return { keyRow, seal, signature };
}

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'cv-verify-'));
  const env: Record<string, string> = {
    STORAGE_LOCAL_DIR: dir,
    KMS_MASTER_KEY: randomBytes(32).toString('base64'),
  };
  kms = new LocalKmsService({ get: (name: string) => env[name] } as never);
  const { kmsKeyId, publicKeyPem } = await kms.generateOrgKeyPair('org-1');
  const bytes = documentBytes(IDENTITY, CONTENT, SALT);
  const documentHash = sha256Hex(bytes);
  const manager = await signerParts(
    'MANAGER',
    MANAGER_KEY,
    'user-m',
    'member-m',
    kmsKeyId,
    documentHash,
    bytes,
  );
  const hr = await signerParts(
    'HR',
    HR_KEY,
    'user-h',
    'member-h',
    kmsKeyId,
    documentHash,
    bytes,
  );
  const tree = buildMerkleTree([documentHash, 'bb'.repeat(32)]);
  genuine = {
    ...IDENTITY,
    status: 'ANCHORED',
    contentJson: CONTENT,
    salt: SALT,
    documentHash,
    version: 2,
    issuedAt: new Date('2026-09-01T00:00:00.000Z'),
    expiresAt: null,
    revokedAt: null,
    revocationReasonCode: null,
    revocationReasonText: null,
    signerMemberId: 'member-m',
    approverMemberId: 'member-h',
    managerSignature: manager.signature,
    hrSignature: hr.signature,
    managerSeal: manager.seal,
    hrSeal: hr.seal,
    managerKey: manager.keyRow,
    hrKey: hr.keyRow,
    signingPublicKeyPem: publicKeyPem,
    organization: { name: 'Acme Inc', domain: 'acme.example', publicKeyPem },
    holder: { fullName: 'Jane Doe' },
    signerMember: { userId: 'user-m', user: { fullName: 'Maya Manager' } },
    approverMember: { userId: 'user-h', user: { fullName: 'Harish HR' } },
    merkleProof: {
      proofPath: merkleProofFor(tree, documentHash),
      merkleRoot: {
        rootHash: merkleRootHex(tree),
        polygonTxHash: '0x' + 'cd'.repeat(32),
        polygonBlockNumber: 42n,
        chainId: 80002,
        contractAddress: '0x483f9FF4B7444c60e93808Ea0e9b72a14b8Cb12a',
        anchoredAt: new Date('2026-09-02T00:00:00.000Z'),
      },
    },
  };
  secrets = [
    SALT,
    documentHash,
    manager.seal,
    hr.seal,
    manager.signature,
    hr.signature,
    manager.keyRow.wrappedKey,
    merkleRootHex(tree),
    'BEGIN PUBLIC KEY',
  ];
});

afterAll(() => rmSync(dir, { recursive: true, force: true }));

const chainUp = { verifyRoot: () => Promise.resolve({ exists: true }) };

function service(
  options: {
    doc?: Record<string, unknown>;
    chain?: object;
    findUnique?: () => Promise<unknown>;
    audits?: unknown[];
    models?: Record<string, unknown>;
  } = {},
) {
  const prisma = {
    document: {
      findUnique:
        options.findUnique ??
        (() => Promise.resolve({ ...genuine, ...options.doc })),
    },
    auditLog: {
      create: (args: unknown) => {
        options.audits?.push(args);
        return Promise.resolve({});
      },
    },
    ...options.models,
  };
  return new VerificationService(
    prisma as never,
    kms,
    (options.chain ?? chainUp) as never,
    { notify: () => Promise.resolve() } as never,
    new EmployeeKeyService(prisma as never, kms),
  );
}

const statusOf = (
  result: Awaited<ReturnType<VerificationService['verifyByDocumentId']>>,
  key: string,
) => result.checks.find((check) => check.key === key)?.status;

describe('VerificationService — a genuine document', () => {
  it('is VERIFIED: content intact, both seals and both signatures valid', async () => {
    const result = await service().verifyByDocumentId(IDENTITY.id);

    expect(result.verdict).toBe('VERIFIED');
    expect(result.verified).toBe(true);
    expect(result.checks.every((check) => check.status === 'pass')).toBe(true);
    expect(result.roleSignatures).toEqual([
      { role: 'MANAGER', signerName: 'Maya Manager', isValid: true },
      { role: 'HR', signerName: 'Harish HR', isValid: true },
    ]);
    expect(result.issuer).toEqual({ name: 'Acme Inc', domain: 'acme.example' });
    expect(result.anchor.status).toBe('anchored');
  });

  it('tells the verifier nothing cryptographic: no salt, hash, seal, signature, key or root', async () => {
    const body = JSON.stringify(
      await service().verifyByDocumentId(IDENTITY.id),
    );

    for (const secret of secrets) expect(body).not.toContain(secret);
    expect(body).not.toMatch(/SHA-?256|HMAC|RSA|PBKDF2|AES/i);
  });
});

describe('VerificationService — the chain is only a badge', () => {
  it.each([
    [
      'unreachable',
      { verifyRoot: () => Promise.reject(new Error('down')) },
      'unavailable',
    ],
    [
      'missing the root (simulator-anchored)',
      { verifyRoot: () => Promise.resolve({ exists: false }) },
      'unconfirmed',
    ],
  ])('stays VERIFIED when the chain is %s', async (_, chain, badge) => {
    const result = await service({ chain }).verifyByDocumentId(IDENTITY.id);

    expect(result.verdict).toBe('VERIFIED');
    expect(result.anchor.status).toBe(badge);
  });

  it('stays VERIFIED before the document is anchored', async () => {
    const result = await service({
      doc: { status: 'ISSUED', merkleProof: null },
    }).verifyByDocumentId(IDENTITY.id);

    expect(result.verdict).toBe('VERIFIED');
    expect(result.anchor.status).toBe('pending');
  });
});

describe('VerificationService — tampering', () => {
  it('fails integrity and both seals when one field of the content is edited', async () => {
    const result = await service({
      doc: { contentJson: { ...CONTENT, designation: 'CTO' } },
    }).verifyByDocumentId(IDENTITY.id);

    expect(result.verdict).toBe('INVALID');
    expect(statusOf(result, 'integrity')).toBe('fail');
    expect(statusOf(result, 'managerSignature')).toBe('fail');
    expect(statusOf(result, 'hrSignature')).toBe('fail');
  });

  it('fails when the document is moved to another holder', async () => {
    const result = await service({
      doc: { holderId: 'holder-2' },
    }).verifyByDocumentId(IDENTITY.id);

    expect(result.verdict).toBe('INVALID');
  });

  it("rejects a manager seal pinned to a colleague's key", async () => {
    const result = await service({
      doc: { managerKey: genuine.hrKey },
    }).verifyByDocumentId(IDENTITY.id);

    expect(statusOf(result, 'managerSignature')).toBe('fail');
    expect(statusOf(result, 'hrSignature')).toBe('pass');
    expect(result.verdict).toBe('INVALID');
  });

  it('rejects a seal swapped in without the employee key', async () => {
    const result = await service({
      doc: { hrSeal: 'ff'.repeat(32) },
    }).verifyByDocumentId(IDENTITY.id);

    expect(statusOf(result, 'hrSignature')).toBe('fail');
  });
});

describe('VerificationService — status and disclosure', () => {
  it('reports a revoked document as REVOKED with its reason', async () => {
    const result = await service({
      doc: {
        status: 'REVOKED',
        revokedAt: new Date('2026-10-01T00:00:00.000Z'),
        revocationReasonCode: 'ISSUED_IN_ERROR',
        revocationReasonText: 'Wrong period',
      },
    }).verifyByDocumentId(IDENTITY.id);

    expect(result.verdict).toBe('REVOKED');
    expect(result.revocation).toMatchObject({ reason: 'Wrong period' });
  });

  it('says an erased document was erased and discloses nothing of it', async () => {
    const result = await service({
      doc: {
        salt: null,
        contentJson: {},
        revokedAt: new Date(),
        revocationReasonText: 'Names Jane',
      },
    }).verifyByDocumentId(IDENTITY.id);

    expect(result.erased).toBe(true);
    expect(result.document).toBeNull();
    expect(result.revocation?.reason).toBeNull();
  });

  it('withholds the holder and non-public fields of a salary proof on a public lookup', async () => {
    const result = await service({
      doc: {
        type: 'SALARY_PROOF',
        contentJson: { designation: 'Engineer', basicPaise: 5000000 },
      },
    }).verifyByDocumentId(IDENTITY.id);

    expect(result.document?.holderName).toBeNull();
    expect(result.document?.fields).toEqual({ designation: 'Engineer' });
  });

  it('answers NOT_FOUND for a draft, without naming its organisation', async () => {
    const result = await service({
      doc: { status: 'DRAFT' },
    }).verifyByDocumentId(IDENTITY.id);

    expect(result.verdict).toBe('NOT_FOUND');
    expect(JSON.stringify(result)).not.toContain('Acme');
  });

  it('answers NOT_FOUND for an unknown document', async () => {
    const result = await service({
      findUnique: () => Promise.resolve(null),
    }).verifyByDocumentId(IDENTITY.id);

    expect(result.verdict).toBe('NOT_FOUND');
  });
});

describe('VerificationService — records whose stored fields cannot be read', () => {
  const KEY_ID = '0123456789abcdef';
  const badWrappedDek = () =>
    new DataKeyUnavailableError(KEY_ID, KEY_ID, 'failed authentication');

  it.each([
    ['planted plaintext', new PlaintextFieldError('contentJson')],
    ['an envelope that fails authentication', new FieldDecryptionError('salt')],
    ['a wrapped data key that fails to unwrap', badWrappedDek()],
  ])('reports %s as INVALID and audits it', async (_, error) => {
    const audits: unknown[] = [];
    const result = await service({
      findUnique: () => Promise.reject(error),
      audits,
    }).verifyByDocumentId(IDENTITY.id);

    expect(result).toMatchObject({ verdict: 'INVALID', document: null });
    expect(audits).toMatchObject([
      { data: { action: 'DOCUMENT_CHECK_FAILED', entityId: IDENTITY.id } },
    ]);
  });

  // One row naming another key id looks exactly like a deployment with the wrong
  // KMS_MASTER_KEY, so it must not read as tampered: the filter answers it with a 503.
  it('rethrows a data key wrapped under another key id', async () => {
    const error = new DataKeyUnavailableError(
      'fedcba9876543210',
      KEY_ID,
      'other',
    );
    await expect(
      service({ findUnique: () => Promise.reject(error) }).verifyByDocumentId(
        IDENTITY.id,
      ),
    ).rejects.toBeInstanceOf(DataKeyUnavailableError);
  });

  it('keeps a bulk request answering when one document cannot be read at all', async () => {
    let calls = 0;
    const results = await service({
      findUnique: () =>
        calls++ === 0
          ? Promise.reject(new Error('connection reset'))
          : Promise.resolve(genuine),
    }).verifyBulk(['22222222-2222-4222-8222-222222222222', IDENTITY.id]);

    expect(results[0]).toMatchObject({
      result: null,
      error: { code: 'VERIFICATION_UNAVAILABLE' },
    });
    expect(results[1].result?.verdict).toBe('VERIFIED');
  });
});

describe('VerificationService — share links', () => {
  const TOKEN = 'ab'.repeat(24);

  it('answers NOT_FOUND for anything not shaped like a token, without a query', async () => {
    const result = await service({
      models: {
        sharedLink: {
          findUnique: () => {
            throw new Error('must not be called');
          },
        },
      },
    }).verifyByToken("' OR 1=1 --");

    expect(result.verdict).toBe('NOT_FOUND');
  });

  it('reports an unreadable shared document as INVALID and counts no view', async () => {
    const claims: unknown[] = [];
    const result = await service({
      models: {
        sharedLink: {
          findUnique: (args: { include?: object }) =>
            args.include
              ? Promise.reject(badKey())
              : Promise.resolve({
                  id: 'link-1',
                  documentId: IDENTITY.id,
                  isActive: true,
                  expiresAt: null,
                  maxViews: null,
                  views: 0,
                }),
          updateMany: (args: unknown) => {
            claims.push(args);
            return Promise.resolve({ count: 1 });
          },
        },
      },
    }).verifyByToken(TOKEN);

    expect(result.verdict).toBe('INVALID');
    expect(claims).toEqual([]);
  });

  it('shows a holder-shared document in full', async () => {
    const result = await service({
      models: {
        sharedLink: {
          findUnique: () =>
            Promise.resolve({
              id: 'link-1',
              isActive: true,
              expiresAt: null,
              maxViews: null,
              views: 0,
              document: {
                ...genuine,
                type: 'SALARY_PROOF',
                contentJson: { designation: 'Engineer', basicPaise: 5000000 },
              },
            }),
          updateMany: () => Promise.resolve({ count: 1 }),
        },
      },
    }).verifyByToken(TOKEN);

    expect(result.document?.holderName).toBe('Jane Doe');
    expect(result.document?.fields).toMatchObject({ basicPaise: 5000000 });
  });
});

function badKey() {
  return new DataKeyUnavailableError(
    '0123456789abcdef',
    '0123456789abcdef',
    'x',
  );
}

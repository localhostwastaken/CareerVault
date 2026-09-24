import { hashDocument } from '../../common/utils/crypto.util.js';
import {
  buildMerkleTree,
  merkleProofFor,
  merkleRootHex,
} from '../../common/utils/merkle.util.js';
import { PlaintextFieldError } from '../../prisma/encryption/field-encryption.extension.js';
import { FieldDecryptionError } from '../../services/key-management/field-cipher.js';
import { VerificationService } from './verification.service.js';

/**
 * Public verification when the chain is down (R7: the DB is authoritative, the chain is
 * secondary). An unreachable RPC must never turn a genuine, dual-signed document into an
 * error or an INVALID verdict — it may only leave the on-chain parts unconfirmed.
 */

const CONTENT = { employeeName: 'Jane Doe', designation: 'Engineer' };
const SALT = 'a'.repeat(64);
const HASH = hashDocument(CONTENT, SALT);
const TREE = buildMerkleTree([HASH, 'bb'.repeat(32)]);

const liveDoc = (overrides: Record<string, unknown> = {}) => ({
  id: 'doc-1',
  type: 'EXPERIENCE_LETTER',
  status: 'ANCHORED',
  holderId: 'holder-1',
  contentJson: CONTENT,
  salt: SALT,
  documentHash: HASH,
  version: 1,
  issuedAt: new Date('2026-09-01T00:00:00.000Z'),
  expiresAt: null,
  revokedAt: null,
  revocationReasonCode: null,
  revocationReasonText: null,
  signerMemberId: 'member-manager',
  approverMemberId: 'member-hr',
  managerSignature: 'manager-signature',
  hrSignature: 'hr-signature',
  signingPublicKeyPem: 'PUBLIC KEY',
  organization: { name: 'Acme Inc', publicKeyPem: 'PUBLIC KEY' },
  holder: { fullName: 'Jane Doe' },
  merkleProof: {
    proofPath: merkleProofFor(TREE, HASH),
    merkleRoot: {
      rootHash: merkleRootHex(TREE),
      polygonTxHash: '0xanchor',
      polygonBlockNumber: 42n,
      chainId: 80002,
      contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
      anchoredAt: new Date('2026-09-02T00:00:00.000Z'),
    },
  },
  ...overrides,
});

type FindFirst = (args: {
  where: { documentHash: string };
  select?: object;
}) => Promise<unknown>;

function verificationService(
  blockchain: object,
  overrides: Record<string, unknown> = {},
  findFirst?: FindFirst,
  audits: unknown[] = [],
) {
  const doc = liveDoc(overrides);
  const prisma = {
    document: { findFirst: findFirst ?? (() => Promise.resolve(doc)) },
    auditLog: {
      create: (args: unknown) => {
        audits.push(args);
        return Promise.resolve({});
      },
    },
  };
  const kms = { verify: () => Promise.resolve(true) };
  return new VerificationService(
    prisma as never,
    kms as never,
    blockchain as never,
    {} as never,
  );
}

const check = (
  result: Awaited<ReturnType<VerificationService['verifyByHash']>>,
  key: string,
) => result.checks.find((c) => c.key === key);

describe('VerificationService with the chain unreachable', () => {
  it('reports VERIFIED_PENDING_ANCHOR, not an error or INVALID', async () => {
    let revocationLookups = 0;
    const service = verificationService({
      verifyRoot: () => Promise.reject(new Error('RPC unreachable')),
      isRevoked: () => {
        revocationLookups++;
        return Promise.reject(new Error('RPC unreachable'));
      },
    });

    const result = await service.verifyByHash(HASH);

    expect(result.verdict).toBe('VERIFIED_PENDING_ANCHOR');
    expect(check(result, 'anchor')?.status).toBe('pending');
    // The on-chain revocation flag is advisory; the DB-authoritative status still passes.
    expect(check(result, 'status')).toMatchObject({
      status: 'pass',
      detail: 'Active — not revoked or expired.',
    });
    // Step 5 already found the chain down: a hung RPC must cost one timeout, not two.
    expect(revocationLookups).toBe(0);
  });

  it('drops only the on-chain note when the revocation lookup alone fails', async () => {
    const service = verificationService({
      verifyRoot: () => Promise.resolve({ exists: true }),
      isRevoked: () => Promise.reject(new Error('RPC unreachable')),
    });

    const result = await service.verifyByHash(HASH);

    expect(result.verdict).toBe('VERIFIED');
    expect(check(result, 'status')).toMatchObject({
      status: 'pass',
      detail: 'Active — not revoked or expired.',
    });
  });

  it('still notes an on-chain revocation flag when the chain answers', async () => {
    const service = verificationService({
      verifyRoot: () => Promise.resolve({ exists: true }),
      isRevoked: () => Promise.resolve({ revoked: true }),
    });

    const result = await service.verifyByHash(HASH);

    expect(result.verdict).toBe('VERIFIED');
    expect(check(result, 'status')?.detail).toContain(
      'On-chain revocation flag present.',
    );
    expect(result.anchor).toMatchObject({
      network: 'polygon-amoy',
      explorerTxUrl: 'https://amoy.polygonscan.com/tx/0xanchor',
    });
  });
});

/**
 * GDPR Art. 17 (UserService.deleteAccount): erasure nulls the salt and scrubs the content of
 * every one of the holder's documents, keeping only the hash, signatures and Merkle proof.
 * The public lookup of that hash must then say so, and disclose nothing about the person.
 */
describe('VerificationService for a document whose holder was erased', () => {
  const chainUp = {
    verifyRoot: () => Promise.resolve({ exists: true }),
    isRevoked: () => Promise.resolve({ revoked: false }),
  };
  const ERASED = { salt: null, contentJson: {} };

  it('returns no content and says the holder exercised their right to erasure', async () => {
    const service = verificationService(chainUp, ERASED);

    const result = await service.verifyByHash(HASH);

    expect(result.verdict).toBe('INVALID');
    expect(result.erased).toBe(true);
    expect(result.document).toBeNull();
    expect(check(result, 'integrity')).toEqual({
      key: 'integrity',
      label: 'Content integrity',
      status: 'fail',
      detail:
        'The holder exercised their right to erasure; the original content no longer exists.',
    });
    expect(JSON.stringify(result)).not.toContain('Jane Doe');
  });

  it('treats scrubbed content as erased even while a salt is still present', async () => {
    const service = verificationService(chainUp, { contentJson: {} });

    const result = await service.verifyByHash(HASH);

    expect(result.erased).toBe(true);
    expect(result.document).toBeNull();
  });

  it('keeps a revoked verdict but withholds the free-text reason', async () => {
    const service = verificationService(chainUp, {
      ...ERASED,
      status: 'REVOKED',
      revokedAt: new Date('2026-09-10T00:00:00.000Z'),
      revocationReasonCode: 'ISSUED_IN_ERROR',
      revocationReasonText: 'Jane Doe left before the letter was due',
    });

    const result = await service.verifyByHash(HASH);

    expect(result.verdict).toBe('REVOKED');
    expect(result.revocation).toEqual({
      revokedAt: new Date('2026-09-10T00:00:00.000Z'),
      code: 'ISSUED_IN_ERROR',
      reason: null,
    });
    expect(check(result, 'status')?.detail).toBe('Revoked on 2026-09-10.');
    expect(JSON.stringify(result)).not.toContain('Jane Doe');
  });

  it('still discloses the allow-listed content of a live document', async () => {
    const service = verificationService(chainUp);

    const result = await service.verifyByHash(HASH);

    expect(result.verdict).toBe('VERIFIED');
    expect(result.erased).toBe(false);
    expect(result.document?.content).toMatchObject({
      employeeName: 'Jane Doe',
    });
  });
});

/**
 * A row whose sealed fields won't open, or that strict mode refuses as plaintext, was
 * written around the app. Its public lookup fails closed as INVALID, disclosing nothing, and
 * one such hash must not take down a whole bulk request with it.
 */
describe('VerificationService for a record whose stored fields cannot be read', () => {
  const chainUp = {
    verifyRoot: () => Promise.resolve({ exists: true }),
    isRevoked: () => Promise.resolve({ revoked: false }),
  };
  const PLANTED = 'cd'.repeat(32);
  const UNREADABLE = {
    key: 'integrity',
    label: 'Content integrity',
    status: 'fail',
    detail:
      'The stored content failed integrity checks and cannot be verified.',
  };

  // The full read of the planted row throws; an id-only read touches no encrypted field.
  const lookup =
    (error: Error, live?: FindFirst): FindFirst =>
    (args) =>
      args.where.documentHash !== PLANTED && live
        ? live(args)
        : args.select
          ? Promise.resolve({ id: 'planted-1' })
          : Promise.reject(error);

  it.each([
    ['planted plaintext', new PlaintextFieldError('contentJson')],
    ['an envelope that fails authentication', new FieldDecryptionError('salt')],
  ])('reports %s as INVALID and audits it', async (_, error) => {
    const audits: unknown[] = [];
    const service = verificationService(chainUp, {}, lookup(error), audits);

    const result = await service.verifyByHash(PLANTED);

    expect(result).toEqual({
      verdict: 'INVALID',
      anchored: false,
      erased: false,
      document: null,
      anchor: null,
      revocation: null,
      checks: [UNREADABLE],
    });
    expect(audits).toMatchObject([
      {
        data: {
          action: 'DOCUMENT_CHECK_FAILED',
          entityId: 'planted-1',
          newValue: { verdict: 'INVALID' },
        },
      },
    ]);
  });

  it('keeps a bulk request answering when one of its hashes is planted', async () => {
    const service = verificationService(
      chainUp,
      {},
      lookup(new PlaintextFieldError('salt'), () => Promise.resolve(liveDoc())),
    );

    const results = await service.verifyBulk([PLANTED, HASH]);

    expect(results.map((r) => [r.hash, r.result.verdict])).toEqual([
      [PLANTED, 'INVALID'],
      [HASH, 'VERIFIED'],
    ]);
  });

  it('still fails loudly on any other error', async () => {
    const service = verificationService(chainUp, {}, () =>
      Promise.reject(new Error('connection reset')),
    );

    await expect(service.verifyByHash(PLANTED)).rejects.toThrow(
      'connection reset',
    );
  });
});

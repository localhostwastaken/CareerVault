import { hashDocument } from '../../common/utils/crypto.util.js';
import {
  buildMerkleTree,
  merkleProofFor,
  merkleRootHex,
} from '../../common/utils/merkle.util.js';
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

function verificationService(blockchain: object) {
  const doc = {
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
  };
  const prisma = {
    document: { findFirst: () => Promise.resolve(doc) },
    auditLog: { create: () => Promise.resolve({}) },
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

import { ConflictException } from '@nestjs/common';
import {
  buildCredential,
  type CredentialDocument,
} from './credential.builder.js';

/**
 * Pure credential shaping (R10 refactor out of DocumentService).
 *
 * Fixed-input structural test plus the issuer-key regression: verification.service.ts
 * already resolves the signing key as `doc.signingPublicKeyPem ?? doc.organization.publicKeyPem`
 * because an org re-key must not invalidate documents signed under the previous key. The
 * credential export used to use `doc.organization.publicKeyPem` unconditionally, so a
 * downloaded credential for a document signed before a re-key would carry the WRONG key and
 * fail offline verification even though the document itself still verifies through the API.
 */

const SIGNED_UNDER_KEY =
  '-----BEGIN PUBLIC KEY-----\nSIGNED-UNDER-KEY\n-----END PUBLIC KEY-----';
const CURRENT_ORG_KEY =
  '-----BEGIN PUBLIC KEY-----\nCURRENT-ORG-KEY\n-----END PUBLIC KEY-----';
const REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

const baseDoc = (root: Record<string, unknown> = {}): CredentialDocument =>
  ({
    id: 'doc-1',
    type: 'EXPERIENCE_LETTER',
    issuedAt: new Date('2026-01-15T00:00:00.000Z'),
    expiresAt: new Date('2027-01-15T00:00:00.000Z'),
    contentJson: { employeeName: 'Jane Doe', designation: 'Engineer' },
    salt: 'a'.repeat(64),
    documentHash: 'b'.repeat(64),
    signerMemberId: 'member-mgr-1',
    approverMemberId: 'member-hr-1',
    managerSignature: 'manager-sig==',
    hrSignature: 'hr-sig==',
    status: 'ISSUED',
    revokedAt: null,
    revocationReasonCode: null,
    revocationReasonText: null,
    signingPublicKeyPem: SIGNED_UNDER_KEY,
    organization: {
      name: 'Acme Inc',
      domain: 'acme.test',
      publicKeyPem: SIGNED_UNDER_KEY,
    },
    holder: { fullName: 'Jane Doe' },
    merkleProof: {
      proofPath: [{ position: 'left', hash: 'x'.repeat(64) }],
      merkleRoot: {
        rootHash: 'r'.repeat(64),
        polygonTxHash: '0xabc123',
        polygonBlockNumber: 12345n,
        chainId: 80002,
        contractAddress: REGISTRY,
        anchoredAt: new Date('2026-01-16T00:00:00.000Z'),
        ...root,
      },
    },
  }) as never as CredentialDocument;

describe('buildCredential', () => {
  it('builds the documented structure from fixed input', () => {
    const credential = buildCredential(baseDoc());

    expect(credential.id).toBe('urn:careervault:document:doc-1');
    expect(credential.type).toEqual([
      'VerifiableCredential',
      'CareerVaultDocument',
    ]);
    expect(credential.credentialSubject).toEqual({
      employeeName: 'Jane Doe',
      designation: 'Engineer',
    });
    expect(credential.proof).toMatchObject({
      type: 'CareerVaultDualSignature2026',
      hashAlgorithm: 'SHA-256',
      canonicalization: 'JCS (RFC 8785)',
      salt: 'a'.repeat(64),
      documentHash: 'b'.repeat(64),
      signatureAlgorithm: 'RS256',
      statementScheme:
        'RS256 over sha256(JCS({ v: 1, documentHash, role, memberId }))',
      signerMemberId: 'member-mgr-1',
      approverMemberId: 'member-hr-1',
      managerSignature: 'manager-sig==',
      hrSignature: 'hr-sig==',
    });
    expect(credential.anchor).toEqual({
      merkleRoot: 'r'.repeat(64),
      proofPath: [{ position: 'left', hash: 'x'.repeat(64) }],
      network: 'polygon-amoy',
      chainId: 80002,
      contractAddress: REGISTRY,
      txHash: '0xabc123',
      explorerTxUrl: 'https://amoy.polygonscan.com/tx/0xabc123',
      blockNumber: 12345,
      anchoredAt: new Date('2026-01-16T00:00:00.000Z'),
    });
    expect(credential.revocation).toBeNull();
  });

  it('labels a simulator anchor as such, with no explorer link', () => {
    const { anchor } = buildCredential(
      baseDoc({ chainId: null, contractAddress: null }),
    );

    expect(anchor).toMatchObject({
      network: 'local-simulator',
      chainId: null,
      contractAddress: null,
      explorerTxUrl: null,
    });
  });

  it('spells out every scheme needed to verify it offline', () => {
    const credential = buildCredential(baseDoc());

    expect(credential.schemes).toEqual({
      hash: 'SHA-256(JCS(credentialSubject) ‖ salt) → lowercase hex; JCS = RFC 8785; salt = 64 hex chars appended as UTF-8',
      statement:
        'SHA-256(JCS({v:1, documentHash, role, memberId})); RS256 (RSASSA-PKCS1-v1_5/SHA-256) over the 32 raw digest bytes',
      merkle:
        'SHA-256 binary tree; leaves = documentHash bytes (not re-hashed); pairs sorted bytewise before hashing; odd node promoted; single-leaf root = leaf',
      anchor: 'AnchorRegistry.verifyRoot(bytes32 0x<merkleRoot>)',
    });
    // Kept alongside `schemes` for readers of the earlier credential shape.
    expect(credential.proof.statementScheme).toBe(
      'RS256 over sha256(JCS({ v: 1, documentHash, role, memberId }))',
    );
    expect(credential.verificationInstructions).toEqual(
      expect.stringMatching(
        /verifyRoot.*anchor\.contractAddress.*anchor\.chainId/,
      ),
    );
  });

  it("carries the key the document was signed under, not the organisation's current key", () => {
    const doc = baseDoc();
    doc.signingPublicKeyPem = SIGNED_UNDER_KEY;
    doc.organization = { ...doc.organization, publicKeyPem: CURRENT_ORG_KEY };

    const credential = buildCredential(doc);

    expect(credential.issuer.publicKeyPem).toBe(SIGNED_UNDER_KEY);
    expect(credential.issuer.publicKeyPem).not.toBe(CURRENT_ORG_KEY);
  });

  it('falls back to the organisation key for rows signed before signingPublicKeyPem existed', () => {
    const doc = baseDoc();
    doc.signingPublicKeyPem = null;
    doc.organization = { ...doc.organization, publicKeyPem: CURRENT_ORG_KEY };

    const credential = buildCredential(doc);

    expect(credential.issuer.publicKeyPem).toBe(CURRENT_ORG_KEY);
  });

  it('refuses to build a credential before the document has a salt and hash', () => {
    const doc = baseDoc();
    doc.salt = null as unknown as string;
    doc.documentHash = null as unknown as string;

    expect(() => buildCredential(doc)).toThrow(ConflictException);
  });
});

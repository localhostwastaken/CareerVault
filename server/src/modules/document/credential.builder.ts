import { ConflictException } from '@nestjs/common';
import type { Prisma } from '../../generated/prisma/client.js';
import {
  explorerTxUrl,
  networkName,
} from '../../services/blockchain/chain-explorer.js';

// Self-sovereign verification bundle (GDPR / salt-portability).
//
// R4 defines document_hash = SHA-256( JCS(content_json) ++ salt ), and the salt lives ONLY
// in our DB. The issued PDF shows the hash but not the salt, so today verification depends
// entirely on CareerVault staying online — nobody can recompute the hash to reconcile it
// against the on-chain Merkle root if our servers vanish. This packages everything needed to
// verify the credential OFFLINE into one downloadable JSON-LD file the holder controls: the
// content, the salt, both signatures, the issuer's public key, and the Merkle proof.
//
// Pure by design: no DI, no I/O. DocumentService.buildCredential loads the row (and checks
// the caller may view it) and hands it here; this module only shapes the JSON-LD. The
// `anchor` block names the chain and contract the Merkle root was anchored to (R2) — a null
// chainId is the local simulator, which offers nothing to check independently — and
// `schemes` spells out every algorithm, so verifying needs nothing from us.

// Each must describe exactly what crypto.util.ts, merkle.util.ts and the KMS compute.
const SCHEMES = {
  hash: 'SHA-256(JCS(credentialSubject) ‖ salt) → lowercase hex; JCS = RFC 8785; salt = 64 hex chars appended as UTF-8',
  statement:
    'SHA-256(JCS({v:1, documentHash, role, memberId})); RS256 (RSASSA-PKCS1-v1_5/SHA-256) over the 32 raw digest bytes',
  merkle:
    'SHA-256 binary tree; leaves = documentHash bytes (not re-hashed); pairs sorted bytewise before hashing; odd node promoted; single-leaf root = leaf',
  anchor: 'AnchorRegistry.verifyRoot(bytes32 0x<merkleRoot>)',
};

export type CredentialDocument = Prisma.DocumentGetPayload<{
  include: {
    organization: { select: { name: true; domain: true; publicKeyPem: true } };
    holder: { select: { fullName: true } };
    merkleProof: { include: { merkleRoot: true } };
  };
}>;

export function buildCredential(doc: CredentialDocument): VerifiableCredential {
  // The salt+hash only exist once a manager has signed; a draft has nothing to prove.
  if (!doc.salt || !doc.documentHash) {
    throw new ConflictException(
      'A verification credential is only available once the document is issued',
    );
  }

  return {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://careervault.io/credentials/v1',
    ],
    type: ['VerifiableCredential', 'CareerVaultDocument'],
    id: `urn:careervault:document:${doc.id}`,
    documentType: doc.type,
    issuer: {
      name: doc.organization.name,
      domain: doc.organization.domain,
      // Public key travels with the file so the RS256 signatures verify without us. Pinned to
      // the key THIS document was signed under (verification.service.ts uses the same
      // fallback) — falling back to the org's CURRENT key would ship the wrong key, and
      // therefore a credential that fails offline verification, for anything signed before an
      // org re-key.
      publicKeyPem: doc.signingPublicKeyPem ?? doc.organization.publicKeyPem,
    },
    holder: { name: doc.holder.fullName },
    issuanceDate: doc.issuedAt,
    expirationDate: doc.expiresAt,
    // The exact value the hash is computed over (see proof.documentHash).
    credentialSubject: doc.contentJson,
    proof: {
      type: 'CareerVaultDualSignature2026',
      hashAlgorithm: 'SHA-256',
      canonicalization: 'JCS (RFC 8785)',
      // The salt is embedded so the hash is reproducible without our DB.
      salt: doc.salt,
      documentHash: doc.documentHash,
      signatureAlgorithm: 'RS256',
      // C1: each RS256 signature is over sha256(JCS({v:1, documentHash, role, memberId})),
      // binding the signer's role + membership so the two co-signatures are distinct.
      statementScheme:
        'RS256 over sha256(JCS({ v: 1, documentHash, role, memberId }))',
      signerMemberId: doc.signerMemberId,
      approverMemberId: doc.approverMemberId,
      managerSignature: doc.managerSignature,
      hrSignature: doc.hrSignature,
    },
    anchor: doc.merkleProof ? anchorBlock(doc.merkleProof) : null,
    revocation:
      doc.status === 'REVOKED'
        ? {
            revokedAt: doc.revokedAt,
            code: doc.revocationReasonCode,
            reason: doc.revocationReasonText,
          }
        : null,
    schemes: SCHEMES,
    verificationInstructions:
      'Recompute SHA-256( JCS(credentialSubject) + proof.salt ) and confirm it equals ' +
      'proof.documentHash. For each co-signature, recompute the statement ' +
      's = SHA-256( JCS({ v:1, documentHash: proof.documentHash, role, memberId }) ) using ' +
      'role="MANAGER", memberId=proof.signerMemberId for proof.managerSignature, and ' +
      'role="HR", memberId=proof.approverMemberId for proof.hrSignature; then verify each ' +
      'RS256 signature over its statement using issuer.publicKeyPem. If anchor is present, ' +
      'confirm the Merkle proofPath reconciles to anchor.merkleRoot (schemes.merkle), then ' +
      'call verifyRoot(bytes32 0x<anchor.merkleRoot>) on the AnchorRegistry contract at ' +
      'anchor.contractAddress on chain anchor.chainId and confirm it returns exists = true; ' +
      'anchor.txHash is the transaction that anchored it. An anchor whose network is ' +
      '"local-simulator" (chainId null) was recorded in CareerVault\'s own ledger, not on a ' +
      'public chain, so it cannot be checked independently.',
  };
}

function anchorBlock(
  proof: NonNullable<CredentialDocument['merkleProof']>,
): VerifiableCredential['anchor'] {
  const root = proof.merkleRoot;
  return {
    merkleRoot: root.rootHash,
    proofPath: proof.proofPath,
    network: networkName(root.chainId),
    chainId: root.chainId,
    contractAddress: root.contractAddress,
    txHash: root.polygonTxHash,
    explorerTxUrl: explorerTxUrl(root.chainId, root.polygonTxHash),
    blockNumber: root.polygonBlockNumber
      ? Number(root.polygonBlockNumber)
      : null,
    anchoredAt: root.anchoredAt,
  };
}

// Self-contained, offline-verifiable credential (see buildCredential above).
export interface VerifiableCredential {
  '@context': string[];
  type: string[];
  id: string;
  documentType: string;
  issuer: { name: string; domain: string; publicKeyPem: string | null };
  holder: { name: string };
  issuanceDate: Date | null;
  expirationDate: Date | null;
  credentialSubject: Prisma.JsonValue;
  proof: {
    type: string;
    hashAlgorithm: string;
    canonicalization: string;
    salt: string;
    documentHash: string;
    signatureAlgorithm: string;
    statementScheme: string;
    signerMemberId: string | null;
    approverMemberId: string | null;
    managerSignature: string | null;
    hrSignature: string | null;
  };
  anchor: {
    merkleRoot: string;
    proofPath: Prisma.JsonValue;
    network: string;
    chainId: number | null;
    contractAddress: string | null;
    txHash: string | null;
    explorerTxUrl: string | null;
    blockNumber: number | null;
    anchoredAt: Date | null;
  } | null;
  revocation: {
    revokedAt: Date | null;
    code: string | null;
    reason: string | null;
  } | null;
  schemes: typeof SCHEMES;
  verificationInstructions: string;
}

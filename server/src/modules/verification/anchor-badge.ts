import {
  verifyMerkleProof,
  type MerkleProofStep,
} from '../../common/utils/merkle.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import {
  explorerTxUrl,
  networkName,
} from '../../services/blockchain/chain-explorer.js';

type AnchoredProof = Prisma.DocumentMerkleProofGetPayload<{
  include: { merkleRoot: true };
}>;

export type AnchorStatus =
  | 'anchored'
  | 'pending'
  | 'unconfirmed'
  | 'unavailable';

// What a verifier sees about the chain: a status and, when it is confirmed, where to look.
// No root, proof path or contract address leaves the server.
export interface AnchorBadge {
  status: AnchorStatus;
  network: string | null;
  explorerTxUrl: string | null;
  anchoredAt: Date | null;
}

const PENDING: AnchorBadge = {
  status: 'pending',
  network: null,
  explorerTxUrl: null,
  anchoredAt: null,
};

// The on-chain anchor is SECONDARY (R2, R7): it never decides the verdict. It is a public,
// timestamped receipt that the document's hash was in a batch whose Merkle root CareerVault
// wrote to Polygon. The proof is folded locally first, so a forged proof never costs an RPC
// call, and an unreachable chain reads as "unavailable", never as a failure.
export async function anchorBadge(
  doc: { documentHash: string | null; merkleProof: AnchoredProof | null },
  blockchain: BlockchainService,
): Promise<AnchorBadge> {
  if (!doc.merkleProof || !doc.documentHash) return PENDING;

  const root = doc.merkleProof.merkleRoot;
  const network = networkName(root.chainId);
  const proof = doc.merkleProof.proofPath as unknown as MerkleProofStep[];
  if (!verifyMerkleProof(doc.documentHash, proof, root.rootHash))
    return { ...PENDING, status: 'unconfirmed', network };

  const confirmed: AnchorBadge = {
    status: 'anchored',
    network,
    explorerTxUrl: explorerTxUrl(root.chainId, root.polygonTxHash),
    anchoredAt: root.anchoredAt,
  };
  try {
    const { exists } = await blockchain.verifyRoot(root.rootHash);
    return exists ? confirmed : { ...PENDING, status: 'unconfirmed', network };
  } catch {
    return { ...confirmed, status: 'unavailable' };
  }
}

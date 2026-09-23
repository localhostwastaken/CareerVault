import {
  verifyMerkleProof,
  type MerkleProofStep,
} from '../../common/utils/merkle.util.js';
import type { Prisma } from '../../generated/prisma/client.js';
import type { BlockchainService } from '../../services/blockchain/blockchain.service.js';
import {
  explorerAddressUrl,
  explorerTxUrl,
  networkName,
} from '../../services/blockchain/chain-explorer.js';
import type { CheckStatus } from './verification.service.js';

type AnchoredProof = Prisma.DocumentMerkleProofGetPayload<{
  include: { merkleRoot: true };
}>;

export interface VerificationAnchor {
  rootHash: string;
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: Date | null;
  chainId: number | null;
  network: string;
  contractAddress: string | null;
  explorerTxUrl: string | null;
  explorerContractUrl: string | null;
}

export interface AnchorCheck {
  status: CheckStatus;
  detail: string;
  anchor: VerificationAnchor | null;
}

// Verification step 5 (R2): the document's Merkle proof must reconcile to a root that exists
// on-chain. The proof is checked locally first — no chain answer can rescue a proof that does
// not reconcile, so a forged one never costs an RPC call. An unreachable chain is `pending`,
// not `fail` (R7: the chain is secondary): the proof is sound, only its anchor is unconfirmed.
export async function anchorCheck(
  doc: { documentHash: string | null; merkleProof: AnchoredProof | null },
  blockchain: BlockchainService,
): Promise<AnchorCheck> {
  if (!doc.merkleProof || !doc.documentHash)
    return {
      status: 'pending',
      detail: 'Awaiting the next on-chain anchoring batch.',
      anchor: null,
    };

  const root = doc.merkleProof.merkleRoot;
  const anchor = verificationAnchor(root);
  const proof = doc.merkleProof.proofPath as unknown as MerkleProofStep[];
  if (!verifyMerkleProof(doc.documentHash, proof, root.rootHash))
    return {
      status: 'fail',
      detail: 'Merkle proof did not reconcile with the anchored root.',
      anchor,
    };

  let exists: boolean;
  try {
    exists = (await blockchain.verifyRoot(root.rootHash)).exists;
  } catch {
    return {
      status: 'pending',
      detail:
        'On-chain check temporarily unavailable — the Merkle proof itself is valid.',
      anchor,
    };
  }
  return exists
    ? {
        status: 'pass',
        detail: `Anchored on ${anchor.network} in block ${anchor.blockNumber ?? '—'}.`,
        anchor,
      }
    : { status: 'fail', detail: 'Merkle root not found on-chain.', anchor };
}

function verificationAnchor(
  root: AnchoredProof['merkleRoot'],
): VerificationAnchor {
  return {
    rootHash: root.rootHash,
    txHash: root.polygonTxHash,
    blockNumber: root.polygonBlockNumber
      ? Number(root.polygonBlockNumber)
      : null,
    anchoredAt: root.anchoredAt,
    chainId: root.chainId,
    network: networkName(root.chainId),
    contractAddress: root.contractAddress,
    explorerTxUrl: explorerTxUrl(root.chainId, root.polygonTxHash),
    explorerContractUrl: explorerAddressUrl(root.chainId, root.contractAddress),
  };
}

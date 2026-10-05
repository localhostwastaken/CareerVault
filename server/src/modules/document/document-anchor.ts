import type { Prisma } from '../../generated/prisma/client.js';
import {
  explorerAddressUrl,
  explorerBlockUrl,
  explorerTxUrl,
  networkName,
} from '../../services/blockchain/chain-explorer.js';

// The document's own anchoring record (R2), for the document detail page. The Merkle
// batch writes one root per run, so this is the transaction that put THIS document's root
// on-chain — the page links it on the block explorer so a viewer can check it without
// trusting us. A null chainId is the LocalAnchor simulator: it is named 'local-simulator'
// and gets no explorer links, so a simulated anchor never reads as a public-chain one.
//
// Same sources as the credential's anchor block (credential.builder.ts). Pure: no DI, no I/O.

export type AnchoredProof = Prisma.DocumentMerkleProofGetPayload<{
  include: { merkleRoot: true };
}>;

export interface DocumentAnchor {
  merkleRoot: string;
  txHash: string | null;
  blockNumber: number | null;
  anchoredAt: Date | null;
  chainId: number | null;
  network: string;
  contractAddress: string | null;
  explorerTxUrl: string | null;
  explorerContractUrl: string | null;
  explorerBlockUrl: string | null;
  proofLength: number;
}

// Undefined is accepted as well as null: a caller that did not load the relation must
// still get "not anchored yet", never a throw.
export function presentAnchor(
  proof: AnchoredProof | null | undefined,
): DocumentAnchor | null {
  if (!proof) return null;
  const root = proof.merkleRoot;
  const blockNumber =
    root.polygonBlockNumber === null ? null : Number(root.polygonBlockNumber);
  return {
    merkleRoot: root.rootHash,
    txHash: root.polygonTxHash,
    blockNumber,
    anchoredAt: root.anchoredAt,
    chainId: root.chainId,
    network: networkName(root.chainId),
    contractAddress: root.contractAddress,
    explorerTxUrl: explorerTxUrl(root.chainId, root.polygonTxHash),
    explorerContractUrl: explorerAddressUrl(root.chainId, root.contractAddress),
    explorerBlockUrl: explorerBlockUrl(root.chainId, blockNumber),
    proofLength: Array.isArray(proof.proofPath) ? proof.proofPath.length : 0,
  };
}

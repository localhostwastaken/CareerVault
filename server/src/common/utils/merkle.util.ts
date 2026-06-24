// Merkle tree helpers (SHA-256, sorted pairs — deterministic). The merkle batch
// job and the verification flow both reuse these so leaf/root math never diverges.
import { createHash } from 'node:crypto';
import { MerkleTree } from 'merkletreejs';

const sha256 = (data: Buffer): Buffer =>
  createHash('sha256').update(data).digest();

export interface MerkleProofStep {
  hash: string;
  position: 'left' | 'right';
}

export function buildMerkleTree(leafHashesHex: string[]): MerkleTree {
  const leaves = leafHashesHex.map((h) => Buffer.from(h, 'hex'));
  return new MerkleTree(leaves, sha256, { sortPairs: true });
}

export function merkleRootHex(tree: MerkleTree): string {
  return tree.getRoot().toString('hex');
}

export function merkleProofFor(
  tree: MerkleTree,
  leafHashHex: string,
): MerkleProofStep[] {
  return tree.getProof(Buffer.from(leafHashHex, 'hex')).map((step) => ({
    hash: step.data.toString('hex'),
    position: step.position,
  }));
}

export function verifyMerkleProof(
  leafHashHex: string,
  proof: MerkleProofStep[],
  rootHex: string,
): boolean {
  const libProof = proof.map((step) => ({
    position: step.position,
    data: Buffer.from(step.hash, 'hex'),
  }));
  return MerkleTree.verify(
    libProof,
    Buffer.from(leafHashHex, 'hex'),
    Buffer.from(rootHex, 'hex'),
    sha256,
    {
      sortPairs: true,
    },
  );
}

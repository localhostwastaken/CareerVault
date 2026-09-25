import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { sha256Hex } from './crypto.util.js';
import {
  buildMerkleTree,
  merkleProofFor,
  merkleRootHex,
  verifyMerkleProof,
  type MerkleProofStep,
} from './merkle.util.js';

interface TestVectors {
  pipeline: {
    merkle: {
      label: string;
      leaves: string[];
      root: string;
      proof: { leaf: string; path: MerkleProofStep[] };
    }[];
  };
}

// See crypto.util.spec.ts for why this resolves from process.cwd() rather than
// import.meta.url. Same single-source-of-truth vectors file the offline verifier's
// --selftest recomputes independently.
const VECTORS = JSON.parse(
  readFileSync(
    join(process.cwd(), '../tools/verify-credential/test-vectors.json'),
    'utf8',
  ),
) as TestVectors;

describe('merkle.util (R2 anchoring proofs)', () => {
  const leaves = ['a', 'b', 'c', 'd'].map((s) => sha256Hex(s));

  it('every leaf proof reconstructs the anchored root', () => {
    const tree = buildMerkleTree(leaves);
    const root = merkleRootHex(tree);
    expect(root).toMatch(/^[0-9a-f]{64}$/);
    for (const leaf of leaves) {
      expect(verifyMerkleProof(leaf, merkleProofFor(tree, leaf), root)).toBe(
        true,
      );
    }
  });

  it('a leaf not in the tree fails verification against the root', () => {
    const tree = buildMerkleTree(leaves);
    const root = merkleRootHex(tree);
    const proof = merkleProofFor(tree, leaves[0]);
    expect(verifyMerkleProof(sha256Hex('not-in-tree'), proof, root)).toBe(
      false,
    );
  });

  it('handles an odd number of leaves', () => {
    const odd = ['x', 'y', 'z'].map((s) => sha256Hex(s));
    const tree = buildMerkleTree(odd);
    const root = merkleRootHex(tree);
    expect(verifyMerkleProof(odd[2], merkleProofFor(tree, odd[2]), root)).toBe(
      true,
    );
  });
});

// The verifier at tools/verify-credential re-implements Merkle folding independently
// (no merkletreejs import). These vectors are the executable proof that it agrees with
// the real merkle.util.ts, for the 1/3/4-leaf shapes the brief calls out.
describe('known-answer vectors (tools/verify-credential/test-vectors.json)', () => {
  it.each(VECTORS.pipeline.merkle)(
    'reproduces the anchored root for the $label case',
    ({ leaves, root }) => {
      expect(merkleRootHex(buildMerkleTree(leaves))).toBe(root);
    },
  );

  it.each(VECTORS.pipeline.merkle)(
    'reproduces the stored proof for the $label case and it verifies',
    ({ leaves, root, proof }) => {
      const tree = buildMerkleTree(leaves);
      expect(merkleProofFor(tree, proof.leaf)).toEqual(proof.path);
      expect(verifyMerkleProof(proof.leaf, proof.path, root)).toBe(true);
    },
  );
});

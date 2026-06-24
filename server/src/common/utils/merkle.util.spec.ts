import { sha256Hex } from './crypto.util.js';
import {
  buildMerkleTree,
  merkleProofFor,
  merkleRootHex,
  verifyMerkleProof,
} from './merkle.util.js';

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

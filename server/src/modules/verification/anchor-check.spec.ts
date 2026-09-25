import {
  buildMerkleTree,
  merkleProofFor,
  merkleRootHex,
} from '../../common/utils/merkle.util.js';
import { anchorCheck } from './anchor-check.js';

/**
 * Step 5 of public verification (R2). The Merkle proof is recomputed locally before the chain
 * is asked anything, and a chain that cannot be reached is reported as unknown ("pending"),
 * never as a failure — the verdict then degrades to VERIFIED_PENDING_ANCHOR, not INVALID.
 */

const LEAVES = ['aa'.repeat(32), 'bb'.repeat(32), 'cc'.repeat(32)];
const TREE = buildMerkleTree(LEAVES);
const ROOT = merkleRootHex(TREE);
const REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const ANCHORED_AT = new Date('2026-09-23T18:30:00.000Z');

type AnchoredDocument = Parameters<typeof anchorCheck>[0];

function anchoredDocument(
  root: Record<string, unknown> = {},
  documentHash = LEAVES[1],
): AnchoredDocument {
  return {
    documentHash,
    merkleProof: {
      proofPath: merkleProofFor(TREE, LEAVES[1]),
      merkleRoot: {
        rootHash: ROOT,
        polygonTxHash: '0xanchor',
        polygonBlockNumber: 42n,
        chainId: 80002,
        contractAddress: REGISTRY,
        anchoredAt: ANCHORED_AT,
        ...root,
      },
    },
  } as never;
}

function chain(verifyRoot: () => Promise<{ exists: boolean }>) {
  let calls = 0;
  const blockchain = {
    verifyRoot: (rootHash: string) => {
      calls++;
      expect(rootHash).toBe(ROOT);
      return verifyRoot();
    },
  };
  return { blockchain: blockchain as never, calls: () => calls };
}

const onChain = () => Promise.resolve({ exists: true });

describe('anchorCheck', () => {
  it('is pending, with no anchor, until the document is batched', async () => {
    const { blockchain, calls } = chain(onChain);

    const result = await anchorCheck(
      { documentHash: LEAVES[1], merkleProof: null },
      blockchain,
    );

    expect(result).toEqual({
      status: 'pending',
      detail: 'Awaiting the next on-chain anchoring batch.',
      anchor: null,
    });
    expect(calls()).toBe(0);
  });

  it('passes, naming the network and block, when the proof reconciles to a root on-chain', async () => {
    const { blockchain } = chain(onChain);

    const result = await anchorCheck(anchoredDocument(), blockchain);

    expect(result).toEqual({
      status: 'pass',
      detail: 'Anchored on polygon-amoy in block 42.',
      anchor: {
        rootHash: ROOT,
        txHash: '0xanchor',
        blockNumber: 42,
        anchoredAt: ANCHORED_AT,
        chainId: 80002,
        network: 'polygon-amoy',
        contractAddress: REGISTRY,
        explorerTxUrl: 'https://amoy.polygonscan.com/tx/0xanchor',
        explorerContractUrl: `https://amoy.polygonscan.com/address/${REGISTRY}`,
      },
    });
  });

  it('fails when the root is not found on-chain', async () => {
    const { blockchain } = chain(() => Promise.resolve({ exists: false }));

    const result = await anchorCheck(anchoredDocument(), blockchain);

    expect(result).toMatchObject({
      status: 'fail',
      detail: 'Merkle root not found on-chain.',
    });
    expect(result.anchor?.rootHash).toBe(ROOT);
    expect(result.chainUnavailable).toBeFalsy();
  });

  it('is pending, not failed, when the chain cannot be reached', async () => {
    const { blockchain } = chain(() => Promise.reject(new Error('RPC down')));

    const result = await anchorCheck(anchoredDocument(), blockchain);

    expect(result).toMatchObject({
      status: 'pending',
      detail:
        'On-chain check temporarily unavailable — the Merkle proof itself is valid.',
      // Tells the revocation step not to wait on the same dead RPC a second time.
      chainUnavailable: true,
    });
    expect(result.anchor?.rootHash).toBe(ROOT);
  });

  it('a bad proof never calls the chain', async () => {
    const { blockchain, calls } = chain(onChain);
    const tampered = [
      anchoredDocument({}, 'dd'.repeat(32)), // a hash that is not a leaf of the tree
      anchoredDocument({ rootHash: 'ee'.repeat(32) }), // a root the proof does not reach
    ];

    for (const doc of tampered) {
      expect(await anchorCheck(doc, blockchain)).toMatchObject({
        status: 'fail',
        detail: 'Merkle proof did not reconcile with the anchored root.',
      });
    }
    expect(calls()).toBe(0);
  });

  it('labels a simulator anchor as such, with no explorer links', async () => {
    const { blockchain } = chain(onChain);

    const result = await anchorCheck(
      anchoredDocument({
        polygonBlockNumber: 3n,
        chainId: null,
        contractAddress: null,
      }),
      blockchain,
    );

    expect(result.detail).toBe('Anchored on local-simulator in block 3.');
    expect(result.anchor).toMatchObject({
      chainId: null,
      network: 'local-simulator',
      contractAddress: null,
      explorerTxUrl: null,
      explorerContractUrl: null,
    });
  });
});

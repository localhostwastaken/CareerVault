import {
  buildMerkleTree,
  merkleProofFor,
  merkleRootHex,
} from '../../common/utils/merkle.util.js';
import { anchorBadge } from './anchor-badge.js';

const LEAVES = ['aa'.repeat(32), 'bb'.repeat(32), 'cc'.repeat(32)];
const TREE = buildMerkleTree(LEAVES);
const ROOT = merkleRootHex(TREE);
const ANCHORED_AT = new Date('2026-09-23T18:30:00.000Z');

function anchoredDocument(
  root: Record<string, unknown> = {},
  hash = LEAVES[1],
) {
  return {
    documentHash: hash,
    merkleProof: {
      proofPath: merkleProofFor(TREE, LEAVES[1]),
      merkleRoot: {
        rootHash: ROOT,
        polygonTxHash: '0x' + 'ab'.repeat(32),
        polygonBlockNumber: 42n,
        chainId: 80002,
        contractAddress: '0x5FbDB2315678afecb367f032d93F642f64180aa3',
        anchoredAt: ANCHORED_AT,
        ...root,
      },
    },
  } as never;
}

function chain(answer: () => Promise<{ exists: boolean }>) {
  let calls = 0;
  const blockchain = {
    verifyRoot: () => {
      calls++;
      return answer();
    },
  } as never;
  return { blockchain, calls: () => calls };
}

describe('anchorBadge (secondary, never decides the verdict)', () => {
  it('is pending until the document is batched, and asks the chain nothing', async () => {
    const { blockchain, calls } = chain(() =>
      Promise.resolve({ exists: true }),
    );
    const badge = await anchorBadge(
      { documentHash: LEAVES[1], merkleProof: null },
      blockchain,
    );
    expect(badge).toEqual({
      status: 'pending',
      network: null,
      explorerTxUrl: null,
      anchoredAt: null,
    });
    expect(calls()).toBe(0);
  });

  it('is anchored, with an explorer link, when the root is on-chain', async () => {
    const { blockchain } = chain(() => Promise.resolve({ exists: true }));
    const badge = await anchorBadge(anchoredDocument(), blockchain);
    expect(badge.status).toBe('anchored');
    expect(badge.explorerTxUrl).toContain('amoy.polygonscan.com/tx/0x');
    expect(badge.anchoredAt).toEqual(ANCHORED_AT);
  });

  it('is unconfirmed, with no link, when the root is not on-chain', async () => {
    const { blockchain } = chain(() => Promise.resolve({ exists: false }));
    expect(await anchorBadge(anchoredDocument(), blockchain)).toMatchObject({
      status: 'unconfirmed',
      explorerTxUrl: null,
    });
  });

  it('is unavailable, not failed, when the chain cannot be reached', async () => {
    const { blockchain } = chain(() => Promise.reject(new Error('RPC down')));
    expect((await anchorBadge(anchoredDocument(), blockchain)).status).toBe(
      'unavailable',
    );
  });

  it('never calls the chain for a proof that does not fold to the root', async () => {
    const { blockchain, calls } = chain(() =>
      Promise.resolve({ exists: true }),
    );
    const badge = await anchorBadge(
      anchoredDocument({}, 'dd'.repeat(32)),
      blockchain,
    );
    expect(badge.status).toBe('unconfirmed');
    expect(calls()).toBe(0);
  });

  it('exposes no root, proof or contract address', async () => {
    const { blockchain } = chain(() => Promise.resolve({ exists: true }));
    const badge = JSON.stringify(
      await anchorBadge(anchoredDocument(), blockchain),
    );
    expect(badge).not.toContain(ROOT);
    expect(badge).not.toContain('5FbDB2315678');
  });
});

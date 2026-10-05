import { type AnchoredProof, presentAnchor } from './document-anchor.js';

// The anchor block on a document's detail response: links must point at the document's own
// anchoring transaction, and a local-simulator anchor must never produce an explorer link.

const ROOT = 'ab'.repeat(32);
const TX = `0x${'cd'.repeat(32)}`;
const REGISTRY = '0x483f9FF4B7444c60e93808Ea0e9b72a14b8Cb12a';
const ANCHORED_AT = new Date('2026-09-30T00:00:00.000Z');

const proof = (root: Record<string, unknown> = {}, proofPath: unknown = []) =>
  ({
    proofPath,
    merkleRoot: {
      rootHash: ROOT,
      polygonTxHash: TX,
      polygonBlockNumber: 48502700n,
      chainId: 80002,
      contractAddress: REGISTRY,
      anchoredAt: ANCHORED_AT,
      ...root,
    },
  }) as never as AnchoredProof;

describe('presentAnchor', () => {
  it('links a Polygon Amoy anchor to its transaction, contract and block', () => {
    const path = [
      { hash: 'e'.repeat(64), position: 'left' },
      { hash: 'f'.repeat(64), position: 'right' },
    ];

    expect(presentAnchor(proof({}, path))).toEqual({
      merkleRoot: ROOT,
      txHash: TX,
      blockNumber: 48502700,
      anchoredAt: ANCHORED_AT,
      chainId: 80002,
      network: 'polygon-amoy',
      contractAddress: REGISTRY,
      explorerTxUrl: `https://amoy.polygonscan.com/tx/${TX}`,
      explorerContractUrl: `https://amoy.polygonscan.com/address/${REGISTRY}`,
      explorerBlockUrl: 'https://amoy.polygonscan.com/block/48502700',
      proofLength: 2,
    });
  });

  it('names a local-simulator anchor and gives it no explorer links', () => {
    const local = proof({
      polygonTxHash: `0x${'11'.repeat(32)}`,
      polygonBlockNumber: 7n,
      chainId: null,
      contractAddress: null,
    });

    expect(presentAnchor(local)).toMatchObject({
      chainId: null,
      network: 'local-simulator',
      blockNumber: 7,
      explorerTxUrl: null,
      explorerContractUrl: null,
      explorerBlockUrl: null,
    });
  });

  it('keeps a missing transaction or block as null rather than a dead link', () => {
    const anchor = presentAnchor(
      proof({ polygonTxHash: null, polygonBlockNumber: null }),
    );

    expect(anchor).toMatchObject({
      txHash: null,
      blockNumber: null,
      explorerTxUrl: null,
      explorerBlockUrl: null,
    });
    expect(anchor?.explorerContractUrl).toBe(
      `https://amoy.polygonscan.com/address/${REGISTRY}`,
    );
  });

  it('counts a proof path that is not an array as zero steps', () => {
    expect(presentAnchor(proof({}, { unexpected: true }))?.proofLength).toBe(0);
  });

  it.each([null, undefined])(
    'is null for a document with no Merkle proof (%p)',
    (missing) => {
      expect(presentAnchor(missing)).toBeNull();
    },
  );
});

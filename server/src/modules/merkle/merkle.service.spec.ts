import { MerkleService } from './merkle.service.js';

/**
 * What a MerkleRoot row records about WHERE its root lives (R2). Verification and the
 * downloadable credential read these columns back to name the network and link to the
 * transaction, so a wrong value here misleads every verifier of every document in the batch.
 */

const REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const ANCHORED_AT = new Date('2026-09-23T18:30:00.000Z');
const HASHES = ['aa'.repeat(32), 'bb'.repeat(32)];

function merkleService(
  blockchain: object,
  storedRoots: Record<string, unknown>[] = [],
) {
  const created: Record<string, unknown>[] = [];
  const tx = {
    merkleRoot: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return Promise.resolve({ id: 'root-1', ...data });
      },
    },
    documentMerkleProof: { create: () => Promise.resolve({}) },
    document: { updateMany: () => Promise.resolve({ count: 1 }) },
  };
  const prisma = {
    document: {
      findMany: () =>
        Promise.resolve(
          HASHES.map((documentHash, i) => ({
            id: `doc-${i}`,
            documentHash,
            holderId: `holder-${i}`,
            type: 'EXPERIENCE_LETTER',
          })),
        ),
    },
    $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
    user: { findUnique: () => Promise.resolve(null) },
    merkleRoot: { findMany: () => Promise.resolve(storedRoots) },
  };
  const notifications = { notify: () => Promise.resolve() };
  const pdf = { embedAnchorMetadata: () => Promise.resolve() };
  const service = new MerkleService(
    prisma as never,
    blockchain as never,
    notifications as never,
    pdf as never,
  );
  return { service, created };
}

describe('MerkleService', () => {
  it('records the chain and contract from the anchoring receipt', async () => {
    const { service, created } = merkleService({
      verifyRoot: () => Promise.resolve({ exists: false }),
      anchorRoot: () =>
        Promise.resolve({
          txHash: '0xanchor',
          blockNumber: 42,
          anchoredAt: ANCHORED_AT,
          chainId: 80002,
          contractAddress: REGISTRY,
        }),
    });

    const result = await service.runBatch();

    expect(result.txHash).toBe('0xanchor');
    expect(created).toEqual([
      expect.objectContaining({
        polygonTxHash: '0xanchor',
        polygonBlockNumber: 42n,
        chainId: 80002,
        contractAddress: REGISTRY,
        documentCount: 2,
        anchoredAt: ANCHORED_AT,
      }),
    ]);
  });

  it('records the landed transaction when a retry finds the root already anchored', async () => {
    let anchorCalls = 0;
    const { service, created } = merkleService({
      verifyRoot: () =>
        Promise.resolve({
          exists: true,
          documentCount: 2,
          anchoredAt: ANCHORED_AT,
          chainId: 80002,
          contractAddress: REGISTRY,
          txHash: '0xlanded',
          blockNumber: 77,
        }),
      anchorRoot: () => {
        anchorCalls++;
        return Promise.reject(new Error('must not anchor the same root twice'));
      },
    });

    const result = await service.runBatch();

    expect(anchorCalls).toBe(0);
    expect(result.txHash).toBe('0xlanded');
    expect(created[0]).toMatchObject({
      polygonTxHash: '0xlanded',
      polygonBlockNumber: 77n,
      chainId: 80002,
      contractAddress: REGISTRY,
      anchoredAt: ANCHORED_AT,
    });
  });

  it('records nulls for whatever the chain cannot tell it on that retry path', async () => {
    const { service, created } = merkleService({
      verifyRoot: () =>
        Promise.resolve({
          exists: true,
          documentCount: 2,
          anchoredAt: ANCHORED_AT,
        }),
    });

    await service.runBatch();

    expect(created[0]).toMatchObject({
      polygonTxHash: null,
      polygonBlockNumber: null,
      chainId: null,
      contractAddress: null,
      anchoredAt: ANCHORED_AT,
    });
  });

  it('lists batches with their network and explorer link', async () => {
    const createdAt = new Date('2026-09-23T18:31:00.000Z');
    const { service } = merkleService({}, [
      {
        id: 'root-amoy',
        rootHash: 'cc'.repeat(32),
        polygonTxHash: '0xanchor',
        polygonBlockNumber: 42n,
        chainId: 80002,
        contractAddress: REGISTRY,
        documentCount: 2,
        anchoredAt: ANCHORED_AT,
        createdAt,
      },
      {
        id: 'root-local',
        rootHash: 'dd'.repeat(32),
        polygonTxHash: '0xsimulated',
        polygonBlockNumber: 3n,
        chainId: null,
        contractAddress: null,
        documentCount: 1,
        anchoredAt: ANCHORED_AT,
        createdAt,
      },
    ]);

    const [amoy, local] = await service.listBatches('org-1');

    expect(amoy).toEqual({
      id: 'root-amoy',
      rootHash: 'cc'.repeat(32),
      txHash: '0xanchor',
      blockNumber: 42,
      chainId: 80002,
      contractAddress: REGISTRY,
      network: 'polygon-amoy',
      explorerTxUrl: 'https://amoy.polygonscan.com/tx/0xanchor',
      documentCount: 2,
      anchoredAt: ANCHORED_AT,
      createdAt,
    });
    expect(local).toMatchObject({
      blockNumber: 3,
      chainId: null,
      network: 'local-simulator',
      explorerTxUrl: null,
    });
  });
});

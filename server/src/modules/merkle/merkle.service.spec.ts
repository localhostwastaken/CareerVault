import { hashDocument } from '../../common/utils/crypto.util.js';
import { PlaintextFieldError } from '../../prisma/encryption/field-encryption.extension.js';
import { MerkleService } from './merkle.service.js';

/**
 * What a MerkleRoot row records about WHERE its root lives (R2). Verification and the
 * downloadable credential read these columns back to name the network and link to the
 * transaction, so a wrong value here misleads every verifier of every document in the batch.
 */

const REGISTRY = '0x5FbDB2315678afecb367f032d93F642f64180aa3';
const ANCHORED_AT = new Date('2026-09-23T18:30:00.000Z');
const SALT = 'ab'.repeat(32);
const contentOf = (id: string) => ({ employeeName: `Holder ${id}` });

type Stored = { contentJson: unknown; salt: string | null } | Error;

/** The rows the batch finds, keyed by id; what the gate's read returns for each. */
const valid = (id: string): [string, Stored] => [
  id,
  { contentJson: contentOf(id), salt: SALT },
];

function merkleService(
  blockchain: object,
  storedRoots: Record<string, unknown>[] = [],
  stored: [string, Stored][] = [valid('doc-0'), valid('doc-1')],
) {
  const created: Record<string, unknown>[] = [];
  const selections: { where: Record<string, unknown> }[] = [];
  const proofs: string[] = [];
  const anchored: string[] = [];
  const tx = {
    merkleRoot: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return Promise.resolve({ id: 'root-1', ...data });
      },
    },
    documentMerkleProof: {
      create: ({ data }: { data: { documentId: string } }) => {
        proofs.push(data.documentId);
        return Promise.resolve({});
      },
    },
    document: {
      updateMany: ({ where }: { where: { id: string } }) => {
        anchored.push(where.id);
        return Promise.resolve({ count: 1 });
      },
    },
  };
  const rows = new Map(stored);
  const prisma = {
    document: {
      // Every candidate claims the hash its genuine content would have.
      findMany: (args: { where: Record<string, unknown> }) => {
        selections.push(args);
        return Promise.resolve(
          stored.map(([id], i) => ({
            id,
            documentHash: hashDocument(contentOf(id), SALT),
            holderId: `holder-${i}`,
            type: 'EXPERIENCE_LETTER',
          })),
        );
      },
      findUnique: ({ where }: { where: { id: string } }) => {
        const row = rows.get(where.id);
        return row instanceof Error
          ? Promise.reject(row)
          : Promise.resolve(row ?? null);
      },
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
  return { service, created, proofs, anchored, selections };
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

  it('anchors only the documents that pass the integrity gate', async () => {
    const { service, created, proofs, anchored } = merkleService(
      {
        verifyRoot: () => Promise.resolve({ exists: false }),
        anchorRoot: () => Promise.resolve({ txHash: '0xanchor' }),
      },
      [],
      [
        valid('genuine'),
        ['planted', new PlaintextFieldError('salt')],
        [
          'altered',
          { contentJson: { employeeName: 'Someone Else' }, salt: SALT },
        ],
      ],
    );

    const result = await service.runBatch('org-1');

    // A single-leaf tree's root is the leaf itself.
    expect(result).toEqual({
      anchored: 1,
      rootHash: hashDocument(contentOf('genuine'), SALT),
      txHash: '0xanchor',
    });
    expect(created[0]).toMatchObject({ documentCount: 1 });
    expect(proofs).toEqual(['genuine']);
    expect(anchored).toEqual(['genuine']);
  });

  // Erasure nulls the salt for good, so such a document can never pass the gate. Selecting it
  // would log a false integrity alarm on every batch, forever.
  it('never selects an erased document as a candidate', async () => {
    const { service, selections } = merkleService({
      verifyRoot: () => Promise.resolve({ exists: false }),
      anchorRoot: () => Promise.resolve({ txHash: '0xanchor' }),
    });

    await service.runBatch('org-1');

    expect(selections[0].where).toMatchObject({
      status: 'ISSUED',
      salt: { not: null },
      organizationId: 'org-1',
    });
  });

  it('sends nothing on-chain when no candidate passes the gate', async () => {
    let anchorCalls = 0;
    const { service, created } = merkleService(
      {
        verifyRoot: () => Promise.resolve({ exists: false }),
        anchorRoot: () => {
          anchorCalls++;
          return Promise.resolve({ txHash: '0xanchor' });
        },
      },
      [],
      [['planted', new PlaintextFieldError('contentJson')]],
    );

    const result = await service.runBatch();

    expect(result).toEqual({ anchored: 0, rootHash: null, txHash: null });
    expect(anchorCalls).toBe(0);
    expect(created).toEqual([]);
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

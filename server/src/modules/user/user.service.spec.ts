import { UserService } from './user.service.js';

/**
 * GDPR Art. 17 erasure. Every one of the holder's documents, issued ones included, loses its
 * content and salt in the same array transaction as the USER_ERASED audit row, so the
 * anchored hash becomes a dead hash. Stored PDFs are deleted only after that commits, and a
 * storage failure must never undo or abort an erasure that already happened.
 */

const USER = 'user-1';

interface Call {
  model: string;
  op: string;
  args: { where?: unknown; data?: Record<string, unknown> };
}

function userService(
  options: {
    failDelete?: string;
    failTransaction?: boolean;
  } = {},
) {
  const events: string[] = [];
  let batch: Call[] = [];

  // An array $transaction receives the pending operations themselves, so each mocked
  // method hands back a record of its call.
  const record = (model: string, ...ops: string[]) =>
    Object.fromEntries(
      ops.map((op) => [op, (args: Call['args']) => ({ model, op, args })]),
    );

  const prisma = {
    extractedSkill: record('extractedSkill', 'deleteMany'),
    talentMatch: record('talentMatch', 'deleteMany'),
    recruiterMessage: record('recruiterMessage', 'deleteMany'),
    notification: record('notification', 'deleteMany'),
    refreshToken: record('refreshToken', 'deleteMany'),
    organizationMember: {
      ...record('organizationMember', 'updateMany'),
      findMany: () => Promise.resolve([]),
    },
    document: {
      ...record('document', 'updateMany'),
      findMany: () => Promise.resolve([{ id: 'doc-1' }, { id: 'doc-2' }]),
    },
    documentVersion: record('documentVersion', 'updateMany'),
    verifierApiKey: record('verifierApiKey', 'updateMany'),
    sharedLink: record('sharedLink', 'updateMany'),
    user: record('user', 'update'),
    auditLog: record('auditLog', 'create'),
    $transaction: (calls: Call[]) => {
      if (options.failTransaction)
        return Promise.reject(new Error('serialization failure'));
      events.push('commit');
      batch = calls;
      return Promise.resolve(calls);
    },
  };
  const storage = {
    delete: (key: string) => {
      events.push(`delete ${key}`);
      return key === options.failDelete
        ? Promise.reject(new Error('disk unavailable'))
        : Promise.resolve();
    },
  };
  const service = new UserService(prisma as never, storage as never);
  const calls = (model: string, op: string) =>
    batch.filter((call) => call.model === model && call.op === op);
  return { service, events, calls };
}

describe('UserService.deleteAccount (GDPR erasure)', () => {
  it('scrubs the content and salt of every one of the holder’s documents, whatever their status', async () => {
    const { service, calls } = userService();

    await service.deleteAccount(USER);

    expect(calls('document', 'updateMany')).toEqual([
      {
        model: 'document',
        op: 'updateMany',
        args: {
          where: { holderId: USER },
          data: { salt: null, contentJson: {}, renderedPdfUrl: null },
        },
      },
    ]);
  });

  it('keeps the hash, the signatures and the Merkle proof', async () => {
    const { service, calls } = userService();

    await service.deleteAccount(USER);

    const [scrub] = calls('document', 'updateMany');
    for (const kept of [
      'documentHash',
      'managerSignature',
      'hrSignature',
      'signingPublicKeyPem',
    ])
      expect(scrub.args.data).not.toHaveProperty(kept);
    expect(calls('documentMerkleProof', 'deleteMany')).toEqual([]);
  });

  // A version's change summary is free text (HR's approval note) that can name the holder.
  it('still scrubs every version snapshot and its change summary', async () => {
    const { service, calls } = userService();

    await service.deleteAccount(USER);

    expect(calls('documentVersion', 'updateMany')).toEqual([
      {
        model: 'documentVersion',
        op: 'updateMany',
        args: {
          where: { document: { holderId: USER } },
          data: { contentJson: {}, changeSummary: null },
        },
      },
    ]);
  });

  it('writes a USER_ERASED audit row, with no PII, in the same transaction', async () => {
    const { service, calls } = userService();

    await service.deleteAccount(USER);

    expect(calls('auditLog', 'create')).toEqual([
      {
        model: 'auditLog',
        op: 'create',
        args: {
          data: {
            actorId: USER,
            actorType: 'USER',
            action: 'USER_ERASED',
            entityType: 'USER',
            entityId: USER,
            retentionTier: 'COMPLIANCE',
          },
        },
      },
    ]);
  });

  it('deletes every stored PDF, after the transaction commits', async () => {
    const { service, events } = userService();

    await expect(service.deleteAccount(USER)).resolves.toEqual({
      deleted: true,
    });

    expect(events).toEqual([
      'commit',
      'delete documents/doc-1.pdf',
      'delete documents/doc-2.pdf',
    ]);
  });

  it('completes the erasure when a PDF cannot be deleted', async () => {
    const { service, events } = userService({
      failDelete: 'documents/doc-1.pdf',
    });

    await expect(service.deleteAccount(USER)).resolves.toEqual({
      deleted: true,
    });
    expect(events).toContain('delete documents/doc-2.pdf');
  });

  it('touches no stored PDF when the transaction fails', async () => {
    const { service, events } = userService({ failTransaction: true });

    await expect(service.deleteAccount(USER)).rejects.toThrow(
      'serialization failure',
    );
    expect(events).toEqual([]);
  });
});

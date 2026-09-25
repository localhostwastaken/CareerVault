import { DocumentService } from './document.service.js';

/**
 * Revocation vs. the chain (R7: DB status is authoritative, on-chain is secondary).
 *
 * The on-chain flag is a tamper-evident trail written after the database has already
 * revoked the document. On Polygon that write takes a fee estimate, a transaction and
 * confirmations, so HR must not wait for it, and a chain failure must never turn a
 * revocation that already happened into an error.
 */

const HASH = 'ab'.repeat(32);

function revokeFixture(revokeDocument: () => Promise<unknown>) {
  const chainCalls: string[] = [];
  const warnings: string[] = [];
  const tx = {
    document: { updateMany: () => Promise.resolve({ count: 1 }) },
    sharedLink: { updateMany: () => Promise.resolve({ count: 0 }) },
  };
  const prisma = {
    document: {
      findUnique: () =>
        Promise.resolve({
          id: 'doc-1',
          type: 'EXPERIENCE_LETTER',
          status: 'ANCHORED',
          organizationId: 'org-1',
          holderId: 'holder-1',
          documentHash: HASH,
        }),
    },
    organizationMember: {
      findFirst: () => Promise.resolve({ id: 'member-hr', role: 'HR' }),
    },
    $transaction: (work: (client: typeof tx) => Promise<unknown>) => work(tx),
    auditLog: { create: () => Promise.resolve({}) },
    user: { findUnique: () => Promise.resolve(null) },
  };
  const blockchain = {
    revokeDocument: (hash: string) => {
      chainCalls.push(hash);
      return revokeDocument();
    },
  };
  const notifications = { notify: () => Promise.resolve() };
  const service = new DocumentService(
    prisma as never,
    {} as never, // kms
    {} as never, // pdf
    notifications as never,
    blockchain as never,
    {} as never, // skills
  );
  // The response shape is not under test; only that revoke() returns at all.
  Object.assign(service, {
    present: (id: string) => Promise.resolve({ id, status: 'REVOKED' }),
    logger: { warn: (message: string) => warnings.push(message) },
  });
  const revoke = () =>
    service.revoke(
      'doc-1',
      { id: 'user-hr' } as never,
      { code: 'ISSUED_IN_ERROR', reason: 'Wrong employee' } as never,
    );
  return { revoke, chainCalls, warnings };
}

const nextMacrotask = () =>
  new Promise<'still waiting'>((resolve) =>
    setImmediate(() => resolve('still waiting')),
  );

describe('DocumentService.revoke', () => {
  it('returns without waiting for the on-chain revocation', async () => {
    const { revoke, chainCalls } = revokeFixture(() => new Promise(() => {}));

    const outcome = await Promise.race([
      revoke().then(() => 'returned' as const),
      nextMacrotask(),
    ]);

    expect(outcome).toBe('returned');
    expect(chainCalls).toEqual([HASH]);
  });

  it('logs a failed on-chain revocation as a warning instead of failing the request', async () => {
    const { revoke, warnings } = revokeFixture(() =>
      Promise.reject(new Error('RPC unreachable')),
    );

    await expect(revoke()).resolves.toMatchObject({ status: 'REVOKED' });
    await nextMacrotask();

    expect(warnings).toEqual([expect.stringMatching(/doc-1.*RPC unreachable/)]);
  });
});

import { UnprocessableEntityException } from '@nestjs/common';
import { ShareLinkService } from './share-link.service.js';

/**
 * Share links are free (scope decision 2026-11-14; billing is future scope, see SCOPE.md).
 * A holder with no subscription must get an active link at once, and no payment may be opened.
 */

const HOLDER = {
  id: 'holder-1',
  email: 'alice@holder.example.com',
  fullName: 'Alice Holder',
  hasPassword: true,
  memberships: [],
};

function fixture(status: string) {
  const created: Record<string, unknown>[] = [];
  const refusePayment = () => {
    throw new Error('a payment must never be opened for a share link');
  };
  const prisma = {
    document: {
      findUnique: () =>
        Promise.resolve({ id: 'doc-1', holderId: HOLDER.id, status }),
    },
    subscription: { findFirst: () => Promise.resolve(null) },
    payment: { create: refusePayment, update: refusePayment },
    sharedLink: {
      create: ({ data }: { data: Record<string, unknown> }) => {
        created.push(data);
        return Promise.resolve({
          id: 'link-1',
          views: 0,
          createdAt: new Date(),
          ...data,
          document: { type: 'EXPERIENCE_LETTER', organization: { name: 'TechCorp' } },
        });
      },
    },
    $transaction: refusePayment,
  };
  const payments = { openOneTimeSession: refusePayment };
  // Reflect.construct keeps the spec independent of the constructor's arity.
  const service = Reflect.construct(ShareLinkService, [prisma, payments]) as ShareLinkService;
  return { service, created };
}

describe('ShareLinkService.create', () => {
  it('creates an active link for a holder with no subscription, without opening a payment', async () => {
    const { service, created } = fixture('ANCHORED');

    const result = await service.create(HOLDER, { documentId: 'doc-1' });

    expect(result.checkout).toBeNull();
    expect(result.shareLink.isActive).toBe(true);
    expect(result.shareLink.isPaid).toBe(true);
    expect(created).toHaveLength(1);
    expect(created[0].isActive).toBe(true);
  });

  it('still refuses a document that is not issued', async () => {
    const { service } = fixture('PENDING_HR');

    await expect(service.create(HOLDER, { documentId: 'doc-1' })).rejects.toBeInstanceOf(
      UnprocessableEntityException,
    );
  });
});

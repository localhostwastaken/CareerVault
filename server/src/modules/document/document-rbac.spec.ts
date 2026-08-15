import { ForbiddenException } from '@nestjs/common';
import { DocumentService } from './document.service.js';

/**
 * Separation of duties (regression guard).
 *
 * An ORG_ADMIN used to be accepted wherever MANAGER or HR was required, both in the
 * @Roles decorator and in requireMember. That let the founder of an organisation sign
 * AND approve a document alone, which defeats the dual-signature guarantee the whole
 * product is sold on. These tests pin the boundary: admin administers, it does not
 * sign or approve.
 */

type MemberRow = {
  id: string;
  userId: string;
  organizationId: string;
  role: string;
  isActive: boolean;
};

const MEMBERS: MemberRow[] = [
  {
    id: 'm-admin',
    userId: 'u-admin',
    organizationId: 'org-1',
    role: 'ORG_ADMIN',
    isActive: true,
  },
  {
    id: 'm-mgr',
    userId: 'u-mgr',
    organizationId: 'org-1',
    role: 'MANAGER',
    isActive: true,
  },
  {
    id: 'm-hr',
    userId: 'u-hr',
    organizationId: 'org-1',
    role: 'HR',
    isActive: true,
  },
  {
    id: 'm-hr-other',
    userId: 'u-hr-other',
    organizationId: 'org-2',
    role: 'HR',
    isActive: true,
  },
];

// Only the membership lookup matters here, so the rest of Prisma stays unimplemented.
const prisma = {
  organizationMember: {
    findFirst: ({
      where,
    }: {
      where: {
        userId: string;
        organizationId: string;
        role: { in: string[] };
        isActive: boolean;
      };
    }) =>
      Promise.resolve(
        MEMBERS.find(
          (m) =>
            m.userId === where.userId &&
            m.organizationId === where.organizationId &&
            where.role.in.includes(m.role) &&
            m.isActive === where.isActive,
        ) ?? null,
      ),
  },
};

const service = new DocumentService(
  prisma as never,
  {} as never,
  {} as never,
  {} as never,
  {} as never,
  {} as never,
  {} as never,
  {} as never,
);

describe('requireMember role separation', () => {
  it('lets a MANAGER take manager-only actions in their own org', async () => {
    await expect(
      service.requireMember('u-mgr', 'org-1', ['MANAGER']),
    ).resolves.toMatchObject({ id: 'm-mgr' });
  });

  it('lets an HR take HR-only actions in their own org', async () => {
    await expect(
      service.requireMember('u-hr', 'org-1', ['HR']),
    ).resolves.toMatchObject({ id: 'm-hr' });
  });

  it('refuses an ORG_ADMIN acting as HR (approve / reject / revoke)', async () => {
    await expect(
      service.requireMember('u-admin', 'org-1', ['HR']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an ORG_ADMIN acting as MANAGER (sign / draft / return)', async () => {
    await expect(
      service.requireMember('u-admin', 'org-1', ['MANAGER']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses an HR from a different organisation', async () => {
    await expect(
      service.requireMember('u-hr-other', 'org-1', ['HR']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses a user with no membership at all', async () => {
    await expect(
      service.requireMember('u-nobody', 'org-1', ['HR']),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('still resolves the HR membership for someone who holds both roles', async () => {
    // A person may legitimately be both, but each action binds to the membership that
    // authorises it — that is what keeps the two signatures distinct.
    MEMBERS.push({
      id: 'm-dual-hr',
      userId: 'u-dual',
      organizationId: 'org-1',
      role: 'HR',
      isActive: true,
    });
    MEMBERS.push({
      id: 'm-dual-mgr',
      userId: 'u-dual',
      organizationId: 'org-1',
      role: 'MANAGER',
      isActive: true,
    });
    await expect(
      service.requireMember('u-dual', 'org-1', ['HR']),
    ).resolves.toMatchObject({ id: 'm-dual-hr' });
    await expect(
      service.requireMember('u-dual', 'org-1', ['MANAGER']),
    ).resolves.toMatchObject({ id: 'm-dual-mgr' });
  });
});

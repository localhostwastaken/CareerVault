import { EmployeeKeyResetService } from './employee-key-reset.service.js';

const ORG = 'org-1';
const admin = {
  id: 'admin-1',
  email: 'admin@example.com',
  fullName: 'Ada Admin',
  hasPassword: true,
  memberships: [
    {
      organizationId: ORG,
      organizationName: 'Acme',
      role: 'ORG_ADMIN' as const,
    },
    { organizationId: ORG, organizationName: 'Acme', role: 'MANAGER' as const },
  ],
};

function resets(signer: unknown = { id: 'member-1' }) {
  const events: string[] = [];
  const prisma = {
    organizationMember: { findFirst: () => Promise.resolve(signer) },
    employeeKey: {
      updateMany: () => {
        events.push('retire');
        return Promise.resolve({ count: 1 });
      },
    },
    auditLog: { create: () => Promise.resolve({}) },
  };
  const notifications = {
    notify: (_user: string, type: string) => {
      events.push(type);
      return Promise.resolve();
    },
  };
  return {
    service: new EmployeeKeyResetService(
      prisma as never,
      notifications as never,
    ),
    events,
  };
}

describe('EmployeeKeyResetService', () => {
  it("retires a signer's key and tells them", async () => {
    const { service, events } = resets();
    await service.reset(admin, ORG, 'user-2');
    expect(events).toEqual(['retire', 'SECURITY_ALERT']);
  });

  // A reset lets the next enrolment skip the current answers, so an admin resetting their
  // own key would bypass the very check it is the exception to.
  it('refuses an admin resetting their own key', async () => {
    const { service, events } = resets();
    await expect(service.reset(admin, ORG, admin.id)).rejects.toMatchObject({
      status: 403,
    });
    expect(events).toEqual([]);
  });

  it('refuses a target who does not sign for the organisation', async () => {
    const { service, events } = resets(null);
    await expect(service.reset(admin, ORG, 'user-2')).rejects.toMatchObject({
      status: 403,
    });
    expect(events).toEqual([]);
  });

  it('refuses anyone who is not an admin of that organisation', async () => {
    const { service } = resets();
    await expect(
      service.reset(
        { ...admin, memberships: [admin.memberships[1]] },
        ORG,
        'user-2',
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

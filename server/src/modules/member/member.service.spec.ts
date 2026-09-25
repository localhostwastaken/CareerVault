import { ConflictException } from '@nestjs/common';
import { MemberService } from './member.service.js';

/**
 * Adding a member commits the OrganizationMember row first, then sends a best-effort
 * notification (magic link for passwordless users, a plain email otherwise). A
 * notification failure must never fail the request once that row is committed — see
 * the production incident this guards against: an SMTP timeout on Render turned a
 * successful invite into a 500, and the client's retry then hit a 409 on the
 * (userId, organizationId, role) unique constraint.
 */

const ORG_ID = 'org-1';
const ACTOR = {
  id: 'admin-1',
  email: 'admin@techcorp.example.com',
  fullName: 'Admin',
  hasPassword: true,
  memberships: [
    { organizationId: ORG_ID, organizationName: 'TechCorp', role: 'ORG_ADMIN' as const },
  ],
};

interface Options {
  existingUser?: { id: string; email: string; passwordHash: string | null } | null;
  duplicate?: { id: string; isActive: boolean } | null;
  emailResolves?: boolean;
  magicLinkResolves?: boolean;
}

function memberService(options: Options = {}) {
  const {
    existingUser = null,
    duplicate = null,
    emailResolves = true,
    magicLinkResolves = true,
  } = options;

  const warnCalls: unknown[] = [];
  const emailSendCalls: unknown[] = [];
  const magicLinkRequestCalls: unknown[] = [];

  const memberRow = {
    id: 'member-1',
    userId: existingUser?.id ?? 'user-new',
    role: 'MANAGER',
    isActive: true,
    invitedAt: new Date('2026-01-01'),
    joinedAt: new Date('2026-01-01'),
    user: { email: 'invitee@techcorp.example.com', fullName: 'Invitee' },
  };

  const prisma = {
    organization: {
      findUniqueOrThrow: () => Promise.resolve({ name: 'TechCorp' }),
    },
    user: {
      findUnique: () => Promise.resolve(existingUser),
      create: () =>
        Promise.resolve({
          id: 'user-new',
          email: 'invitee@techcorp.example.com',
          passwordHash: null,
        }),
    },
    organizationMember: {
      findUnique: () => Promise.resolve(duplicate),
      create: () => Promise.resolve(memberRow),
      update: () => Promise.resolve(memberRow),
    },
  };

  const email = {
    send: (message: unknown) => {
      emailSendCalls.push(message);
      return emailResolves
        ? Promise.resolve()
        : Promise.reject(new Error('Connection timeout'));
    },
  };

  const magicLink = {
    request: (...args: unknown[]) => {
      magicLinkRequestCalls.push(args);
      return magicLinkResolves
        ? Promise.resolve()
        : Promise.reject(new Error('Connection timeout'));
    },
  };

  const config = {
    get: () => 'http://localhost:5173',
  };

  const service = new MemberService(
    prisma as never,
    email as never,
    magicLink as never,
    config as never,
  );

  // Capture logger.warn without depending on Nest's Logger internals.
  (service as unknown as { logger: { warn: (arg: unknown) => void } }).logger = {
    warn: (arg: unknown) => warnCalls.push(arg),
  } as never;

  return { service, warnCalls, emailSendCalls, magicLinkRequestCalls };
}

describe('MemberService.add — notification failure semantics', () => {
  it('resolves with the member even when the magic-link email fails (new user)', async () => {
    const { service, warnCalls } = memberService({ magicLinkResolves: false });

    const result = await service.add(ORG_ID, ACTOR, {
      email: 'invitee@techcorp.example.com',
      role: 'MANAGER',
    });

    expect(result.id).toBe('member-1');
    expect(result.role).toBe('MANAGER');
    expect(warnCalls).toHaveLength(1);
    expect(warnCalls[0]).toMatchObject({
      event: 'member_invite_notification_failed',
      channel: 'magic_link',
    });
  });

  it('resolves with the member even when the notification email fails (existing user with a password)', async () => {
    const { service, warnCalls } = memberService({
      existingUser: {
        id: 'user-existing',
        email: 'invitee@techcorp.example.com',
        passwordHash: 'hashed',
      },
      emailResolves: false,
    });

    const result = await service.add(ORG_ID, ACTOR, {
      email: 'invitee@techcorp.example.com',
      role: 'MANAGER',
    });

    expect(result.id).toBe('member-1');
    expect(warnCalls).toHaveLength(1);
    expect(warnCalls[0]).toMatchObject({
      event: 'member_invite_notification_failed',
      channel: 'email',
    });
  });

  it('still throws ConflictException for an already-active duplicate membership', async () => {
    const { service } = memberService({
      duplicate: { id: 'dup-1', isActive: true },
    });

    await expect(
      service.add(ORG_ID, ACTOR, {
        email: 'invitee@techcorp.example.com',
        role: 'MANAGER',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('does not warn and calls the magic link exactly once when notification succeeds (new user)', async () => {
    const { service, warnCalls, magicLinkRequestCalls } = memberService();

    const result = await service.add(ORG_ID, ACTOR, {
      email: 'invitee@techcorp.example.com',
      role: 'MANAGER',
    });

    expect(result.id).toBe('member-1');
    expect(warnCalls).toHaveLength(0);
    expect(magicLinkRequestCalls).toHaveLength(1);
    expect(magicLinkRequestCalls[0]).toEqual([
      'invitee@techcorp.example.com',
      'EMAIL_VERIFY',
    ]);
  });

  it('does not warn and calls email.send exactly once when notification succeeds (existing user with a password)', async () => {
    const { service, warnCalls, emailSendCalls } = memberService({
      existingUser: {
        id: 'user-existing',
        email: 'invitee@techcorp.example.com',
        passwordHash: 'hashed',
      },
    });

    const result = await service.add(ORG_ID, ACTOR, {
      email: 'invitee@techcorp.example.com',
      role: 'MANAGER',
    });

    expect(result.id).toBe('member-1');
    expect(warnCalls).toHaveLength(0);
    expect(emailSendCalls).toHaveLength(1);
    expect(emailSendCalls[0]).toMatchObject({ to: 'invitee@techcorp.example.com' });
  });
});

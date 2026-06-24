import { ForbiddenException } from '@nestjs/common';
import type { MemberRole } from '../../generated/prisma/enums.js';
import type {
  AuthMembership,
  AuthenticatedUser,
} from '../types/authenticated-user.js';

// Per-organization scoping (R: org-scoping at the service layer). Role guards only
// check role *presence*; services must confirm the role applies to THIS org.
export function membershipFor(
  user: AuthenticatedUser,
  orgId: string,
): AuthMembership | undefined {
  return user.memberships.find((m) => m.organizationId === orgId);
}

export function assertOrgRole(
  user: AuthenticatedUser,
  orgId: string,
  allowed: MemberRole[],
): void {
  const membership = membershipFor(user, orgId);
  if (!membership || !allowed.includes(membership.role)) {
    throw new ForbiddenException('You do not have access to this organization');
  }
}

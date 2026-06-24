import type { MemberRole } from '../../generated/prisma/enums.js';

export interface AuthMembership {
  organizationId: string;
  organizationName: string;
  role: MemberRole;
}

// Shape attached to request.user by JwtStrategy and surfaced via @CurrentUser.
export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  hasPassword: boolean;
  memberships: AuthMembership[];
}

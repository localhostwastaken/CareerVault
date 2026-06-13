import { SetMetadata } from '@nestjs/common';

// Auth-context roles for route guards. ORG_ADMIN/MANAGER/HR/RECRUITER come from
// organization_members; HOLDER is any registered user. VERIFIER is public (no guard).
export type AppRole = 'ORG_ADMIN' | 'MANAGER' | 'HR' | 'RECRUITER' | 'HOLDER';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);

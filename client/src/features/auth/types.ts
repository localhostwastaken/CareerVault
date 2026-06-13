export type AppRole = 'ORG_ADMIN' | 'MANAGER' | 'HR' | 'RECRUITER' | 'HOLDER'

export interface Membership {
  organizationId: string
  organizationName: string
  role: AppRole
}

export interface AuthUser {
  id: string
  email: string
  fullName: string
  memberships: Membership[]
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

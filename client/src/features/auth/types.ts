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
  hasPassword: boolean
  memberships: Membership[]
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

// A persona is one "hat" the user can wear. Every user always has a HOLDER persona
// (their personal career wallet). Each org membership adds another persona for that
// role+org combination. The active persona determines the sidebar nav, accessible
// routes, and org context.
export interface Persona {
  role: AppRole
  organizationId: string | null
  organizationName: string | null
}

import type { AppRole } from '@/features/auth/types'

export type OrgMemberRole = Exclude<AppRole, 'HOLDER'>

export interface Member {
  id: string
  userId: string
  email: string
  fullName: string
  role: AppRole
  isActive: boolean
  invitedAt: string | null
  joinedAt: string | null
}

export interface AddMemberRequest {
  email: string
  role: OrgMemberRole
  fullName?: string
}

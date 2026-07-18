import {
  BarChart3,
  Building2,
  CheckSquare,
  CreditCard,
  FileText,
  Inbox,
  KeyRound,
  LayoutDashboard,
  Search,
  Share2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Users,
  type LucideIcon,
} from 'lucide-react'
import type { AppRole, AuthUser } from '@/features/auth/types'

export interface NavItem {
  label: string
  to: string
  icon: LucideIcon
}

export interface RoleConfig {
  label: string
  home: string
  nav: NavItem[]
}

// Resolve the user's primary portal from their memberships (highest privilege first);
// a user with no org membership is a HOLDER.
const ROLE_PRIORITY: AppRole[] = ['ORG_ADMIN', 'HR', 'MANAGER', 'RECRUITER', 'HOLDER']

export function primaryRole(user: AuthUser | null): AppRole {
  if (!user) return 'HOLDER'
  for (const role of ROLE_PRIORITY) {
    if (user.memberships.some((m) => m.role === role)) return role
  }
  return 'HOLDER'
}

export const ROLE_CONFIG: Record<AppRole, RoleConfig> = {
  HOLDER: {
    label: 'Career Wallet',
    home: '/app/wallet',
    nav: [
      { label: 'Wallet', to: '/app/wallet', icon: LayoutDashboard },
      { label: 'Documents', to: '/app/documents', icon: FileText },
      { label: 'Share Links', to: '/app/share-links', icon: Share2 },
      { label: 'Talent Profile', to: '/app/skills', icon: Sparkles },
      { label: 'Billing', to: '/app/billing', icon: CreditCard },
      { label: 'Verifier API', to: '/app/verifier-api', icon: KeyRound },
    ],
  },
  MANAGER: {
    label: 'Manager Portal',
    home: '/app/inbox',
    nav: [
      { label: 'Inbox', to: '/app/inbox', icon: Inbox },
      { label: 'Signed', to: '/app/signed', icon: FileText },
    ],
  },
  HR: {
    label: 'HR Portal',
    home: '/app/approvals',
    nav: [
      { label: 'Approvals', to: '/app/approvals', icon: CheckSquare },
      { label: 'Bulk Issue', to: '/app/bulk', icon: UploadCloud },
      { label: 'Issued', to: '/app/issued', icon: FileText },
    ],
  },
  ORG_ADMIN: {
    label: 'Admin Console',
    home: '/app/org',
    nav: [
      { label: 'Organization', to: '/app/org', icon: Building2 },
      { label: 'Members', to: '/app/members', icon: Users },
      { label: 'Analytics', to: '/app/analytics', icon: BarChart3 },
      { label: 'Audit Log', to: '/app/audit', icon: ShieldCheck },
    ],
  },
  RECRUITER: {
    label: 'Talent',
    home: '/app/talent',
    nav: [
      { label: 'Talent Search', to: '/app/talent', icon: Search },
      { label: 'Matches', to: '/app/matches', icon: Sparkles },
    ],
  },
}

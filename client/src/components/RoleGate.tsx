import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { AppRole } from '@/features/auth/types'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_CONFIG } from '@/lib/roles'

// Restrict a route to specific role(s); others are sent to their own home. Works as a
// layout route (Outlet) or wrapping explicit children. The server still authorizes
// every request — this is the UX-layer guard.
export function RoleGate({ allow, children }: { allow: AppRole | AppRole[]; children?: ReactNode }) {
  const { role } = useAuth()
  const allowed = Array.isArray(allow) ? allow : [allow]
  if (!allowed.includes(role)) {
    return <Navigate to={ROLE_CONFIG[role].home} replace />
  }
  return children ? <>{children}</> : <Outlet />
}

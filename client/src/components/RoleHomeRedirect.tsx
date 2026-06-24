import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_CONFIG } from '@/lib/roles'

// The /app index — send each user to their role's home screen.
export function RoleHomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={ROLE_CONFIG[role].home} replace />
}

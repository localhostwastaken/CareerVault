import { useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import type { AppDispatch, RootState } from '@/store'
import { setActivePersona } from '@/features/auth/authSlice'
import type { Persona } from '@/features/auth/types'
import { ROLE_CONFIG } from '@/lib/roles'

export const useAppDispatch = () => useDispatch<AppDispatch>()

export function useAuth() {
  const auth = useSelector((state: RootState) => state.auth)
  return {
    ...auth,
    isAuthenticated: Boolean(auth.token),
    role: auth.activeRole,
  }
}

// Build the list of personas the user can switch between. Every user always has
// a HOLDER persona (their personal career wallet). Each membership adds another
// persona for that role+org combination.
export function usePersonas(): Persona[] {
  const user = useSelector((state: RootState) => state.auth.user)
  return useMemo(() => {
    if (!user) return []
    const set = new Map<string, Persona>()
    // HOLDER persona is always available — the user's own career wallet.
    set.set('HOLDER', { role: 'HOLDER', organizationId: null, organizationName: null })
    for (const m of user.memberships) {
      const key = `${m.role}:${m.organizationId}`
      if (!set.has(key)) {
        set.set(key, { role: m.role, organizationId: m.organizationId, organizationName: m.organizationName })
      }
    }
    return Array.from(set.values())
  }, [user])
}

// Switch to a different persona and navigate to its home page.
export function useSwitchPersona() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  return (persona: Persona) => {
    dispatch(setActivePersona({ role: persona.role, organizationId: persona.organizationId }))
    navigate(ROLE_CONFIG[persona.role].home, { replace: true })
  }
}

// Human-readable label for a persona. E.g. "Admin · Acme Corp" or "Personal".
export function personaLabel(p: Persona): string {
  if (p.role === 'HOLDER') return 'Personal'
  const roleLabel = ROLE_CONFIG[p.role].label.replace(' Portal', '').replace('Console', '')
  return p.organizationName ? `${roleLabel} · ${p.organizationName}` : roleLabel
}

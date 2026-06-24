import type { AppRole, AuthUser } from './types'

// The active persona (role + org) lives in Redux memory, which a hard refresh wipes.
// On reload AuthRefresh restores the session from the httpOnly cookie, so without this
// the user is snapped back to their default role even if they were working as, say, HR.
// We mirror the persona into sessionStorage so the restore can put them back where they were.
const STORAGE_KEY = 'cv.activePersona'

export interface StoredPersona {
  role: AppRole
  organizationId: string | null
}

export function loadPersona(): StoredPersona | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredPersona>
    if (typeof parsed?.role !== 'string') return null
    return { role: parsed.role, organizationId: parsed.organizationId ?? null }
  } catch {
    return null
  }
}

export function savePersona(persona: StoredPersona): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(persona))
  } catch {
    // sessionStorage unavailable (private mode / quota) — persona stays in-memory only.
  }
}

export function clearPersona(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

// Only honor a restored persona if the user still holds that exact role+org. Memberships
// can change server-side between sessions; HOLDER is the personal wallet everyone always has.
export function isPersonaValid(persona: StoredPersona, user: AuthUser): boolean {
  if (persona.role === 'HOLDER') return persona.organizationId === null
  return user.memberships.some(
    (m) => m.role === persona.role && m.organizationId === persona.organizationId,
  )
}

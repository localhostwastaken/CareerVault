import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppRole, AuthResponse, AuthUser } from './types'
import { primaryRole } from '@/lib/roles'
import { clearPersona, isPersonaValid, loadPersona, savePersona } from './persona'

interface AuthState {
  token: string | null
  user: AuthUser | null
  // The persona the user is currently operating as. Determines the sidebar nav,
  // accessible routes, and org-scoped views. Stored explicitly (not derived from
  // memberships) so the user can switch between their roles seamlessly, and mirrored
  // to sessionStorage (see ./persona) so it survives a hard refresh.
  activeRole: AppRole
  activeOrgId: string | null
}

const persisted = loadPersona()
const initialState: AuthState = {
  token: null,
  user: null,
  activeRole: persisted?.role ?? 'HOLDER',
  activeOrgId: persisted?.organizationId ?? null,
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthResponse>) {
      const user = action.payload.user
      state.token = action.payload.token
      state.user = user
      // Restore the persona the user last worked in (across a hard refresh) when it is
      // still valid for their current memberships; otherwise default to the highest-
      // priority membership, falling back to HOLDER (personal career wallet).
      const restored = loadPersona()
      if (restored && isPersonaValid(restored, user)) {
        state.activeRole = restored.role
        state.activeOrgId = restored.organizationId
        return
      }
      const best = primaryRole(user)
      state.activeRole = best
      state.activeOrgId =
        best !== 'HOLDER'
          ? (user.memberships.find((m) => m.role === best)?.organizationId ?? null)
          : null
      savePersona({ role: state.activeRole, organizationId: state.activeOrgId })
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      // If the active persona doesn't have an org yet (e.g. fresh ORG_ADMIN before
      // creating their first org), sync it from the updated membership list.
      if (!state.activeOrgId) {
        const match = action.payload.memberships.find((m) => m.role === state.activeRole)
        if (match) {
          state.activeOrgId = match.organizationId
          savePersona({ role: state.activeRole, organizationId: match.organizationId })
        }
      }
    },
    // Switch to a different persona. The caller must also navigate to the new
    // role's home page (see usePersonas / PortalLayout).
    setActivePersona(state, action: PayloadAction<{ role: AppRole; organizationId: string | null }>) {
      state.activeRole = action.payload.role
      state.activeOrgId = action.payload.organizationId
      savePersona({ role: action.payload.role, organizationId: action.payload.organizationId })
    },
    logout(state) {
      state.token = null
      state.user = null
      state.activeRole = 'HOLDER'
      state.activeOrgId = null
      clearPersona()
    },
  },
})

export const { setCredentials, setUser, setActivePersona, logout } = authSlice.actions
export default authSlice.reducer

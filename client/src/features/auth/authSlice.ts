import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AppRole, AuthResponse, AuthUser } from './types'
import { primaryRole } from '@/lib/roles'

interface AuthState {
  token: string | null
  user: AuthUser | null
  // The persona the user is currently operating as. Determines the sidebar nav,
  // accessible routes, and org-scoped views. Stored explicitly (not derived from
  // memberships) so the user can switch between their roles seamlessly.
  activeRole: AppRole
  activeOrgId: string | null
}

const initialState: AuthState = { token: null, user: null, activeRole: 'HOLDER', activeOrgId: null }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthResponse>) {
      state.token = action.payload.token
      state.user = action.payload.user
      // Default the active persona to the highest-priority membership, falling
      // back to HOLDER (personal career wallet) when the user has no memberships.
      const best = primaryRole(action.payload.user)
      state.activeRole = best
      state.activeOrgId =
        best !== 'HOLDER'
          ? (action.payload.user.memberships.find((m) => m.role === best)?.organizationId ?? null)
          : null
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
      // If the active persona doesn't have an org yet (e.g. fresh ORG_ADMIN before
      // creating their first org), sync it from the updated membership list.
      if (!state.activeOrgId) {
        const match = action.payload.memberships.find((m) => m.role === state.activeRole)
        if (match) state.activeOrgId = match.organizationId
      }
    },
    // Switch to a different persona. The caller must also navigate to the new
    // role's home page (see usePersonas / PortalLayout).
    setActivePersona(state, action: PayloadAction<{ role: AppRole; organizationId: string | null }>) {
      state.activeRole = action.payload.role
      state.activeOrgId = action.payload.organizationId
    },
    logout(state) {
      state.token = null
      state.user = null
      state.activeRole = 'HOLDER'
      state.activeOrgId = null
    },
  },
})

export const { setCredentials, setUser, setActivePersona, logout } = authSlice.actions
export default authSlice.reducer

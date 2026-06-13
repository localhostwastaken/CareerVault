import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AuthResponse, AuthUser } from './types'

interface AuthState {
  token: string | null
  user: AuthUser | null
  activeOrgId: string | null
}

const initialState: AuthState = { token: null, user: null, activeOrgId: null }

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<AuthResponse>) {
      state.token = action.payload.token
      state.user = action.payload.user
      state.activeOrgId = action.payload.user.memberships[0]?.organizationId ?? null
    },
    setUser(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload
    },
    setActiveOrg(state, action: PayloadAction<string>) {
      state.activeOrgId = action.payload
    },
    logout(state) {
      state.token = null
      state.user = null
      state.activeOrgId = null
    },
  },
})

export const { setCredentials, setUser, setActiveOrg, logout } = authSlice.actions
export default authSlice.reducer

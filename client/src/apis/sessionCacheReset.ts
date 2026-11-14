import { createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import { APISlice } from './APISlice'
import { logout, setActivePersona, setCredentials } from '../features/auth/authSlice'
import type { AuthResponse } from '../features/auth/types'

// Audit F04: most cached queries take no user argument (documents, notifications,
// members…), so their cache keys are identical across identities. Without a reset, the
// next person to sign in on this tab is shown the previous person's data until a refetch.
// A token refresh for the same user keeps the cache; any change of who, or of which
// persona's org scope, drops it.
export const sessionCacheReset = createListenerMiddleware()

sessionCacheReset.startListening({
  matcher: isAnyOf(logout, setActivePersona, setCredentials),
  effect: (action, listenerApi) => {
    if (setCredentials.match(action)) {
      const previous = listenerApi.getOriginalState() as { auth: { user: { id: string } | null } }
      const next = (action.payload as AuthResponse).user.id
      if (previous.auth.user?.id === next) return
    }
    listenerApi.dispatch(APISlice.util.resetApiState())
  },
})

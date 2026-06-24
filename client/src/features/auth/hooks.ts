import { useAppDispatch } from '@/hooks/useAuth'
import { authApi } from './authApi'
import { setUser } from './authSlice'

// Re-fetch the authenticated user (incl. fresh memberships) and update the store.
// Call after actions that change the user's org roles (e.g. founding an org).
export function useRefreshAuthUser() {
  const dispatch = useAppDispatch()
  return async () => {
    const user = await dispatch(authApi.endpoints.me.initiate(undefined, { forceRefetch: true })).unwrap()
    dispatch(setUser(user))
  }
}

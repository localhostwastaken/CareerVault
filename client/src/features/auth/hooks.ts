import { useNavigate } from 'react-router-dom'
import { useAppDispatch } from '@/hooks/useAuth'
import { authApi, useLogoutMutation } from './authApi'
import { logout as logoutAction, setUser } from './authSlice'

// Re-fetch the authenticated user (incl. fresh memberships) and update the store.
// Call after actions that change the user's org roles (e.g. founding an org).
export function useRefreshAuthUser() {
  const dispatch = useAppDispatch()
  return async () => {
    const user = await dispatch(authApi.endpoints.me.initiate(undefined, { forceRefetch: true })).unwrap()
    dispatch(setUser(user))
  }
}

// One sign-out path for the portal menu and the demo guide's account switcher. A failed
// server call still clears the local session, so the user is never stuck signed in.
export function useSignOut() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [logout] = useLogoutMutation()
  return async (redirectTo = '/auth/login') => {
    try {
      await logout().unwrap()
    } catch {
      // network errors are fine: clearing local state below still signs the user out
    }
    dispatch(logoutAction())
    navigate(redirectTo, { replace: true })
  }
}

import { useEffect, useRef } from 'react'
import { useRefreshMutation } from '@/features/auth/authApi'
import { setCredentials } from '@/features/auth/authSlice'
import { useAppDispatch } from '@/hooks/useAuth'

// Restore the auth session from the httpOnly refresh cookie on app startup.
// Without this, every page reload wipes the in-memory Redux token and logs
// the user out even though the cookie is still valid.
export function AuthRefresh({ children }: { children: React.ReactNode }) {
  const dispatch = useAppDispatch()
  const [refresh] = useRefreshMutation()
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    ;(async () => {
      try {
        const result = await refresh().unwrap()
        dispatch(setCredentials(result))
      } catch {
        // No valid refresh cookie — user must sign in.
      }
    })()
  }, [refresh, dispatch])

  return <>{children}</>
}

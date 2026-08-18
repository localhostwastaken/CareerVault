import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

// Gate for the authenticated area, and the ONLY place that decides an unauthenticated
// visitor must go to sign in.
//
// The third state is the whole point: the access token is memory-only, so on a cold load
// the app is 'restoring' until bootstrapSession resolves. Treating that as "signed out"
// is what used to paint the sign-in screen for a moment on every reload before bouncing
// the user back. Public routes are unaffected — they render outside this guard.
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') return <LoadingScreen />

  if (status === 'anonymous') {
    // Carry the search and hash too — list views encode their filters there, so a shared
    // "/app/documents?status=progress" link must survive the sign-in detour.
    return (
      <Navigate
        to="/auth/login"
        replace
        state={{ from: location.pathname + location.search + location.hash }}
      />
    )
  }

  return <Outlet />
}

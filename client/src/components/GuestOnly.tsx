import { Navigate, Outlet, useLocation } from 'react-router-dom'
import LoadingScreen from '@/components/LoadingScreen'
import { useAuth } from '@/hooks/useAuth'

// Wraps the sign-in and sign-up routes. Waiting on 'restoring' stops the form painting for
// a moment when an already-signed-in user opens /auth/login directly, and sending them on
// once credentials land makes this the single owner of the post-authentication redirect —
// Login and Register no longer navigate themselves.
//
// It intentionally does NOT wrap /auth/magic, /auth/forgot-password or /auth/reset-password:
// the magic-link page signs the user in and then continues to its own set-password stage,
// and a signed-in user may legitimately open a reset link.
export function GuestOnly() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'restoring') return <LoadingScreen />

  if (status === 'authenticated') {
    // Where RequireAuth intercepted them, if anywhere. Otherwise /app, whose index route
    // resolves each persona's home screen.
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from ?? '/app'} replace />
  }

  return <Outlet />
}

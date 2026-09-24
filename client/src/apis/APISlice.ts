import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { Dispatch } from '@reduxjs/toolkit'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import apiConfig from '../config/APIEndpoints'
import { logout, sessionRestoreFailed, setCredentials } from '../features/auth/authSlice'
import type { AuthResponse } from '../features/auth/types'
import type { RootState } from '../store'

const CSRF_COOKIE = 'cv_csrf'

// Auth endpoints that either don't carry a bearer token or are themselves the refresh call — a 401 from these is a real credential/refresh failure, not an expired access token, so they must never trigger the reauth-and-retry flow below (the refresh call itself would recurse forever otherwise).
const PUBLIC_AUTH_URLS = new Set([
  '/auth/refresh',
  '/auth/login',
  '/auth/register',
  '/auth/magic-link',
  '/auth/verify-magic-link',
  '/auth/forgot-password',
  '/auth/reset-password',
])

// Reads the non-httpOnly cv_csrf cookie the API sets alongside the refresh cookie, so we can echo it back for the double-submit CSRF check.
function readCsrfToken(): string | undefined {
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${CSRF_COOKIE}=([^;]*)`),
  )
  return match ? decodeURIComponent(match[1]) : undefined
}

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiConfig.getEndpoint(),
  credentials: 'include',
  prepareHeaders: (headers, { getState, type }) => {
    const token = (getState() as RootState).auth.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
    // Attach the CSRF token on mutations (refresh/logout are cookie-authed and
    // cross-site in prod); the server matches it against the cv_csrf cookie.
    if (type === 'mutation') {
      const csrf = readCsrfToken()
      if (csrf) headers.set('x-csrf-token', csrf)
    }
    return headers
  },
})

// The server wraps every success as { success, data, meta } — unwrap to `data`
// so endpoints work with the payload directly. Errors keep the { success:false,
// error } envelope under FetchBaseQueryError.data (see useApiError).
const baseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const result = await rawBaseQuery(args, api, extraOptions)
  if (result.data && typeof result.data === 'object' && 'success' in result.data) {
    const envelope = result.data as { success: boolean; data?: unknown }
    if (envelope.success) return { ...result, data: envelope.data }
  }
  return result
}

// ── Session restore ─────────────────────────────────────────────────────────────
// THE single implementation of "exchange the httpOnly refresh cookie for a new access
// token". Both callers go through it: the startup bootstrap (see bootstrapSession) and
// the 401 retry in baseQueryWithReauth. A plain fetch is the right tool — the call is
// cookie-authed, so it needs neither the bearer header nor the envelope-unwrap layer,
// and going through RTK Query would mean a second, divergent copy of this logic.
//
// The in-flight promise is shared so that N concurrent 401s (e.g. a page that fires
// several queries at once) produce ONE refresh, not N racing rotations of a single-use
// refresh token.
let refreshPromise: Promise<boolean> | null = null

export function refreshSession(dispatch: Dispatch): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        // The CSRF header must be attached explicitly. prepareHeaders only adds it when
        // api.type === 'mutation', and that type is fixed to whichever endpoint triggered
        // the call chain — for a 401 from a query (e.g. the notification poll) it is still
        // 'query', which got the CSRF-gated refresh rejected with 403 and forced a real
        // logout instead of a silent reauth.
        const csrf = readCsrfToken()
        const response = await fetch(`${apiConfig.getEndpoint()}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
          headers: csrf ? { 'x-csrf-token': csrf } : undefined,
        })
        if (!response.ok) return false
        const envelope = (await response.json()) as { success?: boolean; data?: AuthResponse }
        if (!envelope?.success || !envelope.data) return false
        dispatch(setCredentials(envelope.data))
        return true
      } catch {
        // Network failure — indistinguishable from "no session" to the caller.
        return false
      }
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// Called once at startup, before React renders. Resolving this is what flips auth status
// out of 'restoring', which is what the route guards wait on.
export async function bootstrapSession(dispatch: Dispatch): Promise<void> {
  const restored = await refreshSession(dispatch)
  if (!restored) dispatch(sessionRestoreFailed())
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions)
  const url = typeof args === 'string' ? args : args.url

  if (result.error?.status === 401 && !PUBLIC_AUTH_URLS.has(url)) {
    const refreshed = await refreshSession(api.dispatch)
    if (refreshed) {
      result = await baseQuery(args, api, extraOptions)
    } else {
      // Redux-only: RequireAuth sees status 'anonymous' and navigates to /auth/login,
      // preserving the intended destination. A hard window.location redirect here would
      // discard the router state and re-run the whole startup restore.
      api.dispatch(logout())
    }
  }

  return result
}

export const APISlice = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'Auth',
    'User',
    'Org',
    'Member',
    'Document',
    'ShareLink',
    'Notification',
    'Payment',
    'Subscription',
    'Audit',
    'JobOpening',
    'Match',
    'Skill',
    'Message',
    'BulkBatch',
    'VerifierKey',
    'AnchorBatch',
    'Analytics',
  ],
  endpoints: () => ({}),
})

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryApi, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import apiConfig from '../config/APIEndpoints'
import { logout, setCredentials } from '../features/auth/authSlice'
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

// The 15-minute access token expires while a tab stays open. Share one in-flight refresh across every concurrent 401 instead of letting each caller race its own refresh request.
let refreshPromise: Promise<boolean> | null = null

async function reauthenticate(api: BaseQueryApi, extraOptions: object): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      // prepareHeaders only attaches the CSRF header when api.type === 'mutation', but that type is fixed to whichever endpoint originally triggered this call chain — for a 401 coming from a query (e.g. the notification poll) it's still 'query', so the CSRF-gated refresh got silently rejected with 403 and forced a real logout instead of a silent reauth. Attach it directly here instead.
      const csrf = readCsrfToken()
      const result = await rawBaseQuery(
        {
          url: '/auth/refresh',
          method: 'POST',
          headers: csrf ? { 'x-csrf-token': csrf } : undefined,
        },
        api,
        extraOptions,
      )
      const envelope = result.data as { success: boolean; data?: AuthResponse } | undefined
      if (!envelope?.success || !envelope.data) return false
      api.dispatch(setCredentials(envelope.data))
      return true
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await baseQuery(args, api, extraOptions)
  const url = typeof args === 'string' ? args : args.url

  if (result.error?.status === 401 && !PUBLIC_AUTH_URLS.has(url)) {
    const refreshed = await reauthenticate(api, extraOptions)
    if (refreshed) {
      result = await baseQuery(args, api, extraOptions)
    } else {
      api.dispatch(logout())
      if (!window.location.pathname.startsWith('/auth/')) {
        window.location.assign('/auth/login')
      }
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
  ],
  endpoints: () => ({}),
})

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import apiConfig from '../config/APIEndpoints'
import type { RootState } from '../store'

const CSRF_COOKIE = 'cv_csrf'

// Reads the non-httpOnly cv_csrf cookie the API sets alongside the refresh
// cookie, so we can echo it back for the double-submit CSRF check.
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

export const APISlice = createApi({
  reducerPath: 'api',
  baseQuery,
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

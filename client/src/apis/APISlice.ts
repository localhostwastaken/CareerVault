import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react'
import apiConfig from '../config/APIEndpoints'
import type { RootState } from '../store'

const rawBaseQuery = fetchBaseQuery({
  baseUrl: apiConfig.getEndpoint(),
  credentials: 'include',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token
    if (token) headers.set('Authorization', `Bearer ${token}`)
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

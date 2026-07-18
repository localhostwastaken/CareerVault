import { APISlice } from '@/apis/APISlice'
import type { CreatedVerifierKey, VerifierKey } from './types'

export const verifierKeyApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listVerifierKeys: builder.query<VerifierKey[], void>({
      query: () => ({ url: '/verifier-keys' }),
      providesTags: ['VerifierKey'],
    }),
    createVerifierKey: builder.mutation<CreatedVerifierKey, { name?: string }>({
      query: (body) => ({ url: '/verifier-keys', method: 'POST', body }),
      invalidatesTags: ['VerifierKey'],
    }),
    revokeVerifierKey: builder.mutation<VerifierKey, string>({
      query: (id) => ({ url: `/verifier-keys/${id}`, method: 'DELETE' }),
      invalidatesTags: ['VerifierKey'],
    }),
  }),
})

export const { useListVerifierKeysQuery, useCreateVerifierKeyMutation, useRevokeVerifierKeyMutation } =
  verifierKeyApi

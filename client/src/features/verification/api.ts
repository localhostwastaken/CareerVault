import { APISlice } from '@/apis/APISlice'
import type { VerificationResult } from './types'

// Public, no-auth verification. The APISlice attaches a token only if one exists,
// so these work for anonymous verifiers.
export const verificationApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    verifyByHash: builder.query<VerificationResult, string>({
      query: (hash) => ({ url: `/verify/hash/${hash}` }),
    }),
    verifyByToken: builder.query<VerificationResult, string>({
      query: (token) => ({ url: `/verify/${token}` }),
      // Viewing a share link increments its server-side view count, so never serve a
      // cached result — each genuine view must reach the server.
      keepUnusedDataFor: 0,
    }),
  }),
})

export const { useVerifyByHashQuery, useVerifyByTokenQuery } = verificationApi

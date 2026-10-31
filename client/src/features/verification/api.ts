import { APISlice } from '@/apis/APISlice'
import type { VerificationResult } from './types'

// Public, no-auth verification. The client sends only a document ID or a share token; every
// check runs on the server.
export const verificationApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    verifyByDocument: builder.query<VerificationResult, string>({
      query: (documentId) => ({ url: `/verify/document/${documentId}` }),
    }),
    verifyByToken: builder.query<VerificationResult, string>({
      query: (token) => ({ url: `/verify/${token}` }),
      // Viewing a share link increments its server-side view count, so never serve a
      // cached result — each genuine view must reach the server.
      keepUnusedDataFor: 0,
    }),
  }),
})

export const { useVerifyByDocumentQuery, useVerifyByTokenQuery } = verificationApi

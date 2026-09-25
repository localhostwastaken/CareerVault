import { APISlice } from '@/apis/APISlice'
import type { AnchorBatch, AnchorRunResult } from './types'

// ORG_ADMIN ops surface for the anchoring engine (server merkle.controller.ts). The
// organization is derived server-side from the caller's membership, so neither call
// takes a param — mirrors the org-scoping-at-the-service-layer rule from the server.
export const anchoringApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listAnchorBatches: builder.query<AnchorBatch[], void>({
      query: () => ({ url: '/merkle/batches' }),
      providesTags: ['AnchorBatch'],
    }),
    runAnchorBatch: builder.mutation<AnchorRunResult, void>({
      query: () => ({ url: '/merkle/run', method: 'POST' }),
      // A fresh anchor changes both the batch list and the "Anchored on-chain" stat.
      invalidatesTags: ['AnchorBatch', 'Analytics'],
    }),
  }),
})

export const { useListAnchorBatchesQuery, useRunAnchorBatchMutation } = anchoringApi

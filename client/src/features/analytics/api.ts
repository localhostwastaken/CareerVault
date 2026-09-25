import { APISlice } from '@/apis/APISlice'
import type { AnalyticsOverview } from './types'

export const analyticsApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<AnalyticsOverview, void>({
      query: () => ({ url: '/analytics/overview' }),
      // Anchoring a batch invalidates this tag so "Anchored on-chain" refreshes without
      // a manual reload (see features/anchoring/api.ts).
      providesTags: ['Analytics'],
    }),
  }),
})

export const { useGetAnalyticsOverviewQuery } = analyticsApi

import { APISlice } from '@/apis/APISlice'
import type { AnalyticsOverview } from './types'

export const analyticsApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsOverview: builder.query<AnalyticsOverview, void>({
      query: () => ({ url: '/analytics/overview' }),
    }),
  }),
})

export const { useGetAnalyticsOverviewQuery } = analyticsApi

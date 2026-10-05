import { APISlice } from '@/apis/APISlice'
import type { SystemStatus } from './types'

// Public: the demo guide, the verify page and the admin anchoring card all read it, and it
// only changes on a redeploy, so one fetch per session is plenty.
export const systemStatusApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    getSystemStatus: builder.query<SystemStatus, void>({
      query: () => ({ url: '/health/status' }),
      keepUnusedDataFor: 3600,
    }),
  }),
})

export const { useGetSystemStatusQuery } = systemStatusApi

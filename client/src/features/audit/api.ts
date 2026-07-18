import { APISlice } from '@/apis/APISlice'
import type { AuditLogQuery, AuditLogResponse } from './types'

export const auditApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listAuditLogs: builder.query<AuditLogResponse, AuditLogQuery>({
      query: (params) => ({ url: '/audit/logs', params }),
      providesTags: ['Audit'],
    }),
  }),
})

export const { useListAuditLogsQuery } = auditApi

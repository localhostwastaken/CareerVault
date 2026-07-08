import { APISlice } from '@/apis/APISlice'
import type { BulkBatch } from './types'

export const bulkIssuanceApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listBulkBatches: builder.query<BulkBatch[], { organizationId: string }>({
      query: (params) => ({ url: '/bulk-issuance', params }),
      providesTags: ['BulkBatch'],
    }),
    uploadBulkIssuance: builder.mutation<
      BulkBatch,
      { organizationId: string; documentType: string; file: File }
    >({
      query: ({ organizationId, documentType, file }) => {
        const body = new FormData()
        body.append('organizationId', organizationId)
        body.append('documentType', documentType)
        body.append('file', file)
        return { url: '/bulk-issuance', method: 'POST', body }
      },
      invalidatesTags: ['BulkBatch', 'Document'],
    }),
  }),
})

export const { useListBulkBatchesQuery, useUploadBulkIssuanceMutation } = bulkIssuanceApi

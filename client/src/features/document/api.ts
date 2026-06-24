import { APISlice } from '@/apis/APISlice'
import type {
  ApproveRequest,
  DocumentDetail,
  RejectRequest,
  RequestDocumentRequest,
  RevokeRequest,
  SignDocumentRequest,
} from './types'

export const documentApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listDocuments: builder.query<DocumentDetail[], { status?: string; type?: string; role?: string } | void>({
      query: (params) => ({ url: '/documents', params: params ?? undefined }),
      providesTags: ['Document'],
    }),
    getDocument: builder.query<DocumentDetail, string>({
      query: (id) => ({ url: `/documents/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Document', id }],
    }),
    requestDocument: builder.mutation<DocumentDetail, RequestDocumentRequest>({
      query: (body) => ({ url: '/documents/request', method: 'POST', body }),
      invalidatesTags: ['Document'],
    }),
    signDocument: builder.mutation<DocumentDetail, { id: string } & SignDocumentRequest>({
      query: ({ id, ...body }) => ({ url: `/documents/${id}/sign`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Document', id }, 'Document'],
    }),
    approveDocument: builder.mutation<DocumentDetail, { id: string } & ApproveRequest>({
      query: ({ id, ...body }) => ({ url: `/documents/${id}/approve`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Document', id }, 'Document'],
    }),
    rejectDocument: builder.mutation<DocumentDetail, { id: string } & RejectRequest>({
      query: ({ id, ...body }) => ({ url: `/documents/${id}/reject`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Document', id }, 'Document'],
    }),
    revokeDocument: builder.mutation<DocumentDetail, { id: string } & RevokeRequest>({
      query: ({ id, ...body }) => ({ url: `/documents/${id}/revoke`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Document', id }, 'Document'],
    }),
    deleteDocument: builder.mutation<{ deleted: boolean }, string>({
      query: (id) => ({ url: `/documents/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Document', id }, 'Document'],
    }),
    returnDocument: builder.mutation<DocumentDetail, { id: string; reason: string }>({
      query: ({ id, ...body }) => ({ url: `/documents/${id}/return`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Document', id }, 'Document'],
    }),
    resubmitDocument: builder.mutation<DocumentDetail, { id: string; type?: string; managerUserId?: string; notes?: string }>({
      query: ({ id, ...body }) => ({ url: `/documents/${id}/resubmit`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Document', id }, 'Document'],
    }),
  }),
})

export const {
  useListDocumentsQuery,
  useGetDocumentQuery,
  useRequestDocumentMutation,
  useSignDocumentMutation,
  useApproveDocumentMutation,
  useRejectDocumentMutation,
  useRevokeDocumentMutation,
  useDeleteDocumentMutation,
  useReturnDocumentMutation,
  useResubmitDocumentMutation,
} = documentApi

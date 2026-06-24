import { APISlice } from '@/apis/APISlice'
import type { CreateShareLinkRequest, CreateShareLinkResponse, ShareLink } from './types'

export const shareLinkApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listShareLinks: builder.query<ShareLink[], void>({
      query: () => ({ url: '/share-links' }),
      providesTags: ['ShareLink'],
    }),
    createShareLink: builder.mutation<CreateShareLinkResponse, CreateShareLinkRequest>({
      query: (body) => ({ url: '/share-links', method: 'POST', body }),
      invalidatesTags: ['ShareLink'],
    }),
    deactivateShareLink: builder.mutation<{ id: string; isActive: boolean }, string>({
      query: (id) => ({ url: `/share-links/${id}`, method: 'DELETE' }),
      invalidatesTags: ['ShareLink'],
    }),
  }),
})

export const {
  useListShareLinksQuery,
  useCreateShareLinkMutation,
  useDeactivateShareLinkMutation,
} = shareLinkApi

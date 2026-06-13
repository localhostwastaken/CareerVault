import { APISlice } from '@/apis/APISlice'
import type { CreateOrgRequest, CreateOrgResponse, Organization, UpdateOrgRequest } from './types'

export const organizationApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    createOrganization: builder.mutation<CreateOrgResponse, CreateOrgRequest>({
      query: (body) => ({ url: '/orgs', method: 'POST', body }),
      invalidatesTags: ['Org', 'Auth'],
    }),
    listVerifiedOrgs: builder.query<Array<{ id: string; name: string; domain: string }>, void>({
      query: () => ({ url: '/orgs' }),
      providesTags: ['Org'],
    }),
    getOrganization: builder.query<Organization, string>({
      query: (id) => ({ url: `/orgs/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Org', id }],
    }),
    verifyDomain: builder.mutation<Organization, string>({
      query: (id) => ({ url: `/orgs/${id}/verify-domain`, method: 'POST' }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Org', id }],
    }),
    updateOrganization: builder.mutation<Organization, { id: string } & UpdateOrgRequest>({
      query: ({ id, ...body }) => ({ url: `/orgs/${id}`, method: 'PUT', body }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Org', id }],
    }),
  }),
})

export const {
  useCreateOrganizationMutation,
  useListVerifiedOrgsQuery,
  useGetOrganizationQuery,
  useVerifyDomainMutation,
  useUpdateOrganizationMutation,
} = organizationApi

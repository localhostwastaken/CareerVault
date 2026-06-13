import { APISlice } from '@/apis/APISlice'
import type { AddMemberRequest, Member } from './types'

export const memberApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listMembers: builder.query<Member[], string>({
      query: (orgId) => ({ url: `/orgs/${orgId}/members` }),
      providesTags: (_result, _error, orgId) => [{ type: 'Member', id: orgId }],
    }),
    addMember: builder.mutation<Member, { orgId: string } & AddMemberRequest>({
      query: ({ orgId, ...body }) => ({ url: `/orgs/${orgId}/members`, method: 'POST', body }),
      invalidatesTags: (_result, _error, { orgId }) => [{ type: 'Member', id: orgId }],
    }),
    removeMember: builder.mutation<{ id: string; isActive: boolean }, { orgId: string; memberId: string }>({
      query: ({ orgId, memberId }) => ({ url: `/orgs/${orgId}/members/${memberId}`, method: 'DELETE' }),
      invalidatesTags: (_result, _error, { orgId }) => [{ type: 'Member', id: orgId }],
    }),
  }),
})

export const { useListMembersQuery, useAddMemberMutation, useRemoveMemberMutation } = memberApi

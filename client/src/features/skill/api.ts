import { APISlice } from '@/apis/APISlice'
import type { MySkills } from './types'

export const skillApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    getMySkills: builder.query<MySkills, void>({
      query: () => ({ url: '/skills/me' }),
      providesTags: ['Skill'],
    }),
    setDiscoverability: builder.mutation<{ isDiscoverable: boolean }, boolean>({
      query: (enabled) => ({ url: '/skills/discoverability', method: 'PUT', body: { enabled } }),
      invalidatesTags: ['Skill'],
    }),
  }),
})

export const { useGetMySkillsQuery, useSetDiscoverabilityMutation } = skillApi

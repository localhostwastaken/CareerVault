import { APISlice } from '@/apis/APISlice'
import type {
  CreateJobOpeningRequest,
  JobOpening,
  SearchResult,
  StoredMatch,
} from './types'

export const recruiterApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listJobOpenings: builder.query<JobOpening[], void>({
      query: () => ({ url: '/recruiter/job-openings' }),
      providesTags: ['JobOpening'],
    }),
    createJobOpening: builder.mutation<JobOpening, CreateJobOpeningRequest>({
      query: (body) => ({ url: '/recruiter/job-openings', method: 'POST', body }),
      invalidatesTags: ['JobOpening'],
    }),
    closeJobOpening: builder.mutation<{ id: string; closed: boolean }, string>({
      query: (id) => ({ url: `/recruiter/job-openings/${id}/close`, method: 'POST' }),
      invalidatesTags: ['JobOpening'],
    }),
    searchTalent: builder.mutation<SearchResult, string>({
      query: (id) => ({ url: `/recruiter/job-openings/${id}/search`, method: 'POST' }),
      // Match list refreshes; JobOpening too so the per-opening matchCount badge updates.
      invalidatesTags: ['Match', 'JobOpening'],
    }),
    getMatches: builder.query<StoredMatch[], string>({
      query: (id) => ({ url: `/recruiter/job-openings/${id}/matches` }),
      providesTags: ['Match'],
    }),
  }),
})

export const {
  useListJobOpeningsQuery,
  useCreateJobOpeningMutation,
  useCloseJobOpeningMutation,
  useSearchTalentMutation,
  useGetMatchesQuery,
} = recruiterApi

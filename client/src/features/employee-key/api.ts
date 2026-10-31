import { APISlice } from '@/apis/APISlice'
import type { EmployeeKeyStatus, EnrollRequest, SecurityQuestion } from './types'

export const employeeKeyApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    getMyEmployeeKeys: builder.query<EmployeeKeyStatus[], void>({
      query: () => ({ url: '/employee-keys/me' }),
      providesTags: ['EmployeeKey'],
    }),
    getSecurityQuestions: builder.query<SecurityQuestion[], void>({
      query: () => ({ url: '/employee-keys/questions' }),
    }),
    enrollEmployeeKey: builder.mutation<EmployeeKeyStatus, EnrollRequest>({
      query: (body) => ({ url: '/employee-keys/enroll', method: 'POST', body }),
      invalidatesTags: ['EmployeeKey'],
    }),
  }),
})

export const { useGetMyEmployeeKeysQuery, useGetSecurityQuestionsQuery, useEnrollEmployeeKeyMutation } = employeeKeyApi

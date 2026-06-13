import { APISlice } from '@/apis/APISlice'
import type { AuthResponse, AuthUser } from './types'

interface LoginRequest {
  email: string
  password: string
}

interface RegisterRequest {
  email: string
  password: string
  fullName: string
  accountType: 'HOLDER' | 'ORG_ADMIN'
}

export const authApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({ url: '/auth/login', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    register: builder.mutation<AuthResponse, RegisterRequest>({
      query: (body) => ({ url: '/auth/register', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    me: builder.query<AuthUser, void>({
      query: () => ({ url: '/auth/me' }),
      providesTags: ['Auth'],
    }),
    logout: builder.mutation<void, void>({
      query: () => ({ url: '/auth/logout', method: 'POST' }),
      invalidatesTags: ['Auth'],
    }),
    // GDPR erasure of the signed-in account.
    deleteAccount: builder.mutation<{ deleted: boolean }, void>({
      query: () => ({ url: '/users/me', method: 'DELETE' }),
      invalidatesTags: ['Auth'],
    }),
  }),
})

export const {
  useLoginMutation,
  useRegisterMutation,
  useMeQuery,
  useLogoutMutation,
  useDeleteAccountMutation,
} = authApi

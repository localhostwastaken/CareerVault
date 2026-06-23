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
    // Request a magic link for passwordless sign-in. The server always returns
    // 200 with an opaque message to avoid email enumeration.
    requestMagicLink: builder.mutation<{ message: string }, { email: string }>({
      query: (body) => ({ url: '/auth/magic-link', method: 'POST', body }),
    }),
    // Verify a magic link token and receive auth credentials.
    verifyMagicLink: builder.mutation<AuthResponse, { token: string }>({
      query: (body) => ({ url: '/auth/verify-magic-link', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    // Set an initial password for passwordless users (R9: created via member-add).
    setPassword: builder.mutation<AuthUser, { password: string }>({
      query: (body) => ({ url: '/auth/set-password', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    // Change an existing password. Requires the current password.
    changePassword: builder.mutation<AuthUser, { oldPassword: string; newPassword: string }>({
      query: (body) => ({ url: '/auth/change-password', method: 'POST', body }),
      invalidatesTags: ['Auth'],
    }),
    // Restore a session from the httpOnly refresh cookie. Called on app startup
    // so page reloads don't log the user out. Returns new tokens + user.
    refresh: builder.mutation<AuthResponse, void>({
      query: () => ({ url: '/auth/refresh', method: 'POST' }),
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
  useRequestMagicLinkMutation,
  useVerifyMagicLinkMutation,
  useSetPasswordMutation,
  useChangePasswordMutation,
  useRefreshMutation,
} = authApi

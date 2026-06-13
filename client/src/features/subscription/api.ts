import { APISlice } from '@/apis/APISlice'
import type { Plan, Subscription, SubscribeResponse, SubscriptionTier } from './types'

export const subscriptionApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    getMySubscription: builder.query<Subscription | null, void>({
      query: () => ({ url: '/subscriptions/me' }),
      providesTags: ['Subscription'],
    }),
    getPlans: builder.query<Plan[], void>({
      query: () => ({ url: '/subscriptions/plans' }),
      providesTags: ['Subscription'],
    }),
    subscribe: builder.mutation<SubscribeResponse, SubscriptionTier>({
      query: (tier) => ({ url: '/subscriptions', method: 'POST', body: { tier } }),
      invalidatesTags: ['Subscription'],
    }),
    cancelSubscription: builder.mutation<{ cancelled: number }, void>({
      query: () => ({ url: '/subscriptions/cancel', method: 'POST' }),
      invalidatesTags: ['Subscription'],
    }),
  }),
})

export const {
  useGetMySubscriptionQuery,
  useGetPlansQuery,
  useSubscribeMutation,
  useCancelSubscriptionMutation,
} = subscriptionApi

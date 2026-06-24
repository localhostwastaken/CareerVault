import { APISlice } from '@/apis/APISlice'

export const paymentApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    // Mock-only: simulates the provider checkout completing. Invalidates the surfaces
    // that a successful payment changes.
    mockCompletePayment: builder.mutation<{ ok: boolean }, string>({
      query: (sessionId) => ({ url: '/payments/mock/complete', method: 'POST', body: { sessionId } }),
      invalidatesTags: ['ShareLink', 'Subscription'],
    }),
  }),
})

export const { useMockCompletePaymentMutation } = paymentApi

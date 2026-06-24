import { APISlice } from '@/apis/APISlice'
import type { MessageResponse, ReceivedMessage, SendMessageRequest, SentMessage } from './types'

export const messageApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    sendMessage: builder.mutation<{ id: string; sentAt: string }, SendMessageRequest>({
      query: (body) => ({ url: '/messages', method: 'POST', body }),
      invalidatesTags: ['Message'],
    }),
    listSentMessages: builder.query<SentMessage[], void>({
      query: () => ({ url: '/messages/sent' }),
      providesTags: ['Message'],
    }),
    listReceivedMessages: builder.query<ReceivedMessage[], void>({
      query: () => ({ url: '/messages/received' }),
      providesTags: ['Message'],
    }),
    respondMessage: builder.mutation<
      { id: string; responseType: MessageResponse },
      { id: string; responseType: Exclude<MessageResponse, 'PENDING'> }
    >({
      query: ({ id, responseType }) => ({
        url: `/messages/${id}/respond`,
        method: 'POST',
        body: { responseType },
      }),
      invalidatesTags: ['Message'],
    }),
  }),
})

export const {
  useSendMessageMutation,
  useListSentMessagesQuery,
  useListReceivedMessagesQuery,
  useRespondMessageMutation,
} = messageApi

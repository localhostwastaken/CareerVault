import { APISlice } from '@/apis/APISlice'
import type { NotificationItem } from './types'

export const notificationApi = APISlice.injectEndpoints({
  endpoints: (builder) => ({
    listNotifications: builder.query<NotificationItem[], void>({
      query: () => ({ url: '/notifications' }),
      providesTags: ['Notification'],
    }),
    unreadCount: builder.query<{ count: number }, void>({
      query: () => ({ url: '/notifications/unread-count' }),
      providesTags: ['Notification'],
    }),
    markNotificationRead: builder.mutation<{ id: string; isRead: boolean }, string>({
      query: (id) => ({ url: `/notifications/${id}/read`, method: 'PUT' }),
      invalidatesTags: ['Notification'],
    }),
    markAllNotificationsRead: builder.mutation<{ success: boolean }, void>({
      query: () => ({ url: '/notifications/read-all', method: 'PUT' }),
      invalidatesTags: ['Notification'],
    }),
  }),
})

export const {
  useListNotificationsQuery,
  useUnreadCountQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
} = notificationApi

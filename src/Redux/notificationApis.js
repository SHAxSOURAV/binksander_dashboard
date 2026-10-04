import { baseApis } from "./main/baseApis";

export const notificationApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query({
      query: ({ page = 1, limit = 20, unreadOnly = false } = {}) =>
        `/notifications?page=${page}&limit=${limit}&unread_only=${unreadOnly}`,
      providesTags: ["Notifications"],
    }),
    markNotificationAsRead: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "POST",
      }),
      invalidatesTags: ["Notifications"],
    }),
    markAllNotificationsAsRead: builder.mutation({
      query: () => ({
        url: "/notifications/read-all",
        method: "POST",
      }),
      invalidatesTags: ["Notifications"],
    }),
    deleteNotification: builder.mutation({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),
    clearAllNotifications: builder.mutation({
      query: () => ({
        url: "/notifications/clear-all",
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useDeleteNotificationMutation,
  useClearAllNotificationsMutation,
} = notificationApis;

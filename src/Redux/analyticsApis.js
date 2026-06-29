import { baseApis } from "./main/baseApis";

const analyticsApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // GET /analytics/dashboard?range=this_month|30d|90d|all
    getDashboard: builder.query({
      query: (range = "30d") => `/analytics/dashboard?range=${range}`,
      providesTags: ["Analytics"],
    }),

    // GET /analytics/orders?page=&limit=
    getBolOrders: builder.query({
      query: ({ page = 1, limit = 50 } = {}) =>
        `/analytics/orders?page=${page}&limit=${limit}`,
      providesTags: ["Analytics"],
    }),

    // POST /analytics/sync-now → kicks off a background Bol order sync
    syncNow: builder.mutation({
      query: () => ({ url: "/analytics/sync-now", method: "POST" }),
      invalidatesTags: ["Analytics"],
    }),

    // POST /bol/orders/{order_id}/ship
    shipBolOrder: builder.mutation({
      query: ({ orderId, data }) => ({
        url: `/bol/orders/${orderId}/ship`,
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Analytics"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetDashboardQuery,
  useGetBolOrdersQuery,
  useSyncNowMutation,
  useShipBolOrderMutation,
} = analyticsApis;

export default analyticsApis;

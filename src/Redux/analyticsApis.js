import { baseApis } from "./main/baseApis";

const analyticsApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // GET /analytics/dashboard?range=7d|14d|30d|90d|365d
    getDashboard: builder.query({
      query: (range = "30d") => `/analytics/dashboard?range=${range}`,
      providesTags: ["Analytics"],
    }),

    // GET /analytics/kpis?range=7d|14d|30d|90d|365d
    getKpis: builder.query({
      query: (range = "30d") => `/analytics/kpis?range=${range}`,
      providesTags: ["Analytics"],
    }),

    // GET /analytics/performance
    getPerformance: builder.query({
      query: () => `/analytics/performance`,
      providesTags: ["Analytics"],
    }),

    // GET /analytics/sales-analysis?range=&category=
    getSalesAnalysis: builder.query({
      query: ({ range = "30d", category = "" } = {}) => {
        let url = `/analytics/sales-analysis?range=${range}`;
        if (category) url += `&category=${encodeURIComponent(category)}`;
        return url;
      },
      providesTags: ["Analytics"],
    }),

    // GET /analytics/product-lookup?q= → unified view of one EAN/ASIN across
    // catalog, needs-review, live Bol offer and orders.
    getProductLookup: builder.query({
      query: (q) => `/analytics/product-lookup?q=${encodeURIComponent(q)}`,
      providesTags: ["Analytics"],
    }),

    // GET /analytics/orders?page=&limit=
    getBolOrders: builder.query({
      query: ({ page = 1, limit = 50 } = {}) =>
        `/analytics/orders?page=${page}&limit=${limit}`,
      providesTags: ["Analytics"],
      keepUnusedDataFor: 300, // 5 minutes cache
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
  useGetKpisQuery,
  useGetPerformanceQuery,
  useGetSalesAnalysisQuery,
  useLazyGetProductLookupQuery,
  useGetBolOrdersQuery,
  useSyncNowMutation,
  useShipBolOrderMutation,
} = analyticsApis;

export default analyticsApis;

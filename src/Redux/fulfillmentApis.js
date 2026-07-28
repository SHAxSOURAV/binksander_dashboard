import { baseApis } from "./main/baseApis";

const fulfillmentApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // GET /fulfillment/orders?status=&page=&limit=
    getFulfillmentOrders: builder.query({
      query: ({ page = 1, limit = 50, status, accountId } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status) params.set("status", status);
        const headers = {};
        if (accountId) headers["x-bol-account-id"] = accountId;
        return {
          url: `/fulfillment/orders?${params.toString()}`,
          headers,
        };
      },
      providesTags: ["Fulfillment"],
    }),

    // GET /fulfillment/orders/{id}
    getFulfillmentOrder: builder.query({
      query: (id) => `/fulfillment/orders/${id}`,
      providesTags: ["Fulfillment"],
    }),

    // POST /fulfillment/orders/{id}/approve  → worker places the real Amazon order
    approveFulfillment: builder.mutation({
      query: (id) => ({ url: `/fulfillment/orders/${id}/approve`, method: "POST" }),
      invalidatesTags: ["Fulfillment"],
    }),

    // POST /fulfillment/orders/{id}/reject
    rejectFulfillment: builder.mutation({
      query: (id) => ({ url: `/fulfillment/orders/${id}/reject`, method: "POST" }),
      invalidatesTags: ["Fulfillment"],
    }),

    // POST /fulfillment/orders/{id}/retry
    retryFulfillment: builder.mutation({
      query: (id) => ({ url: `/fulfillment/orders/${id}/retry`, method: "POST" }),
      invalidatesTags: ["Fulfillment"],
    }),

    // POST /fulfillment/orders/{id}/complete
    completeFulfillmentOrder: builder.mutation({
      query: (id) => ({ url: `/fulfillment/orders/${id}/complete`, method: "POST" }),
      invalidatesTags: ["Fulfillment"],
    }),

    // POST /fulfillment/sync  → backfill open Bol orders now
    syncFulfillment: builder.mutation({
      query: () => ({ url: "/fulfillment/sync", method: "POST" }),
      invalidatesTags: ["Fulfillment"],
    }),

    // POST /fulfillment/subscriptions/register
    registerBolWebhook: builder.mutation({
      query: () => ({
        url: "/fulfillment/subscriptions/register",
        method: "POST",
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetFulfillmentOrdersQuery,
  useGetFulfillmentOrderQuery,
  useApproveFulfillmentMutation,
  useRejectFulfillmentMutation,
  useRetryFulfillmentMutation,
  useCompleteFulfillmentOrderMutation,
  useSyncFulfillmentMutation,
  useRegisterBolWebhookMutation,
} = fulfillmentApis;

export default fulfillmentApis;

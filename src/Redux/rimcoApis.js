import { baseApis } from "./main/baseApis";

export const rimcoApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // GET /users/rimco-credentials -> List connected Rimco accounts
    getRimcoCredentials: builder.query({
      query: () => "/users/rimco-credentials",
      providesTags: ["RimcoCredentials"],
    }),

    // POST /users/rimco-credentials -> Save or update Rimco account
    saveRimcoCredentials: builder.mutation({
      query: (data) => ({
        url: "/users/rimco-credentials",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["RimcoCredentials", "Fulfillment", "Products"],
    }),

    // DELETE /users/rimco-credentials/{accountId} -> Delete account
    deleteRimcoCredentials: builder.mutation({
      query: (accountId) => ({
        url: `/users/rimco-credentials/${accountId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["RimcoCredentials", "Fulfillment", "Products"],
    }),

    // POST /users/rimco-credentials/verify -> Test connection with token
    verifyRimcoCredentials: builder.mutation({
      query: (data) => ({
        url: "/users/rimco-credentials/verify",
        method: "POST",
        body: data,
      }),
    }),

    // GET /rimco/orders -> Fetch live Rimco orders
    getLiveRimcoOrders: builder.query({
      query: ({ page = 1, limit = 50, status, search, accountId } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status && status !== "all" && status !== "undefined" && status !== "null") {
          params.set("status", status);
        }
        if (search) params.set("search", search);
        if (accountId) params.set("account_id", accountId);
        return `/rimco/orders?${params.toString()}`;
      },
      providesTags: ["Fulfillment"],
    }),

    // GET /rimco/shipments -> Fetch live Rimco shipments
    getLiveRimcoShipments: builder.query({
      query: ({ page = 1, limit = 50, search, accountId } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set("search", search);
        if (accountId) params.set("account_id", accountId);
        return `/rimco/shipments?${params.toString()}`;
      },
      providesTags: ["Fulfillment"],
    }),

    // GET /rimco/products -> Fetch live Rimco products catalog
    getLiveRimcoProducts: builder.query({
      query: ({ page = 1, limit = 50, search, accountId } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set("search", search);
        if (accountId) params.set("account_id", accountId);
        return `/rimco/products?${params.toString()}`;
      },
      providesTags: ["Products"],
    }),

    // GET /rimco/tickets -> Fetch warehouse support tickets
    getLiveRimcoTickets: builder.query({
      query: ({ page = 1, limit = 50, search, accountId } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set("search", search);
        if (accountId) params.set("account_id", accountId);
        return `/rimco/tickets?${params.toString()}`;
      },
      providesTags: ["Fulfillment"],
    }),

    // Order actions
    snoozeRimcoOrder: builder.mutation({
      query: ({ orderId, accountId, snooze_until, snooze_reason }) => ({
        url: `/rimco/orders/${orderId}/snooze${accountId ? `?account_id=${accountId}` : ""}`,
        method: "PUT",
        body: { snooze_until, snooze_reason },
      }),
      invalidatesTags: ["Fulfillment"],
    }),

    unsnoozeRimcoOrder: builder.mutation({
      query: ({ orderId, accountId }) => ({
        url: `/rimco/orders/${orderId}/snooze${accountId ? `?account_id=${accountId}` : ""}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Fulfillment"],
    }),

    completeRimcoOrder: builder.mutation({
      query: ({ orderId, accountId }) => ({
        url: `/rimco/orders/${orderId}/complete${accountId ? `?account_id=${accountId}` : ""}`,
        method: "PUT",
      }),
      invalidatesTags: ["Fulfillment"],
    }),

    cancelRimcoOrder: builder.mutation({
      query: ({ orderId, accountId }) => ({
        url: `/rimco/orders/${orderId}${accountId ? `?account_id=${accountId}` : ""}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Fulfillment"],
    }),

    // POST /rimco/purchase-orders -> Create Inbound Purchase Order to Rimco
    createPurchaseOrder: builder.mutation({
      query: (data) => ({
        url: "/rimco/purchase-orders",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Fulfillment", "Products"],
    }),

    // GET /rimco/purchase-orders -> List Rimco Purchase Orders
    getPurchaseOrders: builder.query({
      query: ({ limit = 50 } = {}) => `/rimco/purchase-orders?limit=${limit}`,
      providesTags: ["Fulfillment"],
    }),

    // POST /rimco/orders -> Create manual Rimco order
    createRimcoOrder: builder.mutation({
      query: (data) => ({
        url: "/rimco/orders",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Fulfillment"],
    }),
  }),
});

export const {
  useGetRimcoCredentialsQuery,
  useSaveRimcoCredentialsMutation,
  useDeleteRimcoCredentialsMutation,
  useVerifyRimcoCredentialsMutation,
  useGetLiveRimcoOrdersQuery,
  useGetLiveRimcoShipmentsQuery,
  useGetLiveRimcoProductsQuery,
  useGetLiveRimcoTicketsQuery,
  useSnoozeRimcoOrderMutation,
  useUnsnoozeRimcoOrderMutation,
  useCompleteRimcoOrderMutation,
  useCancelRimcoOrderMutation,
  useCreatePurchaseOrderMutation,
  useGetPurchaseOrdersQuery,
  useCreateRimcoOrderMutation,
} = rimcoApis;

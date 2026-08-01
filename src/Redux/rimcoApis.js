import { baseApis } from "./main/baseApis";

export const rimcoApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // GET /rimco/orders -> Fetch live Rimco orders
    getLiveRimcoOrders: builder.query({
      query: ({ page = 1, limit = 50, status, search } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status) params.set("status", status);
        if (search) params.set("search", search);
        return `/rimco/orders?${params.toString()}`;
      },
      providesTags: ["Fulfillment"],
    }),

    // GET /rimco/shipments -> Fetch live Rimco shipments (~2160+ shipments with tracking links)
    getLiveRimcoShipments: builder.query({
      query: ({ page = 1, limit = 50, search } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set("search", search);
        return `/rimco/shipments?${params.toString()}`;
      },
      providesTags: ["Fulfillment"],
    }),

    // GET /rimco/products -> Fetch live Rimco products catalog
    getLiveRimcoProducts: builder.query({
      query: ({ page = 1, limit = 50, search } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (search) params.set("search", search);
        return `/rimco/products?${params.toString()}`;
      },
      providesTags: ["Products"],
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
  useGetLiveRimcoOrdersQuery,
  useGetLiveRimcoShipmentsQuery,
  useGetLiveRimcoProductsQuery,
  useCreatePurchaseOrderMutation,
  useGetPurchaseOrdersQuery,
  useCreateRimcoOrderMutation,
} = rimcoApis;

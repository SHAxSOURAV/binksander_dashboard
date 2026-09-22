import { baseApis } from "./main/baseApis";

const apiUsageApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    getApiUsageSummary: builder.query({
      query: () => "/api-usage/summary",
      providesTags: ["ApiUsage"],
    }),

    refreshApiUsage: builder.mutation({
      query: () => ({
        url: "/api-usage/refresh",
        method: "POST",
      }),
      invalidatesTags: ["ApiUsage"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetApiUsageSummaryQuery,
  useRefreshApiUsageMutation,
} = apiUsageApis;

export default apiUsageApis;

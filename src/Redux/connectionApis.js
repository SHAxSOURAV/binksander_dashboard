import { baseApis } from "./main/baseApis";

const connectionApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // GET /spreadsheet/connected → { connected_sheets: [{ spreadsheet_url, item_count, ... }] }
    getConnectedSheets: builder.query({
      query: () => "/spreadsheet/connected",
      providesTags: ["Connection"],
    }),

    // DELETE /spreadsheet/unlink  { spreadsheet_url, delete_data }
    unlinkSheet: builder.mutation({
      query: (data) => ({
        url: "/spreadsheet/unlink",
        method: "DELETE",
        body: data,
      }),
      invalidatesTags: ["Connection", "Products"],
    }),

    // GET /users/bol-credentials → { client_id, is_secret_set, updated_at }  (404 if none)
    getBolCredentials: builder.query({
      query: () => "/users/bol-credentials",
      providesTags: ["Connection"],
    }),

    // POST /users/bol-credentials  { client_id, client_secret }
    saveBolCredentials: builder.mutation({
      query: (data) => ({
        url: "/users/bol-credentials",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Connection"],
    }),

    // GET /users/amazon-credentials → { email, is_secret_set, has_totp } (404 if none)
    getAmazonCredentials: builder.query({
      query: () => "/users/amazon-credentials",
      providesTags: ["Connection"],
    }),

    // POST /users/amazon-credentials  { email, password, totp_secret? }
    saveAmazonCredentials: builder.mutation({
      query: (data) => ({
        url: "/users/amazon-credentials",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Connection"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetConnectedSheetsQuery,
  useUnlinkSheetMutation,
  useGetBolCredentialsQuery,
  useSaveBolCredentialsMutation,
  useGetAmazonCredentialsQuery,
  useSaveAmazonCredentialsMutation,
} = connectionApis;

export default connectionApis;

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

    // DELETE /users/bol-credentials
    deleteBolCredentials: builder.mutation({
      query: () => ({
        url: "/users/bol-credentials",
        method: "DELETE",
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
    // POST /spreadsheet/import-public  { spreadsheet_url, sheet_id? }
    importPublicSheet: builder.mutation({
      query: (data) => ({
        url: "/spreadsheet/import-public",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Connection", "Products"],
    }),

    // POST /spreadsheet/import-oauth  { spreadsheet_url, access_token, refresh_token, sheet_id? }
    importOAuthSheet: builder.mutation({
      query: (data) => ({
        url: "/spreadsheet/import-oauth",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Connection", "Products"],
    }),

    // GET /spreadsheet/list-user-sheets ? access_token=...
    getListUserSheets: builder.query({
      query: (access_token) => `/spreadsheet/list-user-sheets?access_token=${access_token}`,
    }),

    // GET /spreadsheet/tabs ? spreadsheet_url=... & access_token=...
    getSpreadsheetTabs: builder.query({
      query: ({ spreadsheet_url, access_token }) => {
        let url = `/spreadsheet/tabs?spreadsheet_url=${encodeURIComponent(spreadsheet_url)}`;
        if (access_token) url += `&access_token=${access_token}`;
        return url;
      },
    }),

    exchangeGoogleCode: builder.mutation({
      query: (data) => ({
        url: "/spreadsheet/exchange-code",
        method: "POST",
        body: data,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetConnectedSheetsQuery,
  useUnlinkSheetMutation,
  useGetBolCredentialsQuery,
  useSaveBolCredentialsMutation,
  useDeleteBolCredentialsMutation,
  useGetAmazonCredentialsQuery,
  useSaveAmazonCredentialsMutation,
  useImportPublicSheetMutation,
  useImportOAuthSheetMutation,
  useLazyGetListUserSheetsQuery,
  useLazyGetSpreadsheetTabsQuery,
  useExchangeGoogleCodeMutation,
} = connectionApis;

export default connectionApis;

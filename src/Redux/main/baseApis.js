import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { url } from "./server";
import { getToken, getRefreshToken, updateTokens, clearSession } from "../../utils/session";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: url,
  prepareHeaders: (headers) => {
    headers.set("ngrok-skip-browser-warning", "69420"); // Bypass ngrok warning
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

// On 401, try a refresh once using the stored refresh token; otherwise log out.
const baseQueryWithReauth = async (args, api, extraOptions) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result?.error?.status === 401) {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      const refresh = await rawBaseQuery(
        {
          url: "/auth/refresh",
          method: "POST",
          body: { refresh_token: refreshToken },
        },
        api,
        extraOptions,
      );
      if (refresh?.data?.access_token) {
        updateTokens(refresh.data.access_token, refresh.data.refresh_token);
        result = await rawBaseQuery(args, api, extraOptions);
        return result;
      }
    }
    // Refresh failed → clear session and bounce to login.
    if (!window.location.pathname.includes("/login")) {
      clearSession();
      window.location.href = "/login";
    }
  }
  return result;
};

export const baseApis = createApi({
  reducerPath: "adminApis",
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    "Profile",
    "Products",
    "Connection",
    "Drafts",
    "Fulfillment",
    "Analytics",
    "Support",
  ],
  endpoints: () => ({}),
});

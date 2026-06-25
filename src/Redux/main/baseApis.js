import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { url } from "./server";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: url,
  prepareHeaders: (headers) => {
    const token = localStorage.getItem("token");
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
    const refreshToken = localStorage.getItem("refreshToken");
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
        localStorage.setItem("token", refresh.data.access_token);
        localStorage.setItem("refreshToken", refresh.data.refresh_token);
        result = await rawBaseQuery(args, api, extraOptions);
        return result;
      }
    }
    // Refresh failed → clear session and bounce to login.
    if (!window.location.pathname.includes("/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
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

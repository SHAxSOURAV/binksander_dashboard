import { baseApis } from "./main/baseApis";
import { setUser } from "../utils/session";

const profileApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // GET /auth/me → { success, user: { id, email, full_name, profile_picture, role, ... } }
    getProfile: builder.query({
      query: () => "/auth/me",
      transformResponse: (res) => res?.user || res,
      providesTags: ["Profile"],
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) setUser(data);
        } catch {}
      },
    }),

    // PATCH /auth/me  { full_name?, profile_picture? } → updated user
    updateProfile: builder.mutation({
      query: (body) => ({ url: "/auth/me", method: "PATCH", body }),
      transformResponse: (res) => res?.user || res,
      invalidatesTags: ["Profile"],
      async onQueryStarted(arg, { queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          if (data) setUser(data);
        } catch {}
      },
    }),

    // DELETE /auth/me
    deleteAccount: builder.mutation({
      query: () => ({ url: "/auth/me", method: "DELETE" }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetProfileQuery,
  useUpdateProfileMutation,
  useDeleteAccountMutation,
} = profileApis;

export default profileApis;

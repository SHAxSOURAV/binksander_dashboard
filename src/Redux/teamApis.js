import { baseApis } from "./main/baseApis";

const teamApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    getTeamRoles: builder.query({
      query: () => "/team/roles",
    }),

    getTeamUsers: builder.query({
      query: () => "/team/users",
      providesTags: ["Team"],
    }),

    createTeamUser: builder.mutation({
      query: (body) => ({
        url: "/team/users",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Team"],
    }),

    updateTeamUser: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/team/users/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Team"],
    }),

    resetTeamUserPassword: builder.mutation({
      query: ({ id, ...body }) => ({
        url: `/team/users/${id}/reset-password`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Team"],
    }),

    deleteTeamUser: builder.mutation({
      query: (id) => ({
        url: `/team/users/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Team"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetTeamRolesQuery,
  useGetTeamUsersQuery,
  useCreateTeamUserMutation,
  useUpdateTeamUserMutation,
  useResetTeamUserPasswordMutation,
  useDeleteTeamUserMutation,
} = teamApis;

export default teamApis;

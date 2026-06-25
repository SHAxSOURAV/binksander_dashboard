import { baseApis } from "./main/baseApis";

const supportApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // POST /support/contact  { subject, message, email, full_name?, priority }
    // → { success, message }   (public — no auth required)
    submitSupportTicket: builder.mutation({
      query: (body) => ({ url: "/support/contact", method: "POST", body }),
      invalidatesTags: ["Support"],
    }),

    // GET /support/tickets?status=&page=&limit=  (admin only)
    // → { success, total, page, limit, tickets: [...] }
    getSupportTickets: builder.query({
      query: ({ page = 1, limit = 50, status } = {}) => {
        const params = new URLSearchParams({ page, limit });
        if (status) params.set("status", status);
        return `/support/tickets?${params.toString()}`;
      },
      providesTags: ["Support"],
    }),

    // PATCH /support/tickets/{id}  { status }  (admin only)
    updateSupportTicket: builder.mutation({
      query: ({ id, status }) => ({
        url: `/support/tickets/${id}`,
        method: "PATCH",
        body: { status },
      }),
      invalidatesTags: ["Support"],
    }),

    // DELETE /support/tickets/{id}  (admin only)
    deleteSupportTicket: builder.mutation({
      query: (id) => ({ url: `/support/tickets/${id}`, method: "DELETE" }),
      invalidatesTags: ["Support"],
    }),
  }),
  overrideExisting: false,
});

export const {
  useSubmitSupportTicketMutation,
  useGetSupportTicketsQuery,
  useUpdateSupportTicketMutation,
  useDeleteSupportTicketMutation,
} = supportApis;

export default supportApis;

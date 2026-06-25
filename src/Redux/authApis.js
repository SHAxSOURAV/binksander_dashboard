import { baseApis } from "./main/baseApis";

const authApis = baseApis.injectEndpoints({
  endpoints: (builder) => ({
    // POST /auth/signin  { email, password }
    // → { success, access_token, refresh_token, token_type, user }
    login: builder.mutation({
      query: (data) => ({
        url: "/auth/signin",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    // POST /auth/signup  { email, password, full_name }  → { success, message }
    // (email verification required afterwards via /auth/verify-email)
    signup: builder.mutation({
      query: (data) => ({
        url: "/auth/signup",
        method: "POST",
        body: data,
      }),
    }),

    // POST /auth/verify-email  { email, otp }  → tokens + user (auto sign-in)
    verifyEmail: builder.mutation({
      query: (data) => ({
        url: "/auth/verify-email",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    // POST /auth/resend-otp  { email, purpose: "verify_email" | "reset_password" }
    resendOtp: builder.mutation({
      query: (data) => ({
        url: "/auth/resend-otp",
        method: "POST",
        body: data,
      }),
    }),

    // POST /auth/forgot-password  { email }
    forgetPassword: builder.mutation({
      query: (data) => ({
        url: "/auth/forgot-password",
        method: "POST",
        body: data,
      }),
    }),

    // POST /auth/reset-password  { email, otp, new_password }  → tokens + user
    resetPassword: builder.mutation({
      query: (data) => ({
        url: "/auth/reset-password",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Profile"],
    }),

    // POST /auth/change-password  { current_password, new_password }  (auth required)
    changePassword: builder.mutation({
      query: (data) => ({
        url: "/auth/change-password",
        method: "POST",
        body: data,
      }),
    }),

    // POST /auth/signout  { refresh_token }
    logout: builder.mutation({
      query: (data) => ({
        url: "/auth/signout",
        method: "POST",
        body: data,
      }),
    }),
  }),
  overrideExisting: false,
});

export const {
  useLoginMutation,
  useSignupMutation,
  useVerifyEmailMutation,
  useResendOtpMutation,
  useForgetPasswordMutation,
  useResetPasswordMutation,
  useChangePasswordMutation,
  useLogoutMutation,
} = authApis;

export default authApis;

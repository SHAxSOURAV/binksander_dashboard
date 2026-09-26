import { useGetAuthConfigQuery } from "../Redux/authApis";

export const useSignupStatus = () => {
  const { data, isLoading } = useGetAuthConfigQuery();

  // Check frontend env variable fallback (VITE_SIGNUP_AVAILABLE)
  // By default false if missing or unset
  const envVal = import.meta.env.VITE_SIGNUP_AVAILABLE;
  const isEnvEnabled = envVal === "true" || envVal === true;

  // Backend response is the primary source of truth once loaded (defaults to False if missing).
  // If backend config is not loaded yet or offline, fallback to frontend env var.
  const isSignupAvailable =
    data?.signup_available !== undefined
      ? Boolean(data.signup_available)
      : isEnvEnabled;

  return {
    isSignupAvailable,
    isLoading,
  };
};

export default useSignupStatus;

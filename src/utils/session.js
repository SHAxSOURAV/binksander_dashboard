// Persists the auth session returned by the backend (signin / verify-email / reset-password).
export const saveSession = (res) => {
  if (res?.access_token) localStorage.setItem("token", res.access_token);
  if (res?.refresh_token) localStorage.setItem("refreshToken", res.refresh_token);
  if (res?.user) localStorage.setItem("user", JSON.stringify(res.user));
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

export const getUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user")) || null;
  } catch {
    return null;
  }
};

// Merge updated fields into the stored user (e.g. after a profile edit).
export const setUser = (user) => {
  if (!user) return;
  const merged = { ...(getUser() || {}), ...user };
  localStorage.setItem("user", JSON.stringify(merged));
};

// Persists the auth session returned by the backend (signin / verify-email / reset-password).
export const saveSession = (res, remember = true) => {
  const storage = remember ? localStorage : sessionStorage;
  if (res?.access_token) storage.setItem("token", res.access_token);
  if (res?.refresh_token) storage.setItem("refreshToken", res.refresh_token);
  if (res?.user) storage.setItem("user", JSON.stringify(res.user));
};

export const clearSession = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
  sessionStorage.removeItem("token");
  sessionStorage.removeItem("refreshToken");
  sessionStorage.removeItem("user");
};

export const getToken = () => {
  return localStorage.getItem("token") || sessionStorage.getItem("token");
};

export const getRefreshToken = () => {
  return localStorage.getItem("refreshToken") || sessionStorage.getItem("refreshToken");
};

export const updateTokens = (accessToken, refreshToken) => {
  if (sessionStorage.getItem("token") || sessionStorage.getItem("refreshToken")) {
    if (accessToken) sessionStorage.setItem("token", accessToken);
    if (refreshToken) sessionStorage.setItem("refreshToken", refreshToken);
  } else {
    if (accessToken) localStorage.setItem("token", accessToken);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
  }
};

export const getUser = () => {
  try {
    const userStr = localStorage.getItem("user") || sessionStorage.getItem("user");
    return JSON.parse(userStr) || null;
  } catch {
    return null;
  }
};

// Merge updated fields into the stored user (e.g. after a profile edit).
export const setUser = (user) => {
  if (!user) return;
  const merged = { ...(getUser() || {}), ...user };
  if (sessionStorage.getItem("user")) {
    sessionStorage.setItem("user", JSON.stringify(merged));
  } else {
    localStorage.setItem("user", JSON.stringify(merged));
  }
};

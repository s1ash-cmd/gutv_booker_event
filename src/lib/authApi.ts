import { ApiError, apiRequest } from "./api";

type AuthTokens = { accessToken: string; refreshToken: string };
let refreshPromise: Promise<string> | null = null;
function persistTokens(tokens: AuthTokens) {
  localStorage.setItem("access_token", tokens.accessToken);
  localStorage.setItem("refresh_token", tokens.refreshToken);
}
function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}
async function performRefresh(): Promise<string> {
  const run = async () => {
    const refreshToken = localStorage.getItem("refresh_token");
    if (!refreshToken) throw new Error("Войдите в аккаунт");
    try {
      const data = await apiRequest<AuthTokens>("/api/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refreshToken }),
      });
      // A logout or another login must not be overwritten by an older response.
      if (localStorage.getItem("refresh_token") !== refreshToken)
        throw new Error("Сессия изменилась");
      persistTokens(data);
      return data.accessToken;
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        localStorage.getItem("refresh_token") === refreshToken
      )
        clearTokens();
      throw error;
    }
  };
  const previousAccess = localStorage.getItem("access_token");
  if (typeof navigator !== "undefined" && navigator.locks)
    return navigator.locks.request("gutv-event-refresh", async () => {
      const currentAccess = localStorage.getItem("access_token");
      if (currentAccess && currentAccess !== previousAccess)
        return currentAccess;
      return run();
    });
  return run();
}
function refreshAccessToken(): Promise<string> {
  if (!refreshPromise)
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}
export async function authenticatedApiRequest<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem("access_token") ?? "";
  try {
    return await apiRequest<T>(path, { ...options, token });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401) throw error;
    const newerToken = localStorage.getItem("access_token");
    const refreshed =
      newerToken && newerToken !== token
        ? newerToken
        : await refreshAccessToken();
    return apiRequest<T>(path, { ...options, token: refreshed });
  }
}
export const authApi = {
  login: async (login: string, password: string) => {
    const data = await apiRequest<AuthTokens>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ login, password }),
    });
    persistTokens(data);
    return data;
  },
  logout: async () => {
    await authenticatedApiRequest("/api/auth/logout", { method: "POST" });
    clearTokens();
  },
  logoutAll: async () => {
    await authenticatedApiRequest("/api/auth/logout_all", { method: "POST" });
    clearTokens();
  },
  refreshToken: refreshAccessToken,
};

import { ApiError, apiRequest } from "./api";

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

function persistTokens(tokens: AuthTokens) {
  localStorage.setItem("access_token", tokens.accessToken);
  localStorage.setItem("refresh_token", tokens.refreshToken);
}

function subscribeTokenRefresh(callback: (token: string) => void) {
  refreshSubscribers.push(callback);
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((callback) => {
    callback(token);
  });
  refreshSubscribers = [];
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    throw new Error("No refresh token");
  }

  try {
    const data = await apiRequest<AuthTokens>("/api/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken }),
    });

    persistTokens(data);
    return data.accessToken;
  } catch (error) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    throw error;
  }
}

export async function authenticatedApiRequest<TData>(
  path: string,
  options?: RequestInit,
): Promise<TData> {
  const token = localStorage.getItem("access_token") ?? "";

  try {
    return await apiRequest<TData>(path, {
      ...options,
      token,
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newToken = await refreshAccessToken();
          isRefreshing = false;
          onTokenRefreshed(newToken);
          return await apiRequest<TData>(path, {
            ...options,
            token: newToken,
          });
        } catch (refreshError) {
          isRefreshing = false;
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
          throw refreshError;
        }
      }

      return new Promise((resolve, reject) => {
        subscribeTokenRefresh(async (newToken: string) => {
          try {
            const result = await apiRequest<TData>(path, {
              ...options,
              token: newToken,
            });
            resolve(result);
          } catch (requestError) {
            reject(requestError);
          }
        });
      });
    }

    throw error;
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

  logout: () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
  },

  refreshToken: refreshAccessToken,
};

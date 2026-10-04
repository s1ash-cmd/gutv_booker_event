import { authenticatedApiRequest } from "./authApi";
export type UserSession = {
  id: string;
  createdAt: string;
  lastUsedAt: string;
  expiresAt: string;
  userAgent: string | null;
  isCurrent: boolean;
};
export const sessionApi = {
  list: () => authenticatedApiRequest<UserSession[]>("/api/auth/sessions"),
  revoke: (id: string) =>
    authenticatedApiRequest(`/api/auth/sessions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    }),
};

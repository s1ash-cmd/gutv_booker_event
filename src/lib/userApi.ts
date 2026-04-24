import type {
  CreateUserRequestDto,
  UserResponseDto,
} from "@/app/models/user/user";
import { apiRequest } from "./api";
import { authenticatedApiRequest } from "./authApi";

export const userApi = {
  create_user: async (input: CreateUserRequestDto) =>
    apiRequest<UserResponseDto>("/api/users/create", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  get_all: async () =>
    authenticatedApiRequest<UserResponseDto[]>("/api/users/get_all"),

  get_me: async () =>
    authenticatedApiRequest<UserResponseDto>("/api/users/get_me"),

  get_by_id: async (id: number) =>
    authenticatedApiRequest<UserResponseDto>(`/api/users/get_by_id/${id}`),

  get_by_name: async (namepart: string) =>
    authenticatedApiRequest<UserResponseDto[]>(
      `/api/users/get_by_name/${encodeURIComponent(namepart)}`,
    ),

  ban: async (id: number) =>
    authenticatedApiRequest<{ message: string }>(`/api/users/ban/${id}`, {
      method: "PATCH",
    }).then((result) => result.message),

  unban: async (id: number) =>
    authenticatedApiRequest<{ message: string }>(`/api/users/unban/${id}`, {
      method: "PATCH",
    }).then((result) => result.message),

  make_admin: async (id: number) =>
    authenticatedApiRequest<{ message: string }>(
      `/api/users/make_admin/${id}`,
      {
        method: "PATCH",
      },
    ).then((result) => result.message),

  make_organization: async (id: number) =>
    authenticatedApiRequest<{ message: string }>(
      `/api/users/make_organization/${id}`,
      {
        method: "PATCH",
      },
    ).then((result) => result.message),

  delete: async (id: number) =>
    authenticatedApiRequest<{ message: string }>(`/api/users/delete/${id}`, {
      method: "DELETE",
    }).then((result) => result.message),

  delete_me: async () =>
    authenticatedApiRequest<{ message: string }>("/api/users/delete_me", {
      method: "DELETE",
    }),
};

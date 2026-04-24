import type {
  CreateEventRequestDto,
  EventResponseDto,
} from "@/app/models/event/event";
import { authenticatedApiRequest } from "./authApi";

export const eventApi = {
  get_all: async () =>
    authenticatedApiRequest<EventResponseDto[]>("/api/event/get_all"),

  get_by_id: async (id: number) =>
    authenticatedApiRequest<EventResponseDto>(`/api/event/get_by_id/${id}`),

  get_my: async () =>
    authenticatedApiRequest<EventResponseDto[]>("/api/event/get_my"),

  get_by_user: async (id: number) =>
    authenticatedApiRequest<EventResponseDto[]>(`/api/event/get_by_user/${id}`),

  create_event: async (input: CreateEventRequestDto) =>
    authenticatedApiRequest<EventResponseDto>("/api/event/create", {
      method: "POST",
      body: JSON.stringify(input),
    }),

  get_by_status: async (status: string) =>
    authenticatedApiRequest<EventResponseDto[]>(
      `/api/event/get_by_status/${encodeURIComponent(status)}`,
    ),

  approve: async (id: number, adminComment?: string) =>
    authenticatedApiRequest<EventResponseDto>(`/api/event/approve/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ adminComment: adminComment ?? null }),
    }),

  cancel: async (id: number, adminComment?: string) =>
    authenticatedApiRequest<EventResponseDto>(`/api/event/cancel/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ adminComment: adminComment ?? null }),
    }),

  complete: async (id: number) =>
    authenticatedApiRequest<EventResponseDto>(`/api/event/complete/${id}`, {
      method: "PATCH",
    }),
};

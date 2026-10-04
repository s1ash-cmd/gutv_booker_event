import type {
  CreateEventRequestDto,
  EventResponseDto,
} from "@/app/models/event/event";
import { authenticatedApiRequest } from "./authApi";

export type EventPage = {
  summary: {
    total: number;
    Pending: number;
    Cancelled: number;
    Approved: number;
    Completed: number;
  };
  items: EventResponseDto[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};
export const eventApi = {
  list: async (options: {
    scope: "my" | "all" | "user";
    userId?: number;
    page: number;
    pageSize?: number;
    status: string;
    query: string;
    sort: string;
  }) => {
    const params = new URLSearchParams({
      scope: options.scope,
      page: String(options.page),
      pageSize: String(options.pageSize ?? 20),
      status: options.status,
      query: options.query,
      sort: options.sort,
    });
    if (options.userId) params.set("userId", String(options.userId));
    return authenticatedApiRequest<EventPage>(`/api/event/list?${params}`);
  },
  update_content_list: async (id: number, contentList: string) =>
    authenticatedApiRequest<EventResponseDto>(`/api/event/content_list/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ contentList }),
    }),
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

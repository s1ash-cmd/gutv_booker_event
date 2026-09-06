import type { EventDetails } from "@/lib/eventRequirements";

export interface CreateEventRequestDto {
  details: EventDetails;
  reason: string;
  startTime: string;
  endTime: string;
  comment?: string | null;
}

export interface EventResponseDto {
  clientId: number;
  details?: EventDetails | null;
  id: number;
  client: string;
  reason: string;
  creationTime: string;
  startTime: string;
  endTime: string;
  status: string;
  warnings: Record<string, unknown>;
  comment: string | null;
  adminComment: string | null;
}

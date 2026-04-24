import type {
  CreateEventRequestDto,
  EventResponseDto,
} from "@/app/models/event/event";
import { UserRole } from "@/app/models/user/user";
import type { Event, User } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export enum EventStatus {
  Pending = 0,
  Cancelled = 1,
  Approved = 2,
  Completed = 3,
}

const statusNames = ["Pending", "Cancelled", "Approved", "Completed"] as const;

function parseWarnings(value: string) {
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function mapEvent(event: Event): EventResponseDto {
  return {
    id: event.id,
    client: event.client,
    reason: event.reason,
    creationTime: event.creationTime.toISOString(),
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
    status: statusNames[event.status] ?? "Pending",
    warnings: parseWarnings(event.warningsJson),
    comment: event.comment ?? null,
    adminComment: event.adminComment ?? null,
  };
}

function ensureValidInput(input: CreateEventRequestDto) {
  if (!input.reason?.trim()) {
    throw new Error("Причина не может быть пустой");
  }

  const startTime = new Date(input.startTime);
  const endTime = new Date(input.endTime);

  if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
    throw new Error("Некорректная дата события");
  }

  if (startTime >= endTime) {
    throw new Error("Дата начала должна быть раньше даты окончания");
  }

  return { startTime, endTime };
}

function ensureCanCreateEvent(user: User) {
  const allowedRoles = [UserRole.Admin, UserRole.Organization];
  if (!allowedRoles.includes(user.role)) {
    throw new Error(
      "Заявки на мероприятия доступны только представителям организаций и администраторам",
    );
  }
}

export class EventService {
  async createEvent(
    input: CreateEventRequestDto,
    currentUser: { id: number },
  ): Promise<EventResponseDto> {
    const { startTime, endTime } = ensureValidInput(input);

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    ensureCanCreateEvent(user);

    const warnings: Record<string, unknown> = {};
    if ((startTime.getTime() - Date.now()) / (1000 * 60 * 60 * 24) < 2) {
      warnings.invalidDate = "Событие создается меньше чем за 2 дня";
    }

    const event = await prisma.event.create({
      data: {
        userId: user.id,
        client: user.name.trim() || user.login,
        reason: input.reason.trim(),
        creationTime: new Date(),
        status: EventStatus.Pending,
        startTime,
        endTime,
        comment: input.comment?.trim() || null,
        adminComment: null,
        warningsJson: JSON.stringify(warnings),
      },
    });

    return mapEvent(event);
  }

  async getAllEvents(): Promise<EventResponseDto[]> {
    const events = await prisma.event.findMany({
      orderBy: { creationTime: "desc" },
    });

    return events.map(mapEvent);
  }

  async getMyEvents(userId: number): Promise<EventResponseDto[]> {
    const events = await prisma.event.findMany({
      where: { userId },
      orderBy: { creationTime: "desc" },
    });

    return events.map(mapEvent);
  }

  async getEventsByUser(userId: number): Promise<EventResponseDto[]> {
    const events = await prisma.event.findMany({
      where: { userId },
      orderBy: { creationTime: "desc" },
    });

    return events.map(mapEvent);
  }

  async getEventById(
    id: number,
    currentUser: { id: number; roleName: string },
  ): Promise<EventResponseDto> {
    const event = await prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw new Error(`Событие с ID ${id} не найдено`);
    }

    const isAdmin = currentUser.roleName === "Admin";
    if (!isAdmin && event.userId !== currentUser.id) {
      throw new Error("У вас нет доступа к этой заявке");
    }

    return mapEvent(event);
  }

  async getEventsByStatus(status: string): Promise<EventResponseDto[]> {
    const statusValue = EventStatus[status as keyof typeof EventStatus];

    if (statusValue === undefined) {
      throw new Error("Некорректный статус");
    }

    const events = await prisma.event.findMany({
      where: { status: statusValue },
      orderBy: { creationTime: "desc" },
    });

    return events.map(mapEvent);
  }

  async approveEvent(id: number, adminComment?: string | null) {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new Error(`Событие с ID ${id} не найдено`);
    }

    if (event.status !== EventStatus.Pending) {
      throw new Error("Заявка недоступна для обработки");
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.Approved,
        adminComment: adminComment?.trim() || null,
      },
    });

    return mapEvent(updated);
  }

  async cancelEvent(id: number, adminComment?: string | null) {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new Error(`Событие с ID ${id} не найдено`);
    }

    if (event.status === EventStatus.Cancelled) {
      throw new Error("Эта заявка уже отменена");
    }

    if (event.status === EventStatus.Completed) {
      throw new Error("Завершенную заявку отменить нельзя");
    }

    const updated = await prisma.event.update({
      where: { id },
      data: {
        status: EventStatus.Cancelled,
        adminComment: adminComment?.trim() || null,
      },
    });

    return mapEvent(updated);
  }

  async completeEvent(id: number) {
    const event = await prisma.event.findUnique({ where: { id } });

    if (!event) {
      throw new Error(`Событие с ID ${id} не найдено`);
    }

    if (event.status !== EventStatus.Approved) {
      throw new Error("Завершить можно только одобренную заявку");
    }

    const updated = await prisma.event.update({
      where: { id },
      data: { status: EventStatus.Completed },
    });

    return mapEvent(updated);
  }
}

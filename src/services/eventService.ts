import type {
  CreateEventRequestDto,
  EventResponseDto,
} from "@/app/models/event/event";
import { UserRole } from "@/app/models/user/user";
import type { Event, User } from "@/generated/prisma/client";
import {
  contentListDeadline,
  eventDetailsSchema,
  moscowDate,
  validateEventDetails,
} from "@/lib/eventRequirements";
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

function parseDetails(value: string | null) {
  if (!value) return null;
  try {
    const parsed = eventDetailsSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export class EventValidationError extends Error {
  constructor(public fields: Record<string, string>) {
    super(Object.values(fields)[0] ?? "Проверьте заявку");
  }
}

function mapEvent(event: Event): EventResponseDto {
  return {
    id: event.id,
    clientId: event.userId,
    details: parseDetails(event.detailsJson),
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
  const { details, errors } = validateEventDetails(input?.details);
  if (typeof input?.reason !== "string" || !input.reason.trim())
    errors.reason = "Укажите обоснование заявки";
  else if (input.reason.length > 20000)
    errors.reason = "Обоснование: не более 20 000 символов";
  if (
    input?.comment != null &&
    (typeof input.comment !== "string" || input.comment.length > 20000)
  )
    errors.comment = "Комментарий: не более 20 000 символов";
  if (!details || Object.keys(errors).length)
    throw new EventValidationError(errors);
  // The structured schedule is authoritative; clients cannot bypass deadlines via the summary dates.
  const startTime = new Date(
    Math.min(...details.sessions.map((s) => new Date(s.startTime).getTime())),
  );
  const endTime = new Date(
    Math.max(...details.sessions.map((s) => new Date(s.endTime).getTime())),
  );
  return { startTime, endTime, details };
}

function ensureCanCreateEvent(user: User) {
  if (user.banned) throw new Error("Ваш аккаунт заблокирован");
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
    const { startTime, endTime, details } = ensureValidInput(input);

    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    ensureCanCreateEvent(user);

    const warnings: Record<string, unknown> = {};
    if (details.requestType === "trip" && !details.contentList) {
      warnings.contentListMissing = `Перечень необходимого контента нужно предоставить до ${contentListDeadline(details)} (за 1 месяц до выезда)`;
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
        detailsJson: JSON.stringify(details),
      },
    });

    return mapEvent(event);
  }

  async updateContentList(
    id: number,
    contentList: unknown,
    currentUser: { id: number; roleName: string },
  ): Promise<EventResponseDto> {
    if (!Number.isInteger(id) || id < 1)
      throw new Error("Некорректный идентификатор заявки");
    if (
      typeof contentList !== "string" ||
      !contentList.trim() ||
      contentList.length > 20000
    )
      throw new Error("Укажите перечень контента (до 20 000 символов)");
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });
    if (!user || user.banned) throw new Error("Нет доступа к изменению заявки");
    const event = await prisma.event.findUnique({ where: { id } });
    if (!event || (event.userId !== user.id && user.role !== UserRole.Admin))
      throw new Error("Нет доступа к этой заявке");
    const details = parseDetails(event.detailsJson);
    if (!details || details.requestType !== "trip")
      throw new Error("Перечень контента доступен только для выездной учёбы");
    if (![EventStatus.Pending, EventStatus.Approved].includes(event.status))
      throw new Error("Эту заявку уже нельзя дополнить");
    details.contentList = contentList.trim();
    const warnings = parseWarnings(event.warningsJson);
    delete warnings.contentListMissing;
    if (moscowDate(new Date()) > contentListDeadline(details))
      warnings.contentListLate =
        "Перечень контента предоставлен позднее чем за 1 месяц до выезда. Требуется согласование с директором ГУТВ.";
    const updated = await prisma.event.updateMany({
      where: {
        id,
        status: { in: [EventStatus.Pending, EventStatus.Approved] },
      },
      data: {
        detailsJson: JSON.stringify(details),
        warningsJson: JSON.stringify(warnings),
      },
    });
    if (!updated.count)
      throw new Error("Статус заявки изменился. Обновите страницу");
    return mapEvent(await prisma.event.findUniqueOrThrow({ where: { id } }));
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

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
  requestTypeLabels,
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

function eventSearchText(
  event: Pick<
    Event,
    "client" | "reason" | "comment" | "adminComment" | "detailsJson"
  >,
) {
  const details = parseDetails(event.detailsJson);
  return [
    event.client,
    event.reason,
    event.comment,
    event.adminComment,
    details?.organization,
    details?.representativeName,
    details ? requestTypeLabels[details.requestType] : null,
  ]
    .filter(Boolean)
    .join("\n")
    .toLocaleLowerCase("ru-RU");
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
    const user = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    ensureCanCreateEvent(user);
    // Only profile data can identify the representative; preserve a historical snapshot.
    const { startTime, endTime, details } = ensureValidInput({
      ...input,
      details: {
        ...input?.details,
        organization: user.organization,
        representativeName: user.name,
        representativeContacts: user.representativeContacts,
      },
    });

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

  async listEvents(options: {
    userId?: number;
    page: number;
    pageSize: number;
    status?: string;
    query: string;
    sort: "createdAsc" | "createdDesc";
  }) {
    // Backfill legacy Unicode search text in bounded batches: SQLite lower() does not case-fold Cyrillic.
    while (true) {
      const legacy = await prisma.event.findMany({
        where: { searchText: null },
        take: 100,
      });
      if (!legacy.length) break;
      await prisma.$transaction(
        legacy.map((event) =>
          prisma.event.updateMany({
            where: {
              id: event.id,
              searchText: null,
              adminComment: event.adminComment,
              comment: event.comment,
              detailsJson: event.detailsJson,
            },
            data: { searchText: eventSearchText(event) },
          }),
        ),
      );
    }
    const status = options.status
      ? statusNames.indexOf(options.status as (typeof statusNames)[number])
      : -1;
    const query = options.query.trim().toLocaleLowerCase("ru-RU");
    const id = /^\d+$/.test(query) ? Number(query) : null;
    const where = {
      ...(options.userId ? { userId: options.userId } : {}),
      ...(status >= 0 ? { status } : {}),
      ...(query
        ? {
            OR: [
              { searchText: { contains: query } },
              ...(id && Number.isSafeInteger(id) ? [{ id }] : []),
            ],
          }
        : {}),
    };
    return prisma.$transaction(async (tx) => {
      const total = await tx.event.count({ where });
      const totalPages = Math.max(1, Math.ceil(total / options.pageSize));
      const page = Math.min(options.page, totalPages);
      const grouped = await tx.event.groupBy({
        by: ["status"],
        where: options.userId ? { userId: options.userId } : {},
        _count: { _all: true },
      });
      const summary = {
        total: 0,
        Pending: 0,
        Cancelled: 0,
        Approved: 0,
        Completed: 0,
      };
      for (const row of grouped) {
        const name = statusNames[row.status];
        if (name) summary[name] = row._count._all;
        summary.total += row._count._all;
      }
      const events = await tx.event.findMany({
        where,
        take: options.pageSize,
        skip: (page - 1) * options.pageSize,
        orderBy: [
          { creationTime: options.sort === "createdAsc" ? "asc" : "desc" },
          { id: options.sort === "createdAsc" ? "asc" : "desc" },
        ],
      });
      return {
        items: events.map(mapEvent),
        summary,
        total,
        page,
        pageSize: options.pageSize,
        totalPages,
      };
    });
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
    const statusValue = statusNames.indexOf(
      status as (typeof statusNames)[number],
    );

    if (statusValue < 0) {
      throw new Error("Некорректный статус");
    }

    const events = await prisma.event.findMany({
      where: { status: statusValue },
      orderBy: { creationTime: "desc" },
    });

    return events.map(mapEvent);
  }

  private async moderateEvent(
    id: number,
    actor: { id: number; sessionId: string },
    status: EventStatus,
    adminComment?: string | null,
  ) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: actor.id } });
      const session = await tx.userSession.findUnique({
        where: { id: actor.sessionId },
      });
      if (
        !user ||
        user.banned ||
        !session ||
        session.userId !== user.id ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      )
        throw new Error("Unauthorized");
      if (user.role !== UserRole.Admin) throw new Error("Forbidden");
      const event = await tx.event.findUnique({ where: { id } });
      if (!event) throw new Error("Заявка не найдена");
      const allowed =
        status === EventStatus.Approved
          ? [EventStatus.Pending]
          : status === EventStatus.Completed
            ? [EventStatus.Approved]
            : [EventStatus.Pending, EventStatus.Approved];
      if (!allowed.includes(event.status))
        throw new Error("Статус заявки изменился. Обновите страницу");
      const updated = await tx.event.update({
        where: { id, status: { in: allowed } },
        data: {
          status,
          ...(status !== EventStatus.Completed
            ? { adminComment: adminComment?.trim() || null, searchText: null }
            : {}),
        },
      });
      return mapEvent(updated);
    });
  }

  async approveEvent(
    id: number,
    adminComment: string | null | undefined,
    actor: { id: number; sessionId: string },
  ) {
    return this.moderateEvent(id, actor, EventStatus.Approved, adminComment);
  }
  async cancelEvent(
    id: number,
    adminComment: string | null | undefined,
    actor: { id: number; sessionId: string },
  ) {
    return this.moderateEvent(id, actor, EventStatus.Cancelled, adminComment);
  }
  async completeEvent(id: number, actor: { id: number; sessionId: string }) {
    return this.moderateEvent(id, actor, EventStatus.Completed);
  }
}

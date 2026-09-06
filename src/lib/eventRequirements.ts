import { z } from "zod";

export const requestTypeLabels = {
  coverage: "Освещение мероприятия",
  content: "Создание видеоконтента",
  combined: "Мероприятие и видеоконтент",
  trip: "Выездная учёба",
} as const;
export const crewLabels = {
  videoEngineer: "Видеоинженер",
  operator: "Оператор",
  editor: "Монтажёр",
  sound: "Специалист по звуку",
  photographer: "Фотограф",
  lighting: "Специалист по свету",
} as const;
const requiredText = z
  .string()
  .trim()
  .min(1, "Заполните поле")
  .max(20000, "Не более 20 000 символов");
const optionalText = z.string().trim().max(20000).default("");
export const eventDetailsSchema = z.object({
  requestType: z.enum(["coverage", "content", "combined", "trip"]),
  organization: requiredText.max(500),
  representativeName: requiredText.max(300),
  representativeContacts: requiredText.max(1000),
  sessions: z
    .array(
      z.object({
        startTime: z.iso.datetime({ offset: true }),
        endTime: z.iso.datetime({ offset: true }),
        location: requiredText.max(1000),
      }),
    )
    .min(1, "Добавьте дату съёмки")
    .max(30),
  deliveryDeadline: z.string().default(""),
  scenario: optionalText,
  participants: optionalText,
  crew: z.object({
    videoEngineer: z.number().int().min(0).max(100),
    operator: z.number().int().min(0).max(100),
    editor: z.number().int().min(0).max(100),
    sound: z.number().int().min(0).max(100),
    photographer: z.number().int().min(0).max(100),
    lighting: z.number().int().min(0).max(100),
  }),
  contentIdea: optionalText,
  contentList: optionalText,
  rulesAccepted: z.literal(true, {
    error: "Подтвердите ознакомление с правилами",
  }),
});
export type EventDetails = z.infer<typeof eventDetailsSchema>;
export type RequestType = EventDetails["requestType"];

// Deadlines use calendar dates in Moscow, including month-end clamping.
export function moscowDate(value: string | Date): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}
export function subtractCalendar(
  value: string,
  amount: number,
  unit: "days" | "months",
): string {
  const date = new Date(`${value}T12:00:00Z`);
  if (unit === "days") date.setUTCDate(date.getUTCDate() - amount);
  else {
    const day = date.getUTCDate();
    date.setUTCDate(1);
    date.setUTCMonth(date.getUTCMonth() - amount);
    const lastDay = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
    ).getUTCDate();
    date.setUTCDate(Math.min(day, lastDay));
  }
  return date.toISOString().slice(0, 10);
}
export function contentListDeadline(details: EventDetails): string {
  return subtractCalendar(
    moscowDate(
      details.sessions.reduce(
        (first, s) =>
          new Date(s.startTime) < new Date(first) ? s.startTime : first,
        details.sessions[0].startTime,
      ),
    ),
    1,
    "months",
  );
}
export function validateEventDetails(
  value: unknown,
  now = new Date(),
): { details?: EventDetails; errors: Record<string, string> } {
  const parsed = eventDetailsSchema.safeParse(value);
  const errors: Record<string, string> = {};
  if (!parsed.success) {
    for (const issue of parsed.error.issues)
      errors[issue.path.join(".")] ??= issue.message;
    return { errors };
  }
  const details = parsed.data;
  const today = moscowDate(now);
  details.sessions.forEach((session, index) => {
    if (new Date(session.startTime) >= new Date(session.endTime))
      errors[`sessions.${index}.endTime`] =
        "Окончание должно быть позже начала";
    if (new Date(session.startTime) <= now)
      errors[`sessions.${index}.startTime`] = "Укажите будущую дату";
  });
  const first = details.sessions.reduce((a, b) =>
    new Date(a.startTime) < new Date(b.startTime) ? a : b,
  );
  const firstIndex = details.sessions.indexOf(first);
  if (details.requestType === "trip") {
    if (today > subtractCalendar(moscowDate(first.startTime), 2, "months"))
      errors[`sessions.${firstIndex}.startTime`] =
        "Заявка на выезд подаётся не позднее чем за 2 календарных месяца";
    if (!Object.values(details.crew).some((count) => count > 0))
      errors.crew = "Укажите хотя бы одного специалиста";
    if (!details.contentIdea)
      errors.contentIdea = "Опишите идею контента и формат реализации";
  } else {
    if (!details.scenario)
      errors.scenario = "Добавьте план мероприятия или сценарий ролика";
    if (!details.participants)
      errors.participants =
        "Укажите количество участников, например 5–10 человек";
    if (
      details.requestType !== "content" &&
      today > subtractCalendar(moscowDate(first.startTime), 14, "days")
    )
      errors[`sessions.${firstIndex}.startTime`] =
        "Заявка на освещение подаётся не позднее чем за 14 дней";
    if (details.requestType !== "coverage") {
      if (
        !/^\d{4}-\d{2}-\d{2}$/.test(details.deliveryDeadline) ||
        !Number.isFinite(new Date(details.deliveryDeadline).getTime()) ||
        new Date(details.deliveryDeadline).toISOString().slice(0, 10) !==
          details.deliveryDeadline
      )
        errors.deliveryDeadline = "Укажите дату сдачи видеоконтента";
      else if (today > subtractCalendar(details.deliveryDeadline, 21, "days"))
        errors.deliveryDeadline =
          "До сдачи видеоконтента должно быть не менее 21 дня";
      else if (
        details.sessions.some(
          (s) => moscowDate(s.endTime) > details.deliveryDeadline,
        )
      )
        errors.deliveryDeadline =
          "Срок сдачи не может быть раньше окончания съёмок";
    }
  }
  return { details, errors };
}

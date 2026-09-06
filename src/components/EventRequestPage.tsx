"use client";

import {
  ArrowUpRight,
  CalendarPlus,
  ClipboardList,
  FileText,
  LogIn,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api";
import { eventApi } from "@/lib/eventApi";
import {
  crewLabels,
  type EventDetails,
  type RequestType,
  requestTypeLabels,
  validateEventDetails,
} from "@/lib/eventRequirements";
import { canCreateEvent } from "@/lib/roles";

const eventStatusLabels: Record<string, string> = {
  Pending: "На рассмотрении",
  Approved: "Одобрена",
  Cancelled: "Отменена",
  Completed: "Завершена",
};

export function EventRequestPage() {
  const { user, isAuth, isLoading: isAuthLoading } = useAuth();
  const [reason, setReason] = useState("");
  const [requestType, setRequestType] = useState<RequestType>("coverage");
  const [fields, setFields] = useState({
    organization: "",
    representativeName: "",
    representativeContacts: "",
    scenario: "",
    participants: "",
    deliveryDeadline: "",
    contentIdea: "",
    contentList: "",
  });
  const nextSessionId = useRef(1);
  const [sessions, setSessions] = useState([
    { id: 0, startTime: "", endTime: "", location: "" },
  ]);
  const [crew, setCrew] = useState<EventDetails["crew"]>({
    videoEngineer: 0,
    operator: 0,
    editor: 0,
    sound: 0,
    photographer: 0,
    lighting: 0,
  });
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createdEventId, setCreatedEventId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const isTrip = requestType === "trip";
  const needsDelivery = requestType === "content" || requestType === "combined";

  function clearFieldError(field: string) {
    setErrors((previous) => ({ ...previous, [field]: "" }));
  }

  function fieldError(field: string) {
    return errors[field] ? (
      <p id={`${field}-error`} className="text-sm text-destructive">
        {errors[field]}
      </p>
    ) : null;
  }

  function textField(
    field: keyof typeof fields,
    label: string,
    placeholder: string,
    multiline = false,
    optional = false,
  ) {
    const Control = multiline ? Textarea : Input;
    return (
      <div className="min-w-0 space-y-2">
        <Label htmlFor={field}>
          {label}
          {!optional && <span className="text-destructive"> *</span>}
        </Label>
        <Control
          id={field}
          value={fields[field]}
          placeholder={placeholder}
          required={!optional}
          maxLength={
            field === "organization"
              ? 500
              : field === "representativeName"
                ? 300
                : field === "representativeContacts"
                  ? 1000
                  : 20000
          }
          disabled={loading}
          onChange={(event) => {
            setFields((previous) => ({
              ...previous,
              [field]: event.target.value,
            }));
            clearFieldError(field);
          }}
          aria-invalid={Boolean(errors[field])}
          aria-describedby={errors[field] ? `${field}-error` : undefined}
          className={multiline ? "min-h-28" : ""}
        />
        {fieldError(field)}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    const normalizedSessions = sessions.map(
      ({ startTime, endTime, location }) => {
        const toISO = (value: string) =>
          value && Number.isFinite(new Date(`${value}:00+03:00`).getTime())
            ? new Date(`${value}:00+03:00`).toISOString()
            : "";
        return {
          startTime: toISO(startTime),
          endTime: toISO(endTime),
          location,
        };
      },
    );
    const validation = validateEventDetails({
      ...fields,
      requestType,
      sessions: normalizedSessions,
      crew,
      rulesAccepted,
    });
    const nextErrors = { ...validation.errors };
    if (!reason.trim())
      nextErrors.reason =
        "Объясните, зачем нужна съёмка и как будут использованы материалы";
    else if (reason.trim().length > 20000)
      nextErrors.reason = "Не более 20 000 символов";
    sessions.forEach((_session, index) => {
      if (!normalizedSessions[index].startTime)
        nextErrors[`sessions.${index}.startTime`] =
          "Укажите дату и время начала";
      if (!normalizedSessions[index].endTime)
        nextErrors[`sessions.${index}.endTime`] =
          "Укажите дату и время окончания";
    });
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !validation.details) {
      const field = Object.keys(nextErrors)[0];
      document
        .getElementById(field === "crew" ? "crew.videoEngineer" : field)
        ?.focus();
      return;
    }
    try {
      setLoading(true);
      const times = normalizedSessions
        .flatMap((session) => [session.startTime, session.endTime])
        .sort();
      const event = await eventApi.create_event({
        reason: reason.trim(),
        startTime: times[0],
        endTime: times[times.length - 1],
        comment: comment.trim() || null,
        details: validation.details,
      });
      setSuccessMessage(
        `Заявка №${event.id} успешно отправлена. Текущий статус: ${eventStatusLabels[event.status] ?? "Принята"}. Команда рассмотрит её в течение 3 рабочих дней.`,
      );
      setCreatedEventId(event.id);
      setReason("");
      setFields({
        organization: "",
        representativeName: "",
        representativeContacts: "",
        scenario: "",
        participants: "",
        deliveryDeadline: "",
        contentIdea: "",
        contentList: "",
      });
      setSessions([
        {
          id: nextSessionId.current++,
          startTime: "",
          endTime: "",
          location: "",
        },
      ]);
      setCrew({
        videoEngineer: 0,
        operator: 0,
        editor: 0,
        sound: 0,
        photographer: 0,
        lighting: 0,
      });
      setRulesAccepted(false);
      setComment("");
    } catch (submitError) {
      if (
        submitError instanceof ApiError &&
        submitError.details &&
        typeof submitError.details === "object" &&
        "fields" in submitError.details
      ) {
        const serverFields = submitError.details.fields;
        if (serverFields && typeof serverFields === "object") {
          const fieldErrors = Object.fromEntries(
            Object.entries(serverFields).filter(
              (entry): entry is [string, string] =>
                typeof entry[1] === "string",
            ),
          );
          setErrors(fieldErrors);
          document.getElementById(Object.keys(fieldErrors)[0])?.focus();
        }
      }
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось создать заявку",
      );
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = isAuth && canCreateEvent(user?.role);

  return (
    <div className="bg-background px-4 py-8 sm:px-6 md:py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              GUtv · Съемка мероприятий
            </p>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Новая заявка
            </h1>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground">
              Выберите формат работы, расскажите о задаче и запланируйте съёмку.
              Команда GUtv рассмотрит заявку в течение 3 рабочих дней.
            </p>
          </div>
          {isAuth && (
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/dashboard/events/my">
                <ClipboardList className="size-4" />
                Мои заявки
              </Link>
            </Button>
          )}
        </div>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          {isAuthLoading ? (
            <div
              className="rounded-xl border border-border bg-card p-8"
              aria-live="polite"
              aria-busy="true"
            >
              <p className="text-sm text-muted-foreground">Загрузка формы…</p>
            </div>
          ) : !isAuth ? (
            <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
              <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <LogIn className="size-6" />
              </div>
              <h2 className="text-xl font-semibold">
                Войдите, чтобы подать заявку
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Используйте аккаунт представителя организации. Заявка будет
                связана с вашим профилем — там можно следить за ее статусом и
                ответом команды.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg">
                  <Link href="/login">Войти</Link>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link href="/register">Создать аккаунт</Link>
                </Button>
              </div>
            </section>
          ) : !canSubmit ? (
            <section className="rounded-xl border border-border bg-card p-6 sm:p-8">
              <h2 className="text-xl font-semibold">
                Нужен доступ представителя организации
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Подавать заявки могут представители организаций и
                администраторы. Если вам нужен доступ, свяжитесь с командой
                GUtv.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href="/contacts">Связаться с командой</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/profile">Мой профиль</Link>
                </Button>
              </div>
            </section>
          ) : (
            <form
              onSubmit={handleSubmit}
              noValidate
              className="bg-card border border-border rounded-xl p-4 sm:p-6 space-y-4"
            >
              <h2 className="text-lg font-semibold">Детали заявки</h2>
              <p className="text-sm text-muted-foreground">
                Поля со звездочкой обязательны для заполнения.
              </p>
              {error && (
                <div
                  role="alert"
                  className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20"
                >
                  {error}
                </div>
              )}

              {successMessage && (
                <div
                  aria-live="polite"
                  className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-800 dark:text-green-200"
                >
                  <p className="text-sm font-semibold">Заявка отправлена</p>
                  <p className="mt-1 text-sm text-green-700/90 dark:text-green-200/90">
                    {successMessage}
                  </p>
                  {createdEventId && (
                    <Button
                      asChild
                      variant="outline"
                      size="sm"
                      className="mt-3"
                    >
                      <Link href={`/dashboard/events/${createdEventId}`}>
                        Открыть заявку
                      </Link>
                    </Button>
                  )}
                </div>
              )}

              <fieldset disabled={loading} className="space-y-3">
                <legend className="mb-3 text-sm font-semibold">
                  Что нужно подготовить?
                </legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(
                    Object.entries(requestTypeLabels) as [RequestType, string][]
                  ).map(([type, label]) => (
                    <label
                      key={type}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${requestType === type ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}
                    >
                      <input
                        type="radio"
                        name="requestType"
                        value={type}
                        checked={requestType === type}
                        onChange={() => {
                          setRequestType(type);
                          setErrors({});
                        }}
                        className="mt-1 accent-primary"
                      />
                      <span className="text-sm font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <div className="space-y-5 border-t border-border pt-5">
                <h3 className="font-semibold">Организация и представитель</h3>
                {textField(
                  "organization",
                  "Название организации",
                  "Например, студенческий совет факультета",
                )}
                {textField(
                  "representativeName",
                  "ФИО представителя",
                  "Фамилия, имя и отчество",
                )}
                {textField(
                  "representativeContacts",
                  "Контакты представителя",
                  "Телефон, Telegram или электронная почта",
                )}
                <div className="space-y-2">
                  <Label htmlFor="reason">
                    Обоснование заявки{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    required
                    maxLength={20000}
                    rows={4}
                    disabled={loading}
                    placeholder="Зачем нужна съёмка, для какой аудитории и где будут использованы материалы? Например, репортаж о студенческом форуме для сообщества организации."
                    onChange={(event) => {
                      setReason(event.target.value);
                      clearFieldError("reason");
                    }}
                    aria-invalid={Boolean(errors.reason)}
                    aria-describedby={
                      errors.reason ? "reason-error" : undefined
                    }
                  />
                  {fieldError("reason")}
                </div>
              </div>

              <div className="space-y-4 border-t border-border pt-5">
                <div>
                  <h3 className="font-semibold">
                    Даты и места {isTrip ? "выезда" : "съёмки"}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Время московское (UTC+3). Для нескольких дней или площадок
                    добавьте отдельные интервалы.
                  </p>
                </div>
                {sessions.map((session, index) => (
                  <div
                    key={session.id}
                    className="space-y-4 rounded-xl border border-border bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-medium">
                        Интервал {index + 1}
                      </h4>
                      {sessions.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={loading}
                          onClick={() => {
                            setSessions((previous) =>
                              previous.filter((item) => item.id !== session.id),
                            );
                            setErrors({});
                          }}
                          aria-label={`Удалить интервал ${index + 1}`}
                        >
                          <Trash2 className="size-4" />
                          Удалить
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      {(["startTime", "endTime"] as const).map((field) => {
                        const id = `sessions.${index}.${field}`;
                        return (
                          <div key={field} className="min-w-0 space-y-2">
                            <Label htmlFor={id}>
                              {field === "startTime" ? "Начало" : "Окончание"}{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id={id}
                              type="datetime-local"
                              required
                              value={session[field]}
                              disabled={loading}
                              className="min-w-0"
                              aria-invalid={Boolean(errors[id])}
                              aria-describedby={
                                errors[id] ? `${id}-error` : undefined
                              }
                              onChange={(event) => {
                                setSessions((previous) =>
                                  previous.map((item) =>
                                    item.id === session.id
                                      ? { ...item, [field]: event.target.value }
                                      : item,
                                  ),
                                );
                                clearFieldError(id);
                              }}
                            />
                            {fieldError(id)}
                          </div>
                        );
                      })}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`sessions.${index}.location`}>
                        Место проведения{" "}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id={`sessions.${index}.location`}
                        value={session.location}
                        required
                        maxLength={1000}
                        disabled={loading}
                        placeholder="Адрес, корпус и аудитория или название выездной площадки"
                        aria-invalid={Boolean(
                          errors[`sessions.${index}.location`],
                        )}
                        aria-describedby={
                          errors[`sessions.${index}.location`]
                            ? `sessions.${index}.location-error`
                            : undefined
                        }
                        onChange={(event) => {
                          setSessions((previous) =>
                            previous.map((item) =>
                              item.id === session.id
                                ? { ...item, location: event.target.value }
                                : item,
                            ),
                          );
                          clearFieldError(`sessions.${index}.location`);
                        }}
                      />
                      {fieldError(`sessions.${index}.location`)}
                    </div>
                  </div>
                ))}
                {fieldError("sessions")}
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading || sessions.length >= 30}
                  onClick={() =>
                    setSessions((previous) => [
                      ...previous,
                      {
                        id: nextSessionId.current++,
                        startTime: "",
                        endTime: "",
                        location: "",
                      },
                    ])
                  }
                >
                  <Plus className="size-4" />
                  Добавить дату или площадку
                </Button>
              </div>

              <div className="space-y-5 border-t border-border pt-5">
                <h3 className="font-semibold">
                  {isTrip ? "Команда и программа выезда" : "План и материалы"}
                </h3>
                {isTrip ? (
                  <>
                    <fieldset className="space-y-3" disabled={loading}>
                      <legend className="mb-3 text-sm font-medium">
                        Количество специалистов{" "}
                        <span className="text-destructive">*</span>
                      </legend>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {(
                          Object.entries(crewLabels) as [
                            keyof EventDetails["crew"],
                            string,
                          ][]
                        ).map(([role, label]) => (
                          <div key={role} className="space-y-2">
                            <Label htmlFor={`crew.${role}`}>{label}</Label>
                            <Input
                              id={`crew.${role}`}
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              value={crew[role]}
                              onChange={(event) => {
                                setCrew((previous) => ({
                                  ...previous,
                                  [role]:
                                    event.target.value === ""
                                      ? 0
                                      : Number(event.target.value),
                                }));
                                clearFieldError("crew");
                                clearFieldError(`crew.${role}`);
                              }}
                              aria-invalid={Boolean(
                                errors.crew || errors[`crew.${role}`],
                              )}
                              aria-describedby={
                                errors[`crew.${role}`]
                                  ? `crew.${role}-error`
                                  : errors.crew
                                    ? "crew-error"
                                    : undefined
                              }
                            />
                            {fieldError(`crew.${role}`)}
                          </div>
                        ))}
                      </div>
                      {fieldError("crew")}
                    </fieldset>
                    {textField(
                      "contentIdea",
                      "Идея контента и формат реализации",
                      "Например, горизонтальный видеодневник выездной учёбы: интервью с участниками, учебные занятия и итоговый ролик.",
                      true,
                    )}
                    {textField(
                      "contentList",
                      "Перечень контента (можно дополнить позже)",
                      "Например, один итоговый ролик, три интервью и фотоотчёт. Укажите формат, количество и назначение материалов.",
                      true,
                      true,
                    )}
                    <p className="text-sm leading-6 text-muted-foreground">
                      Конкретный перечень контента нужно предоставить не позднее
                      чем за 1 календарный месяц до выезда. Его можно дополнить
                      в карточке заявки.
                    </p>
                  </>
                ) : (
                  <>
                    {textField(
                      "scenario",
                      "План мероприятия или сценарий ролика",
                      "Например: 10:00 — открытие, 10:30 — выступления, 12:00 — интервью. Укажите ключевые эпизоды и пожелания к съёмке.",
                      true,
                    )}
                    {textField(
                      "participants",
                      "Количество участников",
                      "Например, 5–10 человек",
                    )}
                  </>
                )}
                {needsDelivery && (
                  <div className="space-y-2">
                    <Label htmlFor="deliveryDeadline">
                      Срок сдачи видеоконтента{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="deliveryDeadline"
                      type="date"
                      value={fields.deliveryDeadline}
                      required
                      disabled={loading}
                      aria-invalid={Boolean(errors.deliveryDeadline)}
                      aria-describedby={
                        errors.deliveryDeadline
                          ? "deliveryDeadline-error"
                          : undefined
                      }
                      onChange={(event) => {
                        setFields((previous) => ({
                          ...previous,
                          deliveryDeadline: event.target.value,
                        }));
                        clearFieldError("deliveryDeadline");
                      }}
                    />
                    {fieldError("deliveryDeadline")}
                    <p className="text-sm text-muted-foreground">
                      Подавайте заявку минимум за 21 день до сдачи готового
                      материала.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="comment">Дополнительный комментарий</Label>
                  <Textarea
                    id="comment"
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder="Особенности площадки, доступ команды и другие важные детали"
                    rows={3}
                    disabled={loading}
                    maxLength={20000}
                  />
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-start gap-3">
                  <input
                    id="rulesAccepted"
                    type="checkbox"
                    checked={rulesAccepted}
                    disabled={loading}
                    onChange={(event) => {
                      setRulesAccepted(event.target.checked);
                      clearFieldError("rulesAccepted");
                    }}
                    required
                    aria-invalid={Boolean(errors.rulesAccepted)}
                    aria-describedby={
                      errors.rulesAccepted ? "rulesAccepted-error" : undefined
                    }
                    className="mt-1 size-4 shrink-0 accent-primary"
                  />
                  <label htmlFor="rulesAccepted" className="text-sm leading-6">
                    Я ознакомился с{" "}
                    <Link
                      href="/rules"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary underline underline-offset-4"
                    >
                      правилами подачи заявок
                    </Link>
                    , сроками и горизонтальным форматом съёмки.
                  </label>
                </div>
                {fieldError("rulesAccepted")}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full sm:w-auto"
                  disabled={loading}
                >
                  <CalendarPlus className="w-4 h-4 mr-2" />
                  {loading ? "Отправка..." : "Отправить заявку"}
                </Button>
              </div>
            </form>
          )}
          <aside className="space-y-5 rounded-xl border border-border bg-card/50 p-5">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4 text-primary" />
              Перед отправкой
            </div>
            <div className="space-y-4 text-sm leading-6">
              <div>
                <h2 className="font-medium">Опишите задачу</h2>
                <p className="mt-1 text-muted-foreground">
                  Укажите план, места и что важно снять. Съёмка проводится в
                  горизонтальном формате. Для выезда перечень контента нужен за
                  1 календарный месяц.
                </p>
              </div>
              <div>
                <h2 className="font-medium">Планируйте заранее</h2>
                <p className="mt-1 text-muted-foreground">
                  Освещение — минимум за 14 дней. Видеоконтент — за 21 день до
                  сдачи. Выездная учёба — за 2 календарных месяца. Для
                  совмещённой заявки действуют оба срока.
                </p>
              </div>
              <div>
                <h2 className="font-medium">Дождитесь подтверждения</h2>
                <p className="mt-1 text-muted-foreground">
                  Рассмотрение занимает до 3 рабочих дней. Статус и ответ
                  команды появятся в разделе «Мои заявки».
                </p>
              </div>
            </div>
            <div className="space-y-3 border-t border-border pt-4">
              <Link
                href="/rules"
                className="flex items-center justify-between text-sm font-medium hover:text-primary"
              >
                Правила подачи заявок
                <ArrowUpRight className="size-4" />
              </Link>
              <Link
                href="/contacts"
                className="flex items-center justify-between text-sm font-medium hover:text-primary"
              >
                Контакты команды
                <ArrowUpRight className="size-4" />
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

"use client";

import { Calendar, ClipboardList, Users } from "lucide-react";
import { useState } from "react";
import type { EventResponseDto } from "@/app/models/event/event";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { eventApi } from "@/lib/eventApi";
import {
  contentListDeadline,
  crewLabels,
  requestTypeLabels,
} from "@/lib/eventRequirements";

function formatDate(value: string, includeTime = false) {
  return new Date(
    value.length === 10 ? `${value}T12:00:00+03:00` : value,
  ).toLocaleString("ru-RU", {
    timeZone: "Europe/Moscow",
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(includeTime ? ({ hour: "2-digit", minute: "2-digit" } as const) : {}),
  });
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-xs text-muted-foreground">{label}</dt>
      <dd className="whitespace-pre-wrap break-words text-sm">
        {value || "Не указано"}
      </dd>
    </div>
  );
}

export function EventRequestDetails({
  event,
  canEditContentList,
  onUpdate,
}: {
  event: EventResponseDto;
  canEditContentList: boolean;
  onUpdate: (event: EventResponseDto) => void;
}) {
  const details = event.details;
  const [contentList, setContentList] = useState(details?.contentList ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!details) return null;

  async function saveContentList() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await eventApi.update_content_list(
        event.id,
        contentList.trim(),
      );
      setContentList(updated.details?.contentList ?? contentList.trim());
      onUpdate(updated);
      setSaved(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Не удалось сохранить перечень контента",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
          <ClipboardList className="h-5 w-5 shrink-0 text-primary" />
          {requestTypeLabels[details.requestType]}
        </h2>
        <dl className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Организация / подразделение"
            value={details.organization}
          />
          <Field label="ФИО представителя" value={details.representativeName} />
          <Field
            label="Контакты представителя"
            value={details.representativeContacts}
          />
          {details.deliveryDeadline && (
            <Field
              label="Срок сдачи видеоконтента"
              value={formatDate(details.deliveryDeadline)}
            />
          )}
        </dl>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
          <Calendar className="h-5 w-5 shrink-0 text-primary" />
          Даты и места проведения
        </h2>
        <p className="mb-4 text-xs text-muted-foreground">
          Время указано по Москве (МСК)
        </p>
        <ol className="space-y-3">
          {details.sessions.map((session, index) => (
            <li
              key={`${session.startTime}-${session.endTime}-${session.location}`}
              className="rounded-lg bg-secondary/30 p-4"
            >
              <h3 className="mb-3 text-sm font-medium">Дата {index + 1}</h3>
              <dl className="grid gap-3 sm:grid-cols-2">
                <Field
                  label="Начало"
                  value={formatDate(session.startTime, true)}
                />
                <Field
                  label="Окончание"
                  value={formatDate(session.endTime, true)}
                />
                <div className="sm:col-span-2">
                  <Field label="Место проведения" value={session.location} />
                </div>
              </dl>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">План и содержание</h2>
        <dl className="space-y-4">
          {(details.requestType !== "trip" || details.scenario) && (
            <Field
              label="План мероприятия / сценарий ролика"
              value={details.scenario}
            />
          )}
          {(details.requestType !== "trip" || details.participants) && (
            <Field label="Количество участников" value={details.participants} />
          )}
          {(details.requestType === "trip" || details.contentIdea) && (
            <Field
              label="Идея контента и формат реализации"
              value={details.contentIdea}
            />
          )}
          {details.requestType !== "trip" && details.contentList && (
            <Field label="Перечень контента" value={details.contentList} />
          )}
        </dl>
      </section>

      {Object.values(details.crew).some((count) => count > 0) && (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
            <Users className="h-5 w-5 shrink-0 text-primary" />
            Состав команды
          </h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            {Object.entries(crewLabels).map(([key, label]) => (
              <Field
                key={key}
                label={label}
                value={String(details.crew[key as keyof typeof crewLabels])}
              />
            ))}
          </dl>
        </section>
      )}

      {details.requestType === "trip" && (
        <section className="rounded-xl border border-border bg-card p-4 sm:p-6">
          <h2 className="mb-2 text-lg font-semibold">
            Перечень контента для выезда
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Предоставьте перечень до {formatDate(contentListDeadline(details))}{" "}
            — за один календарный месяц до выезда. Его можно дополнить после
            подачи заявки.
          </p>
          {canEditContentList ? (
            <form
              onSubmit={(submitEvent) => {
                submitEvent.preventDefault();
                void saveContentList();
              }}
              className="space-y-3"
            >
              <label
                htmlFor="trip-content-list"
                className="block text-sm font-medium"
              >
                Подробный перечень контента
              </label>
              <Textarea
                id="trip-content-list"
                value={contentList}
                onChange={(changeEvent) => {
                  setContentList(changeEvent.target.value);
                  setSaved(false);
                }}
                maxLength={20000}
                rows={6}
                disabled={saving}
                placeholder="Укажите материалы, которые нужно подготовить к выезду"
              />
              {error && (
                <p role="alert" className="text-sm text-destructive">
                  {error}
                </p>
              )}
              {saved && (
                <p aria-live="polite" className="text-sm text-primary">
                  Перечень сохранён
                </p>
              )}
              <Button
                type="submit"
                disabled={saving}
                className="w-full sm:w-auto"
              >
                {saving ? "Сохранение..." : "Сохранить перечень"}
              </Button>
            </form>
          ) : (
            <p className="whitespace-pre-wrap break-words text-sm">
              {details.contentList || "Перечень пока не предоставлен"}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

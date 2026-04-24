"use client";

import { CalendarPlus, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { eventApi } from "@/lib/eventApi";
import { canCreateEvent } from "@/lib/roles";

const eventStatusLabels: Record<string, string> = {
  Pending: "На рассмотрении",
  Approved: "Одобрена",
  Cancelled: "Отменена",
  Completed: "Завершена",
};

export default function EventPage() {
  const router = useRouter();
  const { user, isAuth, isLoading: isAuthLoading } = useAuth();
  const [reason, setReason] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function convertToISO(datetimeLocal: string) {
    return new Date(datetimeLocal).toISOString();
  }

  function getStatusLabel(status: string) {
    return eventStatusLabels[status] ?? "Принята";
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!reason.trim() || !startTime || !endTime) {
      setError("Заполните причину и даты события");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setError("Дата окончания должна быть позже даты начала");
      return;
    }

    try {
      setLoading(true);
      const event = await eventApi.create_event({
        reason: reason.trim(),
        startTime: convertToISO(startTime),
        endTime: convertToISO(endTime),
        comment: comment.trim() || null,
      });

      setSuccessMessage(
        `Заявка №${event.id} успешно отправлена. Текущий статус: ${getStatusLabel(event.status)}.`,
      );
      setReason("");
      setStartTime("");
      setEndTime("");
      setComment("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Не удалось создать мероприятие",
      );
    } finally {
      setLoading(false);
    }
  }

  if (isAuthLoading) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-3xl mx-auto text-center py-12">
          <div className="inline-flex items-center gap-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p>Проверка доступа...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!isAuth) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} size="icon">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">
                Заявка на съемку мероприятия
              </h1>
              <p className="text-sm text-muted-foreground">
                Доступно только представителям организаций и администраторам
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Чтобы создать заявку на съемку мероприятия, войдите в аккаунт
              представителя организации.
            </p>
            <Button onClick={() => router.push("/login")}>Войти</Button>
          </div>
        </div>
      </main>
    );
  }

  if (!canCreateEvent(user?.role)) {
    return (
      <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => router.back()} size="icon">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">
                Заявка на съемку мероприятия
              </h1>
              <p className="text-sm text-muted-foreground">
                Доступно только представителям организаций и администраторам
              </p>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-6 text-center space-y-4">
            <p className="text-muted-foreground">
              Для членов GUtv эта форма недоступна. Только представители
              организаций и администраторы могут создавать event-заявки.
            </p>
            <Button onClick={() => router.push("/")}>
              Вернуться на главную
            </Button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="bg-background px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => router.back()} size="icon">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold">
              Заявка на съемку мероприятия
            </h1>
            <p className="text-sm text-muted-foreground">
              Доступно только представителям организаций и администраторам
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-4"
        >
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-4 py-3 text-green-800 dark:text-green-200">
              <p className="text-sm font-semibold">Заявка отправлена</p>
              <p className="mt-1 text-sm text-green-700/90 dark:text-green-200/90">
                {successMessage}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Причина / описание</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Что это за съемка или мероприятие"
              rows={4}
              disabled={loading}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Начало</Label>
              <Input
                id="startTime"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">Окончание</Label>
              <Input
                id="endTime"
                type="datetime-local"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={loading}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Комментарий</Label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Дополнительные детали"
              rows={3}
              disabled={loading}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button type="submit" disabled={loading}>
              <CalendarPlus className="w-4 h-4 mr-2" />
              {loading ? "Отправка..." : "Отправить заявку"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/")}
              disabled={loading}
            >
              Вернуться на главную
            </Button>
          </div>
        </form>
      </div>
    </main>
  );
}

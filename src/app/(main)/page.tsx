"use client";

import { CalendarPlus, ClipboardList, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { canCreateEvent } from "@/lib/roles";

export default function HomePage() {
  const { user, isAuth } = useAuth();
  const canOpenEvent = canCreateEvent(user?.role);

  return (
    <main className="bg-background px-4 py-8 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8">
      <div className="max-w-5xl mx-auto space-y-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card/60 p-8 md:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.12),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.1),transparent_30%)]" />
          <div className="relative space-y-5">
            <div className="space-y-3">
              <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
                Сервис для подачи заявок на съемку мероприятий
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
                Оставляйте заявку на съемкуза пару минут и отслеживайте ее
                статус
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              {canOpenEvent ? (
                <Button asChild size="lg">
                  <Link href="/event">
                    <CalendarPlus className="mr-2 h-4 w-4" />
                    Создать заявку
                  </Link>
                </Button>
              ) : isAuth ? (
                <Button asChild size="lg" variant="outline">
                  <Link href="/dashboard/profile">Открыть профиль</Link>
                </Button>
              ) : (
                <>
                  <Button asChild size="lg">
                    <Link href="/register">Регистрация</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Войти</Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <CalendarPlus className="mb-3 h-5 w-5 text-primary" />
            <h2 className="font-semibold">Быстрое оформление</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Заполните основные данные о мероприятии и отправьте заявку на
              рассмотрение.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <ClipboardList className="mb-3 h-5 w-5 text-primary" />
            <h2 className="font-semibold">Понятный статус</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Все поданные заявки собраны в личном кабинете, где удобно следить
              за изменениями и текущим этапом обработки.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <ShieldCheck className="mb-3 h-5 w-5 text-primary" />
            <h2 className="font-semibold">Безопасный доступ</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              У каждого пользователя свой личный кабинет, где можно
              просматривать свои заявки.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

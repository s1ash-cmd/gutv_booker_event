"use client";

import { Calendar, Users } from "lucide-react";
import Link from "next/link";
import { AdminOnly } from "@/components/AdminOnly";
import { Button } from "@/components/ui/button";

export default function DashboardHome() {
  return (
    <AdminOnly>
      <main className="p-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="rounded-2xl border border-border bg-card/60 p-8">
            <h1 className="text-3xl font-bold">Панель управления event</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Здесь остались только заявки на мероприятия и управление
              пользователями.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card/50 p-6">
              <Calendar className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">Все заявки</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Просмотр, фильтрация и обработка заявок на мероприятия.
              </p>
              <Button asChild className="mt-4">
                <Link href="/dashboard/events">Открыть заявки</Link>
              </Button>
            </div>

            <div className="rounded-2xl border border-border bg-card/50 p-6">
              <Users className="mb-3 h-5 w-5 text-primary" />
              <h2 className="font-semibold">Пользователи</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Управление ролями, блокировкой и данными учетных записей.
              </p>
              <Button asChild className="mt-4" variant="outline">
                <Link href="/dashboard/users">Открыть пользователей</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
    </AdminOnly>
  );
}

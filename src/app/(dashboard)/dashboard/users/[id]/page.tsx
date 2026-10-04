"use client";
import { ChevronLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import { AdminOnly } from "@/components/AdminOnly";
import { ErrorMessage } from "@/components/ErrorMessage";
import { EventListPage } from "@/components/EventListPage";
import { ProfileCard } from "@/components/profile/ProfileCard";
import styles from "@/components/profile/ProfileLayout.module.css";
import { Button } from "@/components/ui/button";
import type { EventPage } from "@/lib/eventApi";
import { userApi } from "@/lib/userApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = Number(params.id);
  const [summary, setSummary] = useState<EventPage["summary"] | null>(null);
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setUser(null);
    setSummary(null);
    const load = async () => {
      try {
        if (!Number.isSafeInteger(userId) || userId < 1)
          throw new Error("Некорректный идентификатор пользователя");
        const data = await userApi.get_by_id(userId);
        if (active) setUser(data);
      } catch (err) {
        if (active)
          setError(getErrorMessage(err, "Не удалось загрузить пользователя"));
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [userId]);
  return (
    <AdminOnly>
      <main
        className={`${styles.page} pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8`}
      >
        <div className="flex items-center gap-3 mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            aria-label="Назад"
          >
            <ChevronLeft size={18} />
          </Button>
          <h1 className="text-2xl font-semibold">Профиль пользователя</h1>
        </div>
        {error && <ErrorMessage message={error} />}
        {loading ? (
          <output>Загрузка пользователя…</output>
        ) : (
          user && (
            <div className={styles.grid}>
              <div className={styles.panels}>
                <ProfileCard user={user} showStatus />
                <section className={styles.panel}>
                  <h2 className="font-semibold mb-4">Данные представителя</h2>
                  <dl className="space-y-4 text-sm">
                    <div>
                      <dt className="text-muted-foreground">Организация</dt>
                      <dd className="break-words">
                        {user.organization || "Не указана"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Контакты</dt>
                      <dd className="break-words">
                        {user.representativeContacts || "Не указаны"}
                      </dd>
                    </div>
                  </dl>
                </section>
                {summary && (
                  <section className={styles.panel}>
                    <h2 className="font-semibold mb-4">Статистика заявок</h2>
                    <dl className="space-y-3 text-sm">
                      {(
                        [
                          ["total", "Всего"],
                          ["Pending", "Ожидают"],
                          ["Approved", "Одобрены"],
                          ["Cancelled", "Отменены"],
                          ["Completed", "Завершены"],
                        ] as const
                      ).map(([key, label]) => (
                        <div key={key} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{label}</dt>
                          <dd>{summary[key]}</dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                )}
              </div>
              <EventListPage
                key={userId}
                scope="user"
                userId={userId}
                title="Заявки пользователя"
                onSummary={setSummary}
              />
            </div>
          )
        )}
      </main>
    </AdminOnly>
  );
}

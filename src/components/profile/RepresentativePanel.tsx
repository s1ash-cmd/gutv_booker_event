"use client";
import { useState } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import { ErrorMessage } from "@/components/ErrorMessage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { userApi } from "@/lib/userApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
import styles from "./ProfileLayout.module.css";
export function RepresentativePanel({
  user,
  onSaved,
}: {
  user: UserResponseDto;
  onSaved: (user: UserResponseDto) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  return (
    <section className={styles.panel} aria-label="Данные представителя">
      <div className={styles.sectionTitle}>
        <h2>Данные представителя</h2>
      </div>
      <p className={`${styles.secondary} mb-5`}>
        Укажите один раз. Эти данные автоматически попадут в новые заявки. Ранее
        поданные заявки сохранят прежние данные.
      </p>
      <form
        key={`${user.name}:${user.organization}:${user.representativeContacts}`}
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setBusy(true);
          setError(null);
          setSaved(false);
          try {
            onSaved(
              await userApi.update_profile({
                name: String(data.get("name")),
                organization: String(data.get("organization")),
                representativeContacts: String(
                  data.get("representativeContacts"),
                ),
              }),
            );
            setSaved(true);
          } catch (err) {
            setError(getErrorMessage(err, "Не удалось сохранить данные"));
          } finally {
            setBusy(false);
          }
        }}
      >
        {(
          [
            ["name", "ФИО представителя", user.name, 200],
            ["organization", "Организация", user.organization, 300],
            [
              "representativeContacts",
              "Контакты представителя",
              user.representativeContacts,
              1000,
            ],
          ] as const
        ).map(([field, label, value, max]) => (
          <div key={field} className="space-y-2">
            <Label htmlFor={`profile-${field}`}>{label}</Label>
            <Input
              id={`profile-${field}`}
              name={field}
              defaultValue={value}
              required
              minLength={2}
              maxLength={max}
              disabled={busy}
              onChange={() => setSaved(false)}
            />
          </div>
        ))}
        {error && <ErrorMessage message={error} />}
        <div className="flex items-center gap-4">
          <Button disabled={busy}>
            {busy ? "Сохранение…" : "Сохранить данные"}
          </Button>
          {saved && (
            <output className="text-sm text-muted-foreground">
              Данные сохранены
            </output>
          )}
        </div>
      </form>
    </section>
  );
}

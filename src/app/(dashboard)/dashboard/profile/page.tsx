"use client";
import { ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import { ErrorMessage } from "@/components/ErrorMessage";
import { AvatarEditor } from "@/components/profile/AvatarEditor";
import { ProfileCard } from "@/components/profile/ProfileCard";
import styles from "@/components/profile/ProfileLayout.module.css";
import { RepresentativePanel } from "@/components/profile/RepresentativePanel";
import { SessionsPanel } from "@/components/profile/SessionsPanel";
import { useAuth } from "@/contexts/AuthContext";
import { userApi } from "@/lib/userApi";
import { getErrorMessage } from "@/lib/userFacingMessages";
export default function ProfilePage() {
  const { setUser } = useAuth();
  const [userData, setUserData] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const version = useRef(0);
  const updateUser = (data: UserResponseDto) => {
    version.current += 1;
    setUserData(data);
    setUser({ ...data, id: String(data.id) });
  };
  useEffect(() => {
    let active = true;
    const load = async () => {
      const request = ++version.current;
      const current = () => active && version.current === request;
      try {
        const data = await userApi.get_me();
        if (current()) {
          setUserData(data);
          setUser({ ...data, id: String(data.id) });
          setError(null);
        }
      } catch (err) {
        if (current())
          setError(getErrorMessage(err, "Не удалось загрузить профиль"));
      } finally {
        if (current()) setLoading(false);
      }
    };
    void load();
    window.addEventListener("focus", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
    };
  }, [setUser]);
  if (loading)
    return (
      <output
        className="flex items-center justify-center min-h-screen"
        aria-live="polite"
      >
        Загрузка профиля…
      </output>
    );
  if (!userData)
    return (
      <div className="p-6">
        <ErrorMessage message={error ?? "Пользователь не найден"} />
      </div>
    );
  return (
    <div
      className={`${styles.page} pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-8`}
    >
      <div className={styles.pageTop}>
        <span className={styles.eyebrow}>Личный кабинет / Профиль</span>
        <Link href="/dashboard/events/my" className={styles.simpleLink}>
          Мои заявки <ArrowUpRight size={15} />
        </Link>
      </div>
      {error && <ErrorMessage message={error} className="mb-4" />}
      <div className={styles.grid}>
        <ProfileCard
          user={userData}
          onAvatarChange={() => setShowAvatarDialog(true)}
        />
        <div className={styles.panels}>
          <RepresentativePanel user={userData} onSaved={updateUser} />
          <SessionsPanel />
        </div>
      </div>
      <AvatarEditor
        user={userData}
        open={showAvatarDialog}
        onOpenChange={setShowAvatarDialog}
        onSaved={updateUser}
      />
    </div>
  );
}

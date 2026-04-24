"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import type { UserResponseDto } from "@/app/models/user/user";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarUrl } from "@/lib/avatar";
import { getRoleLabel, isAdminRole } from "@/lib/roles";
import { userApi } from "@/lib/userApi";
import { cn } from "@/lib/utils";

export default function Home() {
  const [userData, setUserData] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const data = await userApi.get_me();
        setUserData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ошибка загрузки данных");
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  const getInitials = (name: string) => {
    return name.substring(0, 1).toUpperCase();
  };

  if (loading) {
    return (
      <main className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </main>
    );
  }

  if (error || !userData) {
    return (
      <main className="flex items-center justify-center min-h-screen p-6">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <p className="text-muted-foreground">
            {error || "Пользователь не найден"}
          </p>
        </div>
      </main>
    );
  }

  const isAdmin = isAdminRole(userData.role);

  return (
    <main className="px-4 py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="overflow-hidden">
          <h1 className="text-2xl lg:text-3xl font-bold truncate">
            {userData.name}
          </h1>
          <p className="text-sm text-muted-foreground truncate">
            @{userData.login}
          </p>
        </div>

        <div className="grid xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-6">
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  {isAdmin && (
                    <div className="absolute -inset-0.5 bg-linear-to-r from-primary via-purple-500 to-primary rounded-full blur opacity-75"></div>
                  )}
                  <Avatar className="h-24 w-24 relative border-2 border-background">
                    <AvatarImage
                      src={getAvatarUrl(userData.login, userData.role)}
                      alt={userData.login}
                    />
                    <AvatarFallback
                      className={cn(
                        "text-2xl font-bold",
                        isAdmin && "bg-primary text-primary-foreground",
                      )}
                    >
                      {getInitials(userData.name)}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between py-3 border-b border-border gap-4">
                  <span className="text-sm text-muted-foreground font-medium">
                    Ник
                  </span>
                  <span className="text-base font-semibold text-right wrap-break-words">
                    {userData.name}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border gap-4">
                  <span className="text-sm text-muted-foreground font-medium">
                    Логин
                  </span>
                  <span className="text-base font-semibold text-right wrap-break-words">
                    {userData.login}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-border gap-4">
                  <span className="text-sm text-muted-foreground font-medium">
                    Роль
                  </span>
                  <span className="text-base font-semibold text-right">
                    {getRoleLabel(userData.role)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

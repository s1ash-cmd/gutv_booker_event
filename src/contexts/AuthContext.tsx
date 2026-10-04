"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { authApi } from "@/lib/authApi";
import { userApi } from "@/lib/userApi";

interface User {
  id: string;
  login: string;
  name: string;
  role: string;
  organization?: string;
  representativeContacts?: string;
  avatarSeed?: string | null;
  avatarUrl?: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuth: boolean;
  isLoading: boolean;
  logout: () => Promise<void>;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const generation = useRef(0);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const version = ++generation.current;
      const current = () => active && generation.current === version;
      try {
        if (!localStorage.getItem("access_token")) {
          if (current()) setUser(null);
          return;
        }
        const data = await userApi.get_me();
        if (current()) setUser({ ...data, id: String(data.id) });
      } catch {
        if (current()) setUser(null);
      } finally {
        if (current()) setIsLoading(false);
      }
    };
    void load();
    window.addEventListener("focus", load);
    window.addEventListener("storage", load);
    return () => {
      active = false;
      window.removeEventListener("focus", load);
      window.removeEventListener("storage", load);
    };
  }, []);

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
      window.location.replace("/");
    } catch {
      window.alert("Не удалось завершить сессию. Повторите выход.");
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuth: !!user, isLoading, logout, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

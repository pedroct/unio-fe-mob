import { createContext, useContext, useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { setAccessToken, setRefreshToken, getRefreshToken, apiFetch } from "./api";

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  is_active: boolean;
  criado_em: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bootDone = useRef(false);

  const fetchUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      const res = await apiFetch("/api/nucleo/eu");
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const boot = useCallback(async () => {
    if (bootDone.current) return;
    bootDone.current = true;

    const storedRefresh = getRefreshToken();
    if (!storedRefresh) {
      setIsLoading(false);
      return;
    }

    try {
      const refreshRes = await fetch("/api/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: storedRefresh }),
      });

      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setAccessToken(data.access);
        const u = await fetchUser();
        setUser(u);
      } else {
        setAccessToken(null);
        setRefreshToken(null);
        setUser(null);
      }
    } catch {
      setAccessToken(null);
      setRefreshToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchUser]);

  useEffect(() => {
    boot();
  }, [boot]);

  const refreshUser = useCallback(async () => {
    const u = await fetchUser();
    if (u) {
      setUser(u);
    } else {
      setUser(null);
      setAccessToken(null);
      setRefreshToken(null);
    }
  }, [fetchUser]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    const res = await fetch("/api/auth/pair", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.detail || data.error || "Erro ao fazer login.";
      setError(msg);
      throw new Error(msg);
    }
    setAccessToken(data.access);
    setRefreshToken(data.refresh);

    const u = await fetchUser();
    setUser(u);
  }, [fetchUser]);

  const register = useCallback(async (email: string, password: string, username?: string) => {
    setError(null);
    const res = await fetch("/api/nucleo/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        username: username || email.split("@")[0],
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data.mensagem || data.detail || data.error || "Erro ao criar conta.";
      setError(msg);
      throw new Error(msg);
    }
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    const refresh = getRefreshToken();
    if (refresh) {
      try {
        await fetch("/api/auth/blacklist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
      } catch {}
    }
    setAccessToken(null);
    setRefreshToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, error, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

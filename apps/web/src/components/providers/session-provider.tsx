"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import type { AuthUser, Role } from "@kidslearn/types";
import { api, setAccessToken } from "@/lib/api/client";

interface SessionValue {
  user: AuthUser | null;
  /** True until the silent refresh on boot has resolved. */
  loading: boolean;
  isAuthenticated: boolean;
  hasRole: (role: Role) => boolean;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: { name: string; email: string; password: string; locale?: string }) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionValue | null>(null);

interface SessionResponse {
  user: AuthUser;
  accessToken: string;
  expiresIn: number;
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const queryClient = useQueryClient();

  const adopt = useCallback((session: SessionResponse) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    return session.user;
  }, []);

  /**
   * On boot the access token is gone (it only ever lived in memory), so the
   * HttpOnly refresh cookie is exchanged for a new one. A failure here is the
   * normal "not signed in" case, not an error.
   */
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const refreshed = await api.refreshSession();
      if (cancelled) return;
      if (refreshed) {
        try {
          const me = await api.get<AuthUser>("/auth/me");
          if (!cancelled) setUser(me);
        } catch {
          if (!cancelled) setUser(null);
        }
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep the access token fresh a minute before it expires, so a long session
  // never shows a flash of "signed out" mid-task.
  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => void api.refreshSession(), 12 * 60_000);
    return () => window.clearInterval(timer);
  }, [user]);

  const signIn = useCallback(
    async (email: string, password: string) => {
      const session = await api.post<SessionResponse>("/auth/login", { email, password }, { skipAuthRetry: true });
      const signedIn = adopt(session);
      await queryClient.invalidateQueries();
      return signedIn;
    },
    [adopt, queryClient],
  );

  const register = useCallback(
    async (payload: { name: string; email: string; password: string; locale?: string }) => {
      const session = await api.post<SessionResponse>("/auth/register", payload, { skipAuthRetry: true });
      const registered = adopt(session);
      await queryClient.invalidateQueries();
      return registered;
    },
    [adopt, queryClient],
  );

  const signOut = useCallback(async () => {
    await api.post("/auth/logout").catch(() => undefined);
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
    router.push("/login");
  }, [queryClient, router]);

  const refresh = useCallback(async () => {
    const refreshed = await api.refreshSession();
    if (!refreshed) {
      setUser(null);
      return;
    }
    const me = await api.get<AuthUser>("/auth/me").catch(() => null);
    setUser(me);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      user,
      loading,
      isAuthenticated: user !== null,
      hasRole: (role: Role) => user?.role === role,
      signIn,
      register,
      signOut,
      refresh,
    }),
    [user, loading, signIn, register, signOut, refresh],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}

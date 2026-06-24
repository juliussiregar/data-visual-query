"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthUser } from "@/lib/session";

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
  configured: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    configured: true,
  });

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      const json = await res.json();
      setState({
        user: json.user ?? null,
        loading: false,
        configured: json.configured !== false,
      });
    } catch {
      setState({ user: null, loading: false, configured: true });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (username: string, password: string) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Login gagal");
    setState({ user: json.user, loading: false, configured: true });
    return json.user as AuthUser;
  }, []);

  const register = useCallback(
    async (username: string, password: string, name: string) => {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Registrasi gagal");
      setState({ user: json.user, loading: false, configured: true });
      return json.user as AuthUser;
    },
    []
  );

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setState((s) => ({ ...s, user: null }));
  }, []);

  return { ...state, login, register, logout, refresh };
}

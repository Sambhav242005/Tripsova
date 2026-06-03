"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo, startTransition } from "react";
import { api, setToken, clearToken, getToken, ApiError } from "@/lib/api";
import type { AuthUserResponse, LoginRequest, RegisterRequest } from "@/lib/types";

interface AuthState {
  user: AuthUserResponse | null;
  loading: boolean;
  error: string | null;
  login: (data: LoginRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  isAuth: boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function useInitialLoading(): boolean {
  const [loading] = useState(() => !!getToken());
  return loading;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    try {
      const u = await api.get<AuthUserResponse>("/api/auth/me");
      startTransition(() => setUser(u));
    } catch {
      clearToken();
      startTransition(() => setUser(null));
    } finally {
      startTransition(() => setLoading(false));
    }
  }, []);

  useEffect(() => {
    if (getToken()) {
      fetchMe();
    } else {
      startTransition(() => setLoading(false));
    }
  }, [fetchMe]);

  const login = useCallback(async (data: LoginRequest) => {
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await api.post<{ access_token: string; token_type: string }>("/api/auth/login", data);
      setToken(access_token);
      const u = await api.get<AuthUserResponse>("/api/auth/me");
      startTransition(() => setUser(u));
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : "Login failed";
      startTransition(() => setError(msg));
      throw e;
    } finally {
      startTransition(() => setLoading(false));
    }
  }, []);

  const register = useCallback(async (data: RegisterRequest) => {
    setError(null);
    setLoading(true);
    try {
      const { access_token } = await api.post<{ access_token: string; token_type: string }>("/api/auth/register", data);
      setToken(access_token);
      const u = await api.get<AuthUserResponse>("/api/auth/me");
      startTransition(() => setUser(u));
    } catch (e: unknown) {
      const msg = e instanceof ApiError ? e.message : "Registration failed";
      startTransition(() => setError(msg));
      throw e;
    } finally {
      startTransition(() => setLoading(false));
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user, loading, error, login, register, logout, isAuth: !!user,
  }), [user, loading, error, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

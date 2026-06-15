"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import type { Theme } from "@/data";
import type { AuthUserResponse } from "@/lib/types";
import { LIGHT, DARK, TRANSLATIONS } from "@/data";
import { AuthProvider, useAuth } from "./auth/auth-context";

interface AppState {
  dark: boolean;
  setDark: (v: boolean | ((prev: boolean) => boolean)) => void;
  tab: string;
  setTab: (id: string) => void;
  sub: string | null;
  setSub: (id: string | null) => void;
  dest: string | null;
  setDest: (id: string | null) => void;
  lang: string;
  setLang: (l: string) => void;
  drawerOpen: boolean;
  setDrawerOpen: (v: boolean) => void;
  t: Theme;
  T: (key: string) => string;
  isAuth: boolean;
  user: AuthUserResponse | null;
  loading: boolean;
}

const AppContext = createContext<AppState | null>(null);
const HTML_LANG: Record<string, string> = {
  English: "en",
  "\u0939\u093f\u0902\u0926\u0940": "hi",
  "\u0ba4\u0bae\u0bbf\u0bb4\u0bcd": "ta",
  "\u09ac\u09be\u0982\u09b2\u09be": "bn",
};

function AppInner({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [tab, setTab] = useState("home");
  const [sub, setSub] = useState<string | null>(null);
  const [dest, setDest] = useState<string | null>(null);
  const [lang, setLangState] = useState(() => {
    if (typeof window === "undefined") return "English";
    return localStorage.getItem("tripova_lang") || "English";
  });
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { isAuth, user, loading } = useAuth();

  const t = dark ? DARK : LIGHT;

  useEffect(() => {
    localStorage.setItem("tripova_lang", lang);
    document.documentElement.lang = HTML_LANG[lang] || "en";
  }, [lang]);

  const setLang = useCallback((l: string) => {
    setLangState(l);
  }, []);

  const T = useCallback((key: string) => {
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key;
  }, [lang]);

  const value = useMemo(() => ({
    dark, setDark, tab, setTab: (id: string) => { setTab(id); setSub(null); setDest(null); },
    sub, setSub, dest, setDest, lang, setLang, drawerOpen, setDrawerOpen, t, T, isAuth, user, loading,
  }), [dark, tab, sub, dest, lang, setLang, drawerOpen, t, T, isAuth, user, loading]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AppInner>{children}</AppInner>
    </AuthProvider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}

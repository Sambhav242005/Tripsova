"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import type { Theme } from "@/data";
import type { AuthUserResponse, FeedPostResponse, TripPodResponse } from "@/lib/types";
import { LIGHT, DARK, TRANSLATIONS } from "@/data";
import { AuthProvider, useAuth } from "./auth/auth-context";
import { TAB_PATH, SUB_PATH, DEST_PREFIX, parseRoute } from "./nav";

interface AppState {
  dark: boolean;
  setDark: (v: boolean | ((prev: boolean) => boolean)) => void;
  // tab/sub/dest are derived from the URL; the setters navigate via the router so
  // existing callers (side drawer, plan screen) keep working without changes.
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
  // Optimistic content created via the Create sheet, surfaced on the relevant screens.
  createdPosts: FeedPostResponse[];
  addCreatedPost: (post: FeedPostResponse) => void;
  addCreatedPod: (pod: TripPodResponse) => void;
}

const AppContext = createContext<AppState | null>(null);
const HTML_LANG: Record<string, string> = {
  English: "en",
  "हिंदी": "hi",
  "தமிழ்": "ta",
  "বাংলা": "bn",
};

function AppInner({ children }: { children: React.ReactNode }) {
  // `dark` and `lang` must start at their SSR defaults (light / English) so the first
  // client render matches the server-rendered HTML. Reading localStorage in the
  // initializer would diverge from SSR (the server can't see localStorage) and trip
  // React's hydration-mismatch warning. We adopt the persisted values in an effect
  // after mount instead; next-themes' pre-paint `.dark` class already drives
  // `var(--background)`, so the page background is correct before first paint.
  const [dark, setDark] = useState(false);
  const [lang, setLangState] = useState("English");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [createdPosts, setCreatedPosts] = useState<FeedPostResponse[]>([]);
  const [, setCreatedPods] = useState<TripPodResponse[]>([]);

  const pathname = usePathname();
  const router = useRouter();
  const { isAuth, user, loading } = useAuth();
  const { setTheme } = useTheme();

  const t = dark ? DARK : LIGHT;

  // Navigation now lives in the URL. Derive the active screen ids from the path,
  // and turn the legacy setters into router pushes so callers don't have to change.
  const { tab, sub, dest } = parseRoute(pathname);

  const goBackOrHome = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);

  const setTab = useCallback((id: string) => { router.push(TAB_PATH[id] ?? "/"); }, [router]);
  const setSub = useCallback((id: string | null) => {
    if (id) router.push(SUB_PATH[id] ?? "/");
    else goBackOrHome();
  }, [router, goBackOrHome]);
  const setDest = useCallback((id: string | null) => {
    if (id) router.push(`${DEST_PREFIX}${encodeURIComponent(id)}`);
    else goBackOrHome();
  }, [router, goBackOrHome]);

  const addCreatedPost = useCallback((post: FeedPostResponse) => {
    setCreatedPosts(prev => [...prev, post]);
  }, []);
  const addCreatedPod = useCallback((pod: TripPodResponse) => {
    setCreatedPods(prev => [...prev, pod]);
  }, []);

  // After mount, adopt persisted preferences. `hydrated` gates the persist effects
  // so they don't clobber stored values on the initial pass.
  useEffect(() => {
    // Deliberate post-mount adopt (see note above): reading localStorage here, not in
    // the initializer, is what keeps the first client render matching SSR.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDark(localStorage.getItem("tripova_theme") === "dark");
    setLangState(localStorage.getItem("tripova_lang") || "English");
    setHydrated(true);
  }, []);

  // Persist the theme choice and keep next-themes (the `class` on <html>) in sync,
  // so the marketing/SEO pages and the app share one source of truth.
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("tripova_theme", dark ? "dark" : "light");
    setTheme(dark ? "dark" : "light");
  }, [dark, hydrated, setTheme]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("tripova_lang", lang);
    document.documentElement.lang = HTML_LANG[lang] || "en";
  }, [lang, hydrated]);

  const setLang = useCallback((l: string) => {
    setLangState(l);
  }, []);

  const T = useCallback((key: string) => {
    return (TRANSLATIONS[lang] && TRANSLATIONS[lang][key]) || key;
  }, [lang]);

  const value = useMemo(() => ({
    dark, setDark, tab, setTab, sub, setSub, dest, setDest,
    lang, setLang, drawerOpen, setDrawerOpen, t, T, isAuth, user, loading,
    createdPosts, addCreatedPost, addCreatedPod,
  }), [
    dark, tab, setTab, sub, setSub, dest, setDest, lang, setLang, drawerOpen, t, T,
    isAuth, user, loading, createdPosts, addCreatedPost, addCreatedPod,
  ]);

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

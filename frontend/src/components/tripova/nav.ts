"use client";

// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for screen-id ↔ URL-path mapping.
//
// The app used to swap "screens" purely in client state (tab/sub/dest) and only
// mirror that into query params (`/?tab=discover`). Every screen now has a real
// route instead, so this module owns the id↔path translation that the provider,
// the shell chrome, the side drawer, and the per-route pages all share.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { JourneySeed } from "./screens/journey-screen";

/** Primary tabs (sidebar + bottom nav). */
export const TAB_PATH: Record<string, string> = {
  home: "/",
  discover: "/trip-pulse",
  purefind: "/purefind",
  pods: "/trippods",
  profile: "/profile",
};

/** Secondary "travel management" + utility screens (overlays). */
export const SUB_PATH: Record<string, string> = {
  plan: "/plan",
  journey: "/journey",
  route: "/route",
  transit: "/transit",
  budget: "/budget",
  maps: "/maps",
  settings: "/settings",
  support: "/support",
};

export const DEST_PREFIX = "/destination/";

const PATH_TO_TAB: Record<string, string> = Object.fromEntries(
  Object.entries(TAB_PATH).map(([id, path]) => [path, id]),
);
const PATH_TO_SUB: Record<string, string> = Object.fromEntries(
  Object.entries(SUB_PATH).map(([id, path]) => [path, id]),
);

export interface ParsedRoute {
  tab: string;
  sub: string | null;
  dest: string | null;
  /** The id of the screen currently shown — "dest" when on a destination page. */
  active: string;
  /** Sub-screens + destination pages render with a back button instead of a tab. */
  isOverlay: boolean;
}

/** Derive the active screen ids from a pathname (the inverse of TAB/SUB_PATH). */
export function parseRoute(pathname: string): ParsedRoute {
  if (pathname.startsWith(DEST_PREFIX)) {
    const dest = decodeURIComponent(pathname.slice(DEST_PREFIX.length));
    return { tab: "home", sub: null, dest, active: "dest", isOverlay: true };
  }
  const sub = PATH_TO_SUB[pathname] ?? null;
  if (sub) {
    // The trip-planner hub (/plan) is a primary destination reached from the main
    // "Plan a trip" CTA, so it shows the menu like a tab — not a back-button overlay.
    // The remaining sub-screens stay overlays (they're opened from within a flow).
    const isOverlay = sub !== "plan";
    return { tab: "home", sub, dest: null, active: sub, isOverlay };
  }
  const tab = PATH_TO_TAB[pathname] ?? "home";
  return { tab, sub: null, dest: null, active: tab, isOverlay: false };
}

/** Serialise a journey seed into shareable query params for `/journey`. */
export function seedToQuery(seed: Omit<JourneySeed, "key">): string {
  const p = new URLSearchParams();
  if (seed.origin) p.set("from", seed.origin);
  if (seed.destination) p.set("to", seed.destination);
  if (seed.people != null) p.set("people", String(seed.people));
  if (seed.budget != null) p.set("budget", String(seed.budget));
  if (seed.departure) p.set("departure", seed.departure);
  if (seed.autoPlan) p.set("auto", "1");
  if (seed.openJourneyId) p.set("open", seed.openJourneyId);
  return p.toString();
}

/** Reconstruct a journey seed from `/journey` query params (null ⇒ blank planner). */
export function queryToSeed(sp: URLSearchParams): JourneySeed | null {
  const origin = sp.get("from") ?? "";
  const destination = sp.get("to") ?? "";
  const openJourneyId = sp.get("open") ?? undefined;
  if (!origin && !destination && !openJourneyId) return null;
  const peopleRaw = sp.get("people");
  const budgetRaw = sp.get("budget");
  return {
    key: sp.toString(),
    origin,
    destination,
    people: peopleRaw ? Number(peopleRaw) : undefined,
    budget: budgetRaw ? Number(budgetRaw) : undefined,
    departure: sp.get("departure") ?? undefined,
    autoPlan: sp.get("auto") === "1",
    openJourneyId,
  };
}

/**
 * Router-backed navigation callbacks, shaped like the old AppShell handlers so
 * the screen components keep their existing `openDest` / `openJourney` props.
 */
export function useAppNav() {
  const router = useRouter();
  const goTab = useCallback((id: string) => router.push(TAB_PATH[id] ?? "/"), [router]);
  const goSub = useCallback((id: string) => router.push(SUB_PATH[id] ?? "/"), [router]);
  const openDest = useCallback(
    (id: string) => router.push(`${DEST_PREFIX}${encodeURIComponent(id)}`),
    [router],
  );
  const openJourney = useCallback(
    (seed: Omit<JourneySeed, "key">) => {
      const qs = seedToQuery(seed);
      router.push(qs ? `/journey?${qs}` : "/journey");
    },
    [router],
  );
  const back = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) router.back();
    else router.push("/");
  }, [router]);
  return { goTab, goSub, openDest, openJourney, back };
}

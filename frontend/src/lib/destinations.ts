"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import type { Destination } from "@/data";
import type { DestinationResponse, PaginatedList } from "@/lib/types";
import { api } from "@/lib/api";

// Stable gradient palette so destination tiles look consistent across screens
// without storing presentation colours in the backend.
const GRADIENT_POOL = [
  "linear-gradient(150deg,#2D4A45,#5A8A88)",
  "linear-gradient(150deg,#4A3F35,#8B6F4E)",
  "linear-gradient(150deg,#3D352A,#C4943A)",
  "linear-gradient(150deg,#2D4A45,#7BA89A)",
  "linear-gradient(150deg,#4A3A30,#A0805E)",
  "linear-gradient(150deg,#354540,#6A9A88)",
  "linear-gradient(150deg,#3A3530,#8A7A6A)",
  "linear-gradient(150deg,#2A4040,#6A9890)",
];

// Maps a backend destination to the UI Destination shape. Only real fields are
// used; counts the backend does not provide yet (trust/exploring/updates/guides)
// stay at 0 so the UI can hide them rather than invent numbers.
export function mapDestination(d: DestinationResponse, idx: number): Destination {
  return {
    id: d.slug || d.id,
    name: d.name,
    country: d.country,
    gradient: GRADIENT_POOL[idx % GRADIENT_POOL.length],
    trust: 0,
    exploring: 0,
    updates: 0,
    guides: 0,
    save: false,
    follow: false,
    safety: d.safety_summary || "",
    safetyLevel: "good",
    tagline: d.description
      ? d.description.slice(0, 80) + (d.description.length > 80 ? "..." : "")
      : d.best_time_to_visit || "",
    badges: (d.tags || []).slice(0, 3),
  };
}

// Module-level cache keyed by perPage. Dedupes the many useDestinations() callers
// (home, discover, plan…) plus React StrictMode's double-invoke into a single
// network request, and serves fresh results for a short TTL.
const CACHE_TTL = 30_000; // 30s
const destCache = new Map<number, { data: DestinationResponse[]; ts: number }>();
const destInflight = new Map<number, Promise<DestinationResponse[]>>();

function fetchDestinations(perPage: number, force: boolean): Promise<DestinationResponse[]> {
  if (!force) {
    const cached = destCache.get(perPage);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return Promise.resolve(cached.data);
    const pending = destInflight.get(perPage);
    if (pending) return pending;
  }
  const p = api
    .get<PaginatedList<DestinationResponse>>(`/api/destinations?page=1&per_page=${perPage}`)
    .then((res) => {
      destCache.set(perPage, { data: res.items, ts: Date.now() });
      return res.items;
    })
    .finally(() => { destInflight.delete(perPage); });
  destInflight.set(perPage, p);
  return p;
}

export function useDestinations(perPage = 20) {
  const [destinations, setDestinations] = useState<Destination[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (force: boolean) => {
    setError(null);
    setLoading(true);
    try {
      const items = await fetchDestinations(perPage, force);
      setDestinations(items.map((d, i) => mapDestination(d, i)));
    } catch {
      setError("Could not load destinations");
    } finally {
      setLoading(false);
    }
  }, [perPage]);

  // Explicit retry bypasses the cache for a fresh fetch.
  const reload = useCallback(() => load(true), [load]);

  useEffect(() => {
    startTransition(() => { load(false); });
  }, [load]);

  return { destinations, loading, error, reload };
}

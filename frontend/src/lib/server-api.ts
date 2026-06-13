// Server-side data fetching for SSR/SEO routes.
// NOTE: lib/api.ts is a client module (uses localStorage). Server Components and
// metadata/sitemap generation must use these helpers instead.

import { cache } from "react";
import type { DestinationResponse, PlaceResponse, PaginatedList } from "./types";

const API_BASE =
  process.env.API_URL_INTERNAL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "";

// Periodically revalidate server-rendered content (ISR).
const REVALIDATE_SECONDS = 300;

async function serverGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export const getDestinations = cache(async (): Promise<DestinationResponse[]> => {
  const data = await serverGet<PaginatedList<DestinationResponse>>(
    "/api/destinations?per_page=100",
  );
  return data?.items ?? [];
});

export const getDestination = cache(
  async (slug: string): Promise<DestinationResponse | null> =>
    serverGet<DestinationResponse>(
      `/api/destinations/${encodeURIComponent(slug)}`,
    ),
);

export const getDestinationPlaces = cache(
  async (destinationId: string): Promise<PlaceResponse[]> => {
    const data = await serverGet<PaginatedList<PlaceResponse>>(
      `/api/places?destination_id=${encodeURIComponent(destinationId)}&per_page=100`,
    );
    return data?.items ?? [];
  },
);

// Single place by UUID or slug (the API's get_place resolves either).
export const getPlace = cache(
  async (idOrSlug: string): Promise<PlaceResponse | null> =>
    serverGet<PlaceResponse>(`/api/places/${encodeURIComponent(idOrSlug)}`),
);

// Food places (restaurants & cafes) for the /food SSR routes and sitemap.
const FOOD_API_TYPES = ["RESTAURANT", "CAFE"];

export const getFoodPlaces = cache(async (): Promise<PlaceResponse[]> => {
  const lists = await Promise.all(
    FOOD_API_TYPES.map((type) =>
      serverGet<PaginatedList<PlaceResponse>>(
        `/api/places?type=${type}&per_page=100`,
      ),
    ),
  );
  return lists.flatMap((l) => l?.items ?? []);
});

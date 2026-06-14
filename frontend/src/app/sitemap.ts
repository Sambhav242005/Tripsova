import type { MetadataRoute } from "next";
import { getDestinations, getFoodPlaces } from "@/lib/server-api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tripsova.com";

// Render at request time, not at build. The sitemap pulls live data from the
// backend (via API_URL_INTERNAL), which only exists when the stack is running --
// during `docker build` the backend is unreachable, so prerendering this route
// hangs every fetch until Next's 60s static-generation timeout and fails the
// build. force-dynamic defers generation to runtime where the backend is up.
export const dynamic = "force-dynamic";

// Dynamic: enumerates every traveller-verified destination and food place from the
// API so search engines can crawl the SSR content routes under /destinations/[slug]
// and /food/[slug].
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [destinations, food] = await Promise.all([
    getDestinations(),
    getFoodPlaces(),
  ]);

  const destinationUrls: MetadataRoute.Sitemap = destinations.map((d) => ({
    url: `${SITE_URL}/destinations/${d.slug}`,
    lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const foodUrls: MetadataRoute.Sitemap = food.map((p) => ({
    url: `${SITE_URL}/food/${p.slug}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  return [
    { url: SITE_URL, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    {
      url: `${SITE_URL}/destinations`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    { url: `${SITE_URL}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    ...destinationUrls,
    ...foodUrls,
  ];
}

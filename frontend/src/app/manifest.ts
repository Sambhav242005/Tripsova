import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Tripsova — Discover through people",
    short_name: "Tripsova",
    description:
      "Traveller-verified destinations, AI trip planning, verified companions, diet-aware food, and offline trip packs.",
    start_url: "/",
    display: "standalone",
    background_color: "#FAF9F6",
    theme_color: "#1B263B",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}

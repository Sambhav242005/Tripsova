import type { Metadata } from "next";
import Link from "next/link";
import { getDestinations } from "@/lib/server-api";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tripsova.com";

const C = {
  bg: "#FAF9F6",
  card: "#FFFFFF",
  navy: "#1B263B",
  gold: "#B0894A",
  text: "#2E2E2E",
  muted: "#6E7681",
  border: "#E4E2DC",
  teal: "#5E8295",
};

export const metadata: Metadata = {
  title: "Destinations",
  description:
    "Explore traveller-verified destinations across India — safety, best time to visit, top places and food, all powered by real travellers.",
  alternates: { canonical: `${SITE_URL}/destinations` },
  openGraph: {
    title: "Destinations | Tripsova",
    description:
      "Explore traveller-verified destinations across India — powered by real travellers.",
    url: `${SITE_URL}/destinations`,
    type: "website",
  },
};

function locationLine(d: { city?: string; state?: string; country?: string }): string {
  return [d.city, d.state, d.country].filter(Boolean).join(", ");
}

export default async function DestinationsIndexPage() {
  const destinations = await getDestinations();

  return (
    <main
      style={{
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
        fontFamily: "var(--font-manrope), system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "40px 20px 80px" }}>
        <nav style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>
          <Link href="/" style={{ color: C.muted, textDecoration: "none" }}>
            Home
          </Link>
          {" / "}
          <span style={{ color: C.navy }}>Destinations</span>
        </nav>

        <header style={{ marginBottom: 32 }}>
          <h1
            style={{
              fontFamily: "var(--font-dm-serif), Georgia, serif",
              fontSize: 42,
              color: C.navy,
              margin: "0 0 10px",
              lineHeight: 1.1,
            }}
          >
            Destinations
          </h1>
          <p style={{ fontSize: 16, color: C.muted, margin: 0, maxWidth: 620, lineHeight: 1.6 }}>
            Traveller-verified guides with real safety updates, the best time to visit,
            top places and diet-aware food — for every destination.
          </p>
        </header>

        {destinations.length === 0 ? (
          <p style={{ color: C.muted }}>Destinations are being added. Check back soon.</p>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: 18,
            }}
          >
            {destinations.map((d) => {
              const loc = locationLine(d);
              return (
                <Link
                  key={d.id}
                  href={`/destinations/${d.slug}`}
                  style={{
                    display: "block",
                    background: C.card,
                    border: `1px solid ${C.border}`,
                    borderRadius: 16,
                    overflow: "hidden",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  {d.photos?.[0] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={d.photos[0]}
                      alt={d.name}
                      style={{ width: "100%", height: 150, objectFit: "cover" }}
                    />
                  )}
                  <div style={{ padding: 16 }}>
                    <h2
                      style={{
                        fontFamily: "var(--font-dm-serif), Georgia, serif",
                        fontSize: 20,
                        color: C.navy,
                        margin: "0 0 4px",
                      }}
                    >
                      {d.name}
                    </h2>
                    {loc && (
                      <p style={{ fontSize: 13, color: C.teal, margin: "0 0 8px" }}>{loc}</p>
                    )}
                    {d.description && (
                      <p
                        style={{
                          fontSize: 14,
                          color: C.muted,
                          margin: 0,
                          lineHeight: 1.55,
                          display: "-webkit-box",
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {d.description}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <p style={{ marginTop: 48, fontSize: 13, color: C.muted }}>Powered by Travellers</p>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDestination, getDestinationPlaces } from "@/lib/server-api";
import { HomeCrumb } from "@/components/tripova/home-crumb";
import type { DestinationResponse, PlaceResponse } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tripsova.com";

const C = {
  bg: "#FAF9F6",
  card: "#FFFFFF",
  navy: "#1B263B",
  gold: "#8A6A2E",
  goldFill: "#D4B483",
  text: "#2E2E2E",
  muted: "#636A75",
  border: "#E4E2DC",
  teal: "#5E8295",
  tag: "#EFEDE8",
};

const FOOD_TYPES = new Set(["RESTAURANT", "CAFE"]);
const HIDDEN_TYPES = new Set(["EMERGENCY"]);

type Props = { params: Promise<{ slug: string }> };

function locationLine(d: DestinationResponse): string {
  return [d.city, d.state, d.country].filter(Boolean).join(", ");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const dest = await getDestination(slug);
  if (!dest) {
    return { title: "Destination not found", robots: { index: false, follow: false } };
  }
  const loc = locationLine(dest);
  const title = `${dest.name} Travel Guide${dest.state ? `, ${dest.state}` : ""}`;
  const description = (
    dest.description ||
    `Plan your trip to ${dest.name}${loc ? ` in ${loc}` : ""} with traveller-verified places, food, safety tips and the best time to visit.`
  ).slice(0, 160);
  const url = `${SITE_URL}/destinations/${dest.slug}`;
  const images = dest.photos && dest.photos.length ? [dest.photos[0]] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | Tripsova`, description, url, type: "article", images },
    twitter: { card: "summary_large_image", title: `${title} | Tripsova`, description, images },
  };
}

function PlaceList({ places }: { places: PlaceResponse[] }) {
  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
      {places.map((p) => (
        <li
          key={p.id}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "12px 14px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 700, color: C.navy, fontSize: 15 }}>{p.name}</span>
            <span
              style={{
                marginLeft: 8,
                fontSize: 11,
                fontWeight: 600,
                color: C.teal,
                background: C.tag,
                padding: "2px 8px",
                borderRadius: 6,
                textTransform: "capitalize",
              }}
            >
              {p.type.toLowerCase().replace(/_/g, " ")}
            </span>
          </div>
          {p.external_rating != null && (
            <span style={{ fontSize: 13, color: C.gold, fontWeight: 700, whiteSpace: "nowrap" }}>
              ★ {(p.external_rating / 20).toFixed(1)}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default async function DestinationDetailPage({ params }: Props) {
  const { slug } = await params;
  const dest = await getDestination(slug);
  if (!dest) notFound();

  const places = await getDestinationPlaces(dest.id);
  const sorted = [...places].sort(
    (a, b) => (b.tripova_score ?? 0) - (a.tripova_score ?? 0),
  );
  const attractions = sorted
    .filter((p) => !FOOD_TYPES.has(p.type) && !HIDDEN_TYPES.has(p.type))
    .slice(0, 12);
  const food = sorted.filter((p) => FOOD_TYPES.has(p.type)).slice(0, 8);

  const loc = locationLine(dest);
  const url = `${SITE_URL}/destinations/${dest.slug}`;

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "TouristDestination",
    name: dest.name,
    url,
    ...(dest.description ? { description: dest.description } : {}),
    ...(dest.photos?.length ? { image: dest.photos } : {}),
    ...(dest.latitude != null && dest.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: dest.latitude,
            longitude: dest.longitude,
          },
        }
      : {}),
    address: {
      "@type": "PostalAddress",
      ...(dest.city ? { addressLocality: dest.city } : {}),
      ...(dest.state ? { addressRegion: dest.state } : {}),
      ...(dest.country ? { addressCountry: dest.country } : {}),
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Destinations", item: `${SITE_URL}/destinations` },
      { "@type": "ListItem", position: 3, name: dest.name, item: url },
    ],
  };

  const facts: { label: string; value?: string | null }[] = [
    { label: "Best time to visit", value: dest.best_time_to_visit },
    { label: "Crowd level", value: dest.crowd_level },
    { label: "Internet", value: dest.internet_quality },
    {
      label: "Typical budget",
      value:
        dest.average_budget_min != null && dest.average_budget_max != null
          ? `₹${dest.average_budget_min.toLocaleString("en-IN")} – ₹${dest.average_budget_max.toLocaleString("en-IN")}`
          : null,
    },
  ];
  const shownFacts = facts.filter((f) => f.value);

  return (
    <main
      style={{
        background: C.bg,
        color: C.text,
        minHeight: "100vh",
        fontFamily: "var(--font-manrope), system-ui, sans-serif",
      }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div style={{ maxWidth: 880, margin: "0 auto", padding: "32px 20px 80px" }}>
        <nav style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
          <HomeCrumb color={C.muted} />
          {" / "}
          <Link href="/destinations" style={{ color: C.muted, textDecoration: "none" }}>
            Destinations
          </Link>
          {" / "}
          <span style={{ color: C.navy }}>{dest.name}</span>
        </nav>

        <header style={{ marginBottom: 24 }}>
          <h1
            style={{
              fontFamily: "var(--font-dm-serif), Georgia, serif",
              fontSize: 40,
              color: C.navy,
              margin: "0 0 8px",
              lineHeight: 1.1,
            }}
          >
            {dest.name}
          </h1>
          {loc && <p style={{ color: C.teal, fontSize: 15, margin: 0 }}>{loc}</p>}
        </header>

        {dest.photos?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={dest.photos[0]}
            alt={dest.name}
            style={{
              width: "100%",
              height: 320,
              objectFit: "cover",
              borderRadius: 18,
              marginBottom: 28,
            }}
          />
        )}

        {dest.description && (
          <section style={{ marginBottom: 28 }}>
            <p style={{ fontSize: 17, lineHeight: 1.7, color: C.text, margin: 0 }}>
              {dest.description}
            </p>
          </section>
        )}

        {shownFacts.length > 0 && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: 12,
              marginBottom: 32,
            }}
          >
            {shownFacts.map((f) => (
              <div
                key={f.label}
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  padding: "12px 14px",
                }}
              >
                <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {f.label}
                </div>
                <div style={{ fontSize: 15, color: C.navy, fontWeight: 600, marginTop: 4 }}>
                  {f.value}
                </div>
              </div>
            ))}
          </section>
        )}

        {dest.safety_summary && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 24, color: C.navy, margin: "0 0 10px" }}>
              Safety
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.7, color: C.text, margin: 0 }}>
              {dest.safety_summary}
            </p>
          </section>
        )}

        {attractions.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 24, color: C.navy, margin: "0 0 14px" }}>
              Top places to visit in {dest.name}
            </h2>
            <PlaceList places={attractions} />
          </section>
        )}

        {food.length > 0 && (
          <section style={{ marginBottom: 32 }}>
            <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 24, color: C.navy, margin: "0 0 14px" }}>
              Where to eat in {dest.name}
            </h2>
            <PlaceList places={food} />
          </section>
        )}

        <section
          style={{
            background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`,
            borderRadius: 18,
            padding: "24px 22px",
            color: "#fff",
            marginTop: 8,
          }}
        >
          <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 22, margin: "0 0 6px", color: "#fff" }}>
            Plan your {dest.name} trip
          </h2>
          <p style={{ fontSize: 14, opacity: 0.9, margin: "0 0 16px", lineHeight: 1.6 }}>
            Get an AI itinerary, verified companions and an offline pack — built from real traveller updates.
          </p>
          <Link
            href="/login"
            style={{
              display: "inline-block",
              background: C.goldFill,
              color: C.navy,
              fontWeight: 700,
              fontSize: 14,
              padding: "10px 20px",
              borderRadius: 10,
              textDecoration: "none",
            }}
          >
            Open Tripsova
          </Link>
        </section>

        <p style={{ marginTop: 40, fontSize: 13, color: C.muted }}>Powered by Travellers</p>
      </div>
    </main>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getPlace } from "@/lib/server-api";
import type { PlaceResponse } from "@/lib/types";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tripsova.com";

const C = {
  bg: "#FAF9F6",
  card: "#FFFFFF",
  navy: "#1B263B",
  gold: "#B0894A",
  goldFill: "#D4B483",
  text: "#2E2E2E",
  muted: "#6E7681",
  border: "#E4E2DC",
  teal: "#5E8295",
  tag: "#EFEDE8",
};

// API food types -> schema.org @type
const SCHEMA_TYPE: Record<string, string> = {
  RESTAURANT: "Restaurant",
  CAFE: "CafeOrCoffeeShop",
};
const FOOD_TYPES = new Set(Object.keys(SCHEMA_TYPE));

type Props = { params: Promise<{ slug: string }> };

function typeLabel(type: string): string {
  return type.toLowerCase().replace(/_/g, " ");
}

function ratingOutOfFive(p: PlaceResponse): number | null {
  // external_rating is stored on a 0-100 scale; convert to the familiar /5.
  return p.external_rating != null ? p.external_rating / 20 : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = await getPlace(slug);
  if (!place || !FOOD_TYPES.has(place.type)) {
    return { title: "Place not found", robots: { index: false, follow: false } };
  }
  const kind = typeLabel(place.type);
  const where = place.address ? ` — ${place.address}` : "";
  const title = `${place.name} — ${kind.charAt(0).toUpperCase() + kind.slice(1)}`;
  const description = (
    `${place.name} is a traveller-verified ${kind}${where}. ` +
    `See diet options, ratings and how to get there on Tripsova.`
  ).slice(0, 160);
  const url = `${SITE_URL}/food/${place.slug}`;
  const images = place.photos?.length ? [place.photos[0]] : undefined;
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title: `${title} | Tripsova`, description, url, type: "article", images },
    twitter: { card: "summary_large_image", title: `${title} | Tripsova`, description, images },
  };
}

export default async function FoodDetailPage({ params }: Props) {
  const { slug } = await params;
  const place = await getPlace(slug);
  if (!place || !FOOD_TYPES.has(place.type)) notFound();

  const url = `${SITE_URL}/food/${place.slug}`;
  const rating = ratingOutOfFive(place);
  const kind = typeLabel(place.type);

  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": SCHEMA_TYPE[place.type],
    name: place.name,
    url,
    ...(place.photos?.length ? { image: place.photos } : {}),
    ...(place.address ? { address: place.address } : {}),
    ...(place.phone ? { telephone: place.phone } : {}),
    ...(place.price_range ? { priceRange: place.price_range } : {}),
    ...(place.tags?.length ? { servesCuisine: place.tags } : {}),
    ...(place.latitude != null && place.longitude != null
      ? {
          geo: {
            "@type": "GeoCoordinates",
            latitude: place.latitude,
            longitude: place.longitude,
          },
        }
      : {}),
    ...(rating != null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.toFixed(1),
            bestRating: "5",
            ...(place.external_review_count
              ? { reviewCount: place.external_review_count }
              : {}),
          },
        }
      : {}),
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Food", item: `${SITE_URL}/destinations` },
      { "@type": "ListItem", position: 3, name: place.name, item: url },
    ],
  };

  const facts: { label: string; value?: string | null }[] = [
    { label: "Type", value: kind.charAt(0).toUpperCase() + kind.slice(1) },
    { label: "Price range", value: place.price_range },
    { label: "Rating", value: rating != null ? `★ ${rating.toFixed(1)} / 5` : null },
    {
      label: "Reviews",
      value: place.external_review_count
        ? place.external_review_count.toLocaleString("en-IN")
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

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px 80px" }}>
        <nav style={{ fontSize: 13, color: C.muted, marginBottom: 18 }}>
          <Link href="/" style={{ color: C.muted, textDecoration: "none" }}>
            Home
          </Link>
          {" / "}
          <Link href="/destinations" style={{ color: C.muted, textDecoration: "none" }}>
            Destinations
          </Link>
          {" / "}
          <span style={{ color: C.navy }}>{place.name}</span>
        </nav>

        <header style={{ marginBottom: 22 }}>
          <span
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: C.teal,
              background: C.tag,
              padding: "4px 10px",
              borderRadius: 8,
              textTransform: "capitalize",
            }}
          >
            {kind}
          </span>
          <h1
            style={{
              fontFamily: "var(--font-dm-serif), Georgia, serif",
              fontSize: 38,
              color: C.navy,
              margin: "10px 0 6px",
              lineHeight: 1.1,
            }}
          >
            {place.name}
          </h1>
          {place.address && (
            <p style={{ color: C.muted, fontSize: 15, margin: 0 }}>{place.address}</p>
          )}
        </header>

        {place.photos?.[0] && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={place.photos[0]}
            alt={place.name}
            style={{
              width: "100%",
              height: 300,
              objectFit: "cover",
              borderRadius: 18,
              marginBottom: 26,
            }}
          />
        )}

        {shownFacts.length > 0 && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              gap: 12,
              marginBottom: 28,
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

        {place.diet_tags?.length ? (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 22, color: C.navy, margin: "0 0 12px" }}>
              Diet options
            </h2>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {place.diet_tags.map((d) => (
                <span
                  key={d}
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.navy,
                    background: C.tag,
                    border: `1px solid ${C.border}`,
                    padding: "6px 12px",
                    borderRadius: 999,
                    textTransform: "capitalize",
                  }}
                >
                  {d.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </section>
        ) : null}

        {(place.phone || place.website) && (
          <section style={{ marginBottom: 28 }}>
            <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 22, color: C.navy, margin: "0 0 12px" }}>
              Contact
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
              {place.phone && (
                <li style={{ fontSize: 15 }}>
                  <span style={{ color: C.muted }}>Phone: </span>
                  <a href={`tel:${place.phone}`} style={{ color: C.teal, textDecoration: "none" }}>
                    {place.phone}
                  </a>
                </li>
              )}
              {place.website && (
                <li style={{ fontSize: 15 }}>
                  <span style={{ color: C.muted }}>Website: </span>
                  <a
                    href={place.website}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    style={{ color: C.teal, textDecoration: "none" }}
                  >
                    {place.website.replace(/^https?:\/\//, "")}
                  </a>
                </li>
              )}
            </ul>
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
            Eat well on your trip
          </h2>
          <p style={{ fontSize: 14, opacity: 0.9, margin: "0 0 16px", lineHeight: 1.6 }}>
            Tripsova surfaces diet-aware, traveller-verified food near you — with offline access when you need it.
          </p>
          <Link
            href="/app"
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

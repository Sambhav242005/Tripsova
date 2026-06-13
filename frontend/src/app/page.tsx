import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter, C } from "@/components/marketing/site-chrome";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tripsova.com";

export const metadata: Metadata = {
  title: "Tripsova — Discover through people",
  description:
    "Tripsova plans safer, smarter trips on traveller-verified ground truth: AI itineraries, diet-aware food (PureFind), verified companions (TripPods), TrustScore, and offline packs.",
  alternates: { canonical: "/" },
};

const serif = "var(--font-dm-serif), Georgia, serif";

function Hero() {
  return (
    <section
      style={{
        background: `radial-gradient(1200px 500px at 50% -10%, ${C.teal}22, transparent), ${C.bg}`,
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto", padding: "72px 20px 64px", textAlign: "center" }}>
        <span
          style={{
            display: "inline-block",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: C.gold,
            background: C.tag,
            border: `1px solid ${C.border}`,
            padding: "6px 14px",
            borderRadius: 999,
            marginBottom: 22,
          }}
        >
          Powered by Travellers
        </span>
        <h1
          style={{
            fontFamily: serif,
            fontWeight: 400,
            fontSize: "clamp(34px, 6vw, 58px)",
            lineHeight: 1.08,
            color: C.navy,
            margin: "0 0 18px",
          }}
        >
          Discover through people.
        </h1>
        <p
          style={{
            fontSize: "clamp(16px, 2.2vw, 20px)",
            lineHeight: 1.6,
            color: C.muted,
            maxWidth: 620,
            margin: "0 auto 30px",
          }}
        >
          Plan safer, smarter trips on real traveller ground truth — AI itineraries,
          diet-aware food, verified companions and offline packs. No ads, no fake
          reviews, just travellers helping travellers.
        </p>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link
            href="/app"
            style={{
              background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`,
              color: "#fff",
              fontWeight: 700,
              fontSize: 16,
              padding: "14px 28px",
              borderRadius: 12,
              textDecoration: "none",
            }}
          >
            Start planning — it&apos;s free
          </Link>
          <Link
            href="/destinations"
            style={{
              background: C.card,
              color: C.navy,
              fontWeight: 700,
              fontSize: 16,
              padding: "14px 28px",
              borderRadius: 12,
              textDecoration: "none",
              border: `1px solid ${C.border}`,
            }}
          >
            Explore destinations
          </Link>
        </div>
      </div>
    </section>
  );
}

function Stats() {
  const stats: [string, string][] = [
    ["100%", "Traveller-verified, never ads"],
    ["8 signals", "Behind every TrustScore"],
    ["Offline-first", "Works with no signal"],
    ["Diet-aware", "Jain · Vegan · Halal · more"],
  ];
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px 8px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 14,
        }}
      >
        {stats.map(([big, small]) => (
          <div
            key={small}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 14,
              padding: "18px 18px",
              textAlign: "center",
            }}
          >
            <div style={{ fontFamily: serif, fontSize: 26, color: C.navy }}>{big}</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>{small}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps: [string, string, string][] = [
    ["1", "Start with Where", "Tell Tripsova your destination — Manali, Goa, Spiti, Udaipur or anywhere you dream of."],
    ["2", "Add your trip", "Days, budget, who's coming, your interests and any diet needs (Jain, vegan, halal…)."],
    ["3", "Get your plan", "A costed, day-by-day itinerary with verified places, diet-aware food, safety notes and an offline pack."],
  ];
  return (
    <section id="how-it-works" style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 20px" }}>
      <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 4vw, 36px)", color: C.navy, textAlign: "center", margin: "0 0 8px" }}>
        How it works
      </h2>
      <p style={{ textAlign: "center", color: C.muted, fontSize: 16, margin: "0 auto 36px", maxWidth: 540 }}>
        From a single place name to a complete, trustworthy trip — in seconds.
      </p>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: 18,
        }}
      >
        {steps.map(([n, title, desc]) => (
          <div
            key={n}
            style={{
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 16,
              padding: "24px 22px",
            }}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`,
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: serif,
                fontSize: 20,
                marginBottom: 14,
              }}
            >
              {n}
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: C.navy, margin: "0 0 6px" }}>{title}</h3>
            <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.muted, margin: 0 }}>{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const feats: [string, string][] = [
    ["PureFind", "Diet-aware places and food ranked by trust and verification — never by who paid."],
    ["TrustScore", "Every update is weighted by the credibility of the traveller behind it, across 8 signals."],
    ["TripPods", "Find and travel with verified companions heading the same way as you."],
    ["AI trip planner", "A complete day-by-day itinerary with morning/afternoon/evening plans and live costs."],
    ["Offline packs", "Download your trip so maps, places and notes keep working with zero signal."],
    ["Safety first", "Real, recent safety and crowd updates from travellers actually on the ground."],
  ];
  return (
    <section style={{ background: C.card, borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "56px 20px" }}>
        <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 4vw, 36px)", color: C.navy, textAlign: "center", margin: "0 0 36px" }}>
          Everything you need for a trip you can trust
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 18,
          }}
        >
          {feats.map(([title, desc]) => (
            <div
              key={title}
              style={{
                background: C.bg,
                border: `1px solid ${C.border}`,
                borderRadius: 16,
                padding: "22px 20px",
              }}
            >
              <h3 style={{ fontSize: 17, fontWeight: 800, color: C.navy, margin: "0 0 8px" }}>{title}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.muted, margin: 0 }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section style={{ maxWidth: 760, margin: "0 auto", padding: "56px 20px" }}>
      <h2 style={{ fontFamily: serif, fontSize: "clamp(24px, 4vw, 32px)", color: C.navy, margin: "0 0 16px" }}>
        Why Tripsova exists
      </h2>
      <p style={{ fontSize: 16.5, lineHeight: 1.75, color: C.text, margin: "0 0 14px" }}>
        Travel decisions are still made on ads, paid placements and reviews you can&apos;t
        verify. Tripsova flips that: it&apos;s an India-first, globally scalable travel
        community where the people who&apos;ve actually been there are the source of truth.
      </p>
      <p style={{ fontSize: 16.5, lineHeight: 1.75, color: C.text, margin: 0 }}>
        Every place, every food spot and every safety note carries a TrustScore built
        from real traveller verification — so you can plan a trip that fits your budget,
        your diet and your safety, and have it work even when you&apos;re offline.
        That&apos;s what <strong>Discover through people</strong> means.
      </p>
      <p style={{ marginTop: 20 }}>
        <Link href="/about" style={{ color: C.teal, fontWeight: 700, textDecoration: "none" }}>
          More about Tripsova →
        </Link>
      </p>
    </section>
  );
}

function FinalCTA() {
  return (
    <section style={{ maxWidth: 1000, margin: "0 auto", padding: "8px 20px 64px" }}>
      <div
        style={{
          background: `linear-gradient(135deg, ${C.navy}, ${C.navy2})`,
          borderRadius: 22,
          padding: "clamp(32px, 5vw, 56px)",
          textAlign: "center",
          color: "#fff",
        }}
      >
        <h2 style={{ fontFamily: serif, fontSize: "clamp(26px, 4vw, 38px)", margin: "0 0 12px" }}>
          Your next trip, planned by people who&apos;ve been there.
        </h2>
        <p style={{ fontSize: 16, opacity: 0.85, maxWidth: 520, margin: "0 auto 26px", lineHeight: 1.6 }}>
          Start with where you want to go. Get a verified, diet-aware, offline-ready plan in seconds.
        </p>
        <Link
          href="/app"
          style={{
            display: "inline-block",
            background: C.goldFill,
            color: C.navy,
            fontWeight: 800,
            fontSize: 16,
            padding: "14px 30px",
            borderRadius: 12,
            textDecoration: "none",
          }}
        >
          Open Tripsova
        </Link>
      </div>
    </section>
  );
}

export default function LandingPage() {
  return (
    <main
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "var(--font-manrope), system-ui, sans-serif",
      }}
    >
      <SiteHeader />
      <Hero />
      <Stats />
      <HowItWorks />
      <Features />
      <About />
      <FinalCTA />
      <SiteFooter />
    </main>
  );
}

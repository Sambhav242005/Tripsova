import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter, C } from "@/components/marketing/site-chrome";

const serif = "var(--font-dm-serif), Georgia, serif";

export const metadata: Metadata = {
  title: "About",
  description:
    "Tripsova is an India-first, globally scalable travel community where real travellers are the source of truth — verified places, diet-aware food, companions and offline packs.",
  alternates: { canonical: "/about" },
};

const PRINCIPLES: [string, string][] = [
  ["People over paid placement", "Rankings come from traveller trust and verification."],
  ["Trust is earned", "Every contribution is weighted by a TrustScore built from real traveller credibility."],
  ["Inclusive by design", "Diet-aware discovery for Jain, pure-veg, vegan, halal, gluten-free, sattvic and more."],
  ["Works anywhere", "Offline-first packs mean your trip keeps working even with no signal."],
];

const WHAT_WE_DO: [string, string][] = [
  ["PureFind", "Diet-aware places and food, ranked by trust and traveller verification."],
  ["TrustScore", "A credibility score behind every place, food spot and safety update."],
  ["TripPods", "Verified travel companions heading the same way as you."],
  ["AI itineraries", "Costed, day-by-day plans tuned to your budget, diet and style."],
  ["Offline packs", "Download a trip and use it with zero connectivity."],
  ["Community feed", "Live, on-the-ground updates on safety, crowds, weather and prices."],
];

export default function AboutPage() {
  return (
    <main
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "var(--font-manrope), system-ui, sans-serif",
      }}
    >
      <SiteHeader />

      <header style={{ maxWidth: 760, margin: "0 auto", padding: "56px 20px 8px" }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1.4,
            textTransform: "uppercase",
            color: C.gold,
          }}
        >
          About Tripsova
        </span>
        <h1 style={{ fontFamily: serif, fontSize: "clamp(30px, 5vw, 46px)", color: C.navy, lineHeight: 1.1, margin: "10px 0 16px" }}>
          Discover through people.
        </h1>
        <p style={{ fontSize: 17.5, lineHeight: 1.75, color: C.text, margin: 0 }}>
          Tripsova is a travel platform built on a simple belief: the best travel advice
          comes from real travellers, not paid placement. We&apos;re an India-first, globally
          scalable community where verified people — not paid placements — are the source
          of truth for where to go, what to eat and how to stay safe.
        </p>
      </header>

      {/* Mission */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "32px 20px" }}>
        <h2 style={{ fontFamily: serif, fontSize: 26, color: C.navy, margin: "0 0 12px" }}>Our mission</h2>
        <p style={{ fontSize: 16.5, lineHeight: 1.75, margin: 0 }}>
          To make every trip safer, fairer and more personal by turning real traveller
          experience into trustworthy, actionable guidance — accessible to everyone,
          whatever their budget, diet or destination, online or off.
        </p>
      </section>

      {/* Principles */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "16px 20px 8px" }}>
        <h2 style={{ fontFamily: serif, fontSize: 26, color: C.navy, margin: "0 0 18px", textAlign: "center" }}>
          What we stand for
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {PRINCIPLES.map(([t, d]) => (
            <div key={t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 18px" }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>{t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.muted, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* What we do */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 20px" }}>
        <h2 style={{ fontFamily: serif, fontSize: 26, color: C.navy, margin: "0 0 18px", textAlign: "center" }}>
          What we do
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {WHAT_WE_DO.map(([t, d]) => (
            <div key={t} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: "20px 18px" }}>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: C.navy, margin: "0 0 6px" }}>{t}</h3>
              <p style={{ fontSize: 14.5, lineHeight: 1.6, color: C.muted, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px 8px" }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`,
            borderRadius: 20,
            padding: "clamp(28px, 4vw, 44px)",
            color: "#fff",
          }}
        >
          <h2 style={{ fontFamily: serif, fontSize: 26, margin: "0 0 10px", color: "#fff" }}>Get in touch</h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.7, opacity: 0.9, margin: "0 0 18px" }}>
            Questions, partnerships or feedback? We&apos;d love to hear from travellers and
            teams who want to build a more trustworthy way to travel.
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8, fontSize: 15.5 }}>
            <li>General: <a href="mailto:tripsova.app@gmail.com" style={{ color: C.goldFill, textDecoration: "none", fontWeight: 700 }}>tripsova.app@gmail.com</a></li>
            <li>Support: <a href="mailto:tripsova.app@gmail.com" style={{ color: C.goldFill, textDecoration: "none", fontWeight: 700 }}>tripsova.app@gmail.com</a></li>
            <li>Partnerships: <a href="mailto:tripsova.app@gmail.com" style={{ color: C.goldFill, textDecoration: "none", fontWeight: 700 }}>tripsova.app@gmail.com</a></li>
          </ul>
          <div style={{ marginTop: 22 }}>
            <Link
              href="/app"
              style={{
                display: "inline-block",
                background: C.goldFill,
                color: C.navy,
                fontWeight: 800,
                fontSize: 15,
                padding: "12px 24px",
                borderRadius: 10,
                textDecoration: "none",
              }}
            >
              Open Tripsova
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

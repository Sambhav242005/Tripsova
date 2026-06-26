import Link from "next/link";
import { LogoMark } from "@/components/tripova/logo";

// Shared brand palette for the public marketing + legal pages.
export const C = {
  bg: "#FAF9F6",
  card: "#FFFFFF",
  navy: "#1B263B",
  navy2: "#0F1722",
  gold: "#8A6A2E",
  goldFill: "#D4B483",
  text: "#2E2E2E",
  muted: "#636A75",
  border: "#E4E2DC",
  teal: "#5E8295",
  tag: "#EFEDE8",
};

const NAV = [
  { href: "/destinations", label: "Destinations" },
  { href: "/about", label: "About" },
  { href: "/privacy", label: "Privacy" },
];

export function SiteHeader() {
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "rgba(250,249,246,0.85)",
        backdropFilter: "blur(10px)",
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        <Link
          href="/welcome"
          style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none" }}
        >
          <LogoMark size={44} />
          <span style={{ fontWeight: 800, fontSize: 22, color: C.navy, letterSpacing: 0.2 }}>
            Tripsova
          </span>
        </Link>

        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="hidden sm:flex" style={{ alignItems: "center", gap: 4 }}>
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.muted,
                  textDecoration: "none",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                {n.label}
              </Link>
            ))}
          </span>
          <Link
            href="/login"
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "#fff",
              background: `linear-gradient(135deg, ${C.navy}, ${C.teal})`,
              padding: "9px 18px",
              borderRadius: 10,
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Open app
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const cols: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: "Product",
      links: [
        { href: "/login", label: "Open app" },
        { href: "/destinations", label: "Destinations" },
        { href: "/welcome#how-it-works", label: "How it works" },
      ],
    },
    {
      title: "Company",
      links: [
        { href: "/about", label: "About" },
        { href: "/about#contact", label: "Contact" },
      ],
    },
    {
      title: "Legal",
      links: [
        { href: "/privacy", label: "Privacy Policy" },
        { href: "/terms", label: "Terms of Service" },
      ],
    },
  ];

  return (
    <footer style={{ background: C.navy, color: "#fff", marginTop: 64 }}>
      <div
        style={{
          maxWidth: 1120,
          margin: "0 auto",
          padding: "48px 20px 32px",
          display: "flex",
          flexWrap: "wrap",
          gap: 40,
          justifyContent: "space-between",
        }}
      >
        <div style={{ maxWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
            <LogoMark size={44} />
            <span style={{ fontWeight: 800, fontSize: 20 }}>Tripsova</span>
          </div>
          <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.75, margin: 0 }}>
            Discover through people. Traveller-verified destinations, food and companions —
            so every trip is planned on real, trustworthy ground truth.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 40 }}>
          {cols.map((col) => (
            <div key={col.title}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: 1.2,
                  textTransform: "uppercase",
                  opacity: 0.6,
                  marginBottom: 12,
                }}
              >
                {col.title}
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 9 }}>
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      style={{ fontSize: 14, color: "#fff", opacity: 0.82, textDecoration: "none" }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
        <div
          style={{
            maxWidth: 1120,
            margin: "0 auto",
            padding: "18px 20px",
            display: "flex",
            flexWrap: "wrap",
            gap: 10,
            justifyContent: "space-between",
            fontSize: 13,
            opacity: 0.7,
          }}
        >
          <span>© {year} Tripsova. All rights reserved.</span>
          <span style={{ letterSpacing: 1, textTransform: "uppercase", fontSize: 11 }}>
            Powered by Travellers
          </span>
        </div>
      </div>
    </footer>
  );
}

import React from "react";
import { LogoMark } from "../logo";

// Fixed brand palette for the auth art panel. It stays navy/gold regardless of the
// app's light/dark theme so white text on it always clears contrast, and so the
// login/register screens visually match the marketing + welcome pages (which use
// the same navy/gold identity). The form column itself uses var(--background) and
// the themed `t` tokens, so the actual inputs still follow dark/light mode.
const BRAND = {
  navy: "#1B263B",
  navy2: "#0F1722",
  gold: "#D4B483",
  goldText: "#E7CF9E",
};

const serif = "var(--font-dm-serif), Georgia, serif";

const HIGHLIGHTS: [string, string][] = [
  ["PureFind", "Diet-aware food, verified by travellers"],
  ["TripPods", "Find verified companions going your way"],
  ["TrustScore", "Every place scored on real ground truth"],
];

/**
 * Split-screen wrapper for the login/register forms. On desktop (≥ md) it shows a
 * branded navy/gold art panel beside the form; on mobile the panel is hidden and
 * the form centres on its own (the form carries its own compact logo for that case).
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", display: "flex", background: "var(--background)" }}>
      {/* Brand art panel — desktop only */}
      <aside
        className="hidden md:flex"
        style={{
          flex: "1 1 0%",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "48px 44px",
          background: `radial-gradient(900px 460px at 12% -10%, ${BRAND.gold}24, transparent), linear-gradient(160deg, ${BRAND.navy}, ${BRAND.navy2})`,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <LogoMark size={40} />
          <span style={{ fontFamily: serif, fontSize: 24, letterSpacing: 1, color: "#fff" }}>Tripsova</span>
        </div>

        <div>
          <h2
            style={{
              fontFamily: serif,
              fontWeight: 400,
              fontSize: "clamp(30px, 3.2vw, 44px)",
              lineHeight: 1.12,
              margin: "0 0 16px",
              color: "#fff",
            }}
          >
            Discover through people.
          </h2>
          <p style={{ fontSize: 16, lineHeight: 1.6, color: "rgba(255,255,255,0.82)", maxWidth: 380, margin: 0 }}>
            Plan safer, smarter trips on real traveller ground truth — diet-aware food,
            verified companions, and trust you can actually see.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 30 }}>
            {HIGHLIGHTS.map(([title, desc]) => (
              <div key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: BRAND.gold, marginTop: 7, flexShrink: 0 }} />
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>{title}</div>
                  <div style={{ fontSize: 13.5, color: "rgba(255,255,255,0.7)" }}>{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: "uppercase", color: BRAND.goldText, fontWeight: 700 }}>
          Powered by Travellers
        </div>
      </aside>

      {/* Form column */}
      <div
        style={{
          flex: "1 1 0%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          minWidth: 0,
        }}
      >
        <div style={{ width: "100%", maxWidth: 420 }}>{children}</div>
      </div>
    </div>
  );
}

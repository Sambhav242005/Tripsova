"use client";

import React, { useState } from "react";
import type { Theme } from "@/data";
import { useDestinations } from "@/lib/destinations";
import { Icon } from "../icon";
import { SectionTitle, ScreenHeader } from "../primitives/index";

export function DiscoverScreen({ t, openDest }: { t: Theme; openDest: (id: string) => void }) {
  const [q, setQ] = useState("");
  const { destinations, loading, error, reload } = useDestinations();

  const data = destinations ?? [];
  const matches = data.filter(d =>
    q === "" ||
    d.name.toLowerCase().includes(q.toLowerCase()) ||
    d.country.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ padding: "12px 12px 16px" }}>
      <ScreenHeader t={t} eyebrow="Live destination signal" title="Trip Pulse" subtitle="Destinations ranked by real traveller activity." />
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
          <Icon name="Search" size={17} color={t.muted} />
        </span>
        <input
          aria-label="Search destinations"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search destinations — Bali, Spiti, Goa..."
          style={{
            width: "100%", padding: "14px 16px 14px 44px", borderRadius: 14,
            border: `1px solid ${t.border}`, background: t.card, color: t.text,
            fontSize: 14, outline: "2px solid transparent", outlineOffset: 2, boxSizing: "border-box",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: `0 1px 3px ${t.overlay}`,
          }}
          onFocus={e => { e.target.style.borderColor = t.accent; e.target.style.boxShadow = `0 0 0 3px ${t.accent}15`; }}
          onBlur={e => { e.target.style.borderColor = t.border; e.target.style.boxShadow = `0 1px 3px ${t.overlay}`; }}
        />
      </div>

      {error && (
        <div style={{
          marginBottom: 18, background: t.card, borderRadius: 14, padding: 14,
          border: `1px solid ${t.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: `0 1px 3px ${t.overlay}`,
        }}>
          <span style={{ fontSize: 12.5, color: t.muted }}>{error}</span>
          <button
            onClick={reload}
            style={{
              padding: "7px 16px", borderRadius: 10, border: "none",
              background: t.accent, color: "#fff", fontSize: 12,
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <SectionTitle t={t}>{q ? `${matches.length} destinations` : "Trending Destinations"}</SectionTitle>

      {loading && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 26 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} style={{
              borderRadius: 20, height: 150, background: t.tag,
              animation: "shimmer 1.5s ease-in-out infinite",
              backgroundImage: `linear-gradient(90deg,${t.tag},${t.bg2},${t.tag})`,
              backgroundSize: "200% 100%",
            }} />
          ))}
        </div>
      )}

      {!loading && matches.length === 0 && (
        <div style={{
          marginBottom: 26, textAlign: "center", padding: "36px 0",
          background: t.card, borderRadius: 20, border: `1px solid ${t.border}`,
        }}>
          <div style={{ fontSize: 14, color: t.muted }}>{q ? "No destinations match your search." : "No destinations available yet."}</div>
        </div>
      )}

      {(!loading || error !== null) && matches.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 26 }}>
          {matches.map(d => (
            <div
              key={d.id}
              onClick={() => openDest(d.id)}
              style={{
                borderRadius: 20, background: d.gradient, height: 160,
                position: "relative", cursor: "pointer", overflow: "hidden",
                boxShadow: `0 2px 8px ${t.overlay}, 0 4px 20px ${t.overlay}`,
                transition: "transform 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
            >
              {d.trust > 0 && (
                <div style={{
                  position: "absolute", top: 10, right: 10,
                  background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
                  borderRadius: 8, padding: "3px 8px", fontSize: 10.5, fontWeight: 800,
                  color: "#1F1D1A", display: "flex", alignItems: "center", gap: 3,
                }}>
                  <Icon name="ShieldCheck" size={10} color="#4A8A5E" /> {d.trust}
                </div>
              )}
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "24px 12px 12px",
                background: "linear-gradient(transparent,rgba(0,0,0,0.7))",
              }}>
                <div style={{ color: "#fff", fontSize: 17, fontWeight: 600, letterSpacing: 0.2 }}>{d.name}</div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>
                  {d.country}{d.updates > 0 ? ` · ${d.updates} updates` : ""}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}

"use client";

import React, { useState, useEffect, startTransition } from "react";
import type { Theme } from "@/data";
import { DESTINATIONS, COLLECTIONS, GUIDES } from "@/data";
import type { DestinationResponse, PaginatedList } from "@/lib/types";
import { api } from "@/lib/api";
import { Icon } from "../icon";
import { SectionTitle } from "../primitives/index";
import { TrustBadge, PoweredBy } from "../badges/index";

const GRADIENT_POOL = [
  "linear-gradient(150deg,#2D4A45,#5A8A88)",
  "linear-gradient(150deg,#4A3F35,#8B6F4E)",
  "linear-gradient(150deg,#3D352A,#C4943A)",
  "linear-gradient(150deg,#2D4A45,#7BA89A)",
  "linear-gradient(150deg,#4A3A30,#A0805E)",
  "linear-gradient(150deg,#354540,#6A9A88)",
  "linear-gradient(150deg,#3A3530,#8A7A6A)",
  "linear-gradient(150deg,#2A4040,#6A9890)",
];

function toUI(d: DestinationResponse, idx: number) {
  const h = (d.slug || d.name).length + idx;
  return {
    id: d.slug || d.id,
    name: d.name,
    country: d.country,
    gradient: GRADIENT_POOL[idx % GRADIENT_POOL.length],
    trust: 75 + (h * 7) % 20,
    exploring: 5 + (h * 13) % 80,
    updates: 20 + (h * 17) % 200,
    guides: 2 + (h * 11) % 18,
    save: false,
    follow: false,
    safety: d.safety_summary || "Safe",
    safetyLevel: "good" as const,
    tagline: d.description
      ? d.description.slice(0, 80) + (d.description.length > 80 ? "..." : "")
      : d.best_time_to_visit || "",
    badges: (d.tags || []).slice(0, 3),
  };
}

export function DiscoverScreen({ t, openDest }: { t: Theme; openDest: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [apiDests, setApiDests] = useState<ReturnType<typeof toUI>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDests = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedList<DestinationResponse>>("/api/destinations?page=1&per_page=20");
      setApiDests(res.items.map((d, i) => toUI(d, i)));
    } catch {
      setError("Could not load live destinations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { startTransition(() => { fetchDests(); }); }, []);

  const data = apiDests ?? DESTINATIONS;
  const matches = data.filter(d =>
    q === "" ||
    d.name.toLowerCase().includes(q.toLowerCase()) ||
    d.country.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ position: "relative", marginBottom: 20 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex" }}>
          <Icon name="Search" size={17} color={t.muted} />
        </span>
        <input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Search destinations — Bali, Spiti, Goa..."
          style={{
            width: "100%", padding: "14px 16px 14px 44px", borderRadius: 14,
            border: `1px solid ${t.border}`, background: t.card, color: t.text,
            fontSize: 14, outline: "none", boxSizing: "border-box",
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
          <span style={{ fontSize: 12.5, color: t.muted }}>{error} — showing cached data</span>
          <button
            onClick={fetchDests}
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
          <div style={{ fontSize: 14, color: t.muted }}>No destinations match your search.</div>
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
              <div style={{
                position: "absolute", top: 10, right: 10,
                background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
                borderRadius: 8, padding: "3px 8px", fontSize: 10.5, fontWeight: 800,
                color: "#1F1D1A", display: "flex", alignItems: "center", gap: 3,
              }}>
                <Icon name="ShieldCheck" size={10} color="#4A8A5E" /> {d.trust}
              </div>
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                padding: "24px 12px 12px",
                background: "linear-gradient(transparent,rgba(0,0,0,0.7))",
              }}>
                <div style={{ color: "#fff", fontSize: 17, fontWeight: 600, letterSpacing: 0.2 }}>{d.name}</div>
                <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 }}>
                  {d.country} · {d.updates} updates
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!q && (
        <>
          <SectionTitle t={t}>Traveller Collections</SectionTitle>
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, marginBottom: 26, scrollbarWidth: "none" }}>
            {COLLECTIONS.map(c => (
              <div key={c.id} style={{ flexShrink: 0, width: 160, cursor: "pointer" }}>
                <div style={{
                  height: 108, borderRadius: 18, background: c.gradient,
                  position: "relative", overflow: "hidden",
                  boxShadow: `0 2px 8px ${t.overlay}`,
                }}>
                  <div style={{
                    position: "absolute", bottom: 8, left: 10,
                    display: "flex", alignItems: "center", gap: 4,
                    color: "#fff", fontSize: 11, fontWeight: 600,
                    background: "rgba(0,0,0,0.3)", padding: "2px 8px",
                    borderRadius: 6, backdropFilter: "blur(4px)",
                  }}>
                    <Icon name="Images" size={12} color="#fff" /> {c.count}
                  </div>
                </div>
                <div style={{ fontSize: 14.5, fontWeight: 600, color: t.heading, marginTop: 9 }}>{c.title}</div>
                <div style={{ fontSize: 12, color: t.muted }}>by {c.by}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1.2, textTransform: "uppercase" }}>Top Local Guides</span>
            <PoweredBy t={t} />
          </div>
          {GUIDES.slice(0, 3).map(g => (
            <div
              key={g.id}
              onClick={() => openDest(g.destId)}
              style={{
                background: t.card, borderRadius: 18, border: `1px solid ${t.border}`,
                padding: 14, marginBottom: 12,
                display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
                boxShadow: `0 1px 3px ${t.overlay}`,
                transition: "transform 0.2s",
              }}
            >
              <div style={{ width: 48, height: 48, borderRadius: 14, background: g.gradient, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: t.heading }}>{g.name}</div>
                <div style={{ fontSize: 12, color: t.muted, marginTop: 1 }}>{g.location} · {g.speciality}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.gold, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
                  <Icon name="Star" size={12} color={t.gold} /> {g.rating}
                </div>
                <TrustBadge score={g.score} t={t} />
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

"use client";

import React, { useState, useEffect, startTransition } from "react";
import type { Theme } from "@/data";
import { GUIDES } from "@/data";
import { Icon } from "../icon";
import { TrustBadge } from "../badges/index";
import { api } from "@/lib/api";
import type { PlaceResponse, PaginatedList } from "@/lib/types";

const GRADIENTS = [
  "linear-gradient(150deg,#6B5A38,#D4B483)",
  "linear-gradient(150deg,#1E2E2C,#5E847E)",
  "linear-gradient(150deg,#1B263B,#5E7C99)",
  "linear-gradient(150deg,#3A2E3A,#9A7E8E)",
  "linear-gradient(150deg,#4A2E3A,#B48E7E)",
  "linear-gradient(150deg,#1E3A4A,#5E8E9E)",
];

function mapPlaceToGuide(p: PlaceResponse, idx: number) {
  return {
    id: p.id,
    name: p.name,
    location: p.address || "Unknown",
    speciality: (p.tags && p.tags[0]) || "Local Guide",
    languages: ["English", "Hindi"],
    rating: p.external_rating || 0,
    reviews: p.external_review_count || 0,
    price: p.price_range || "Contact for price",
    score: p.trust_score || p.tripova_score || 0,
    verified: (p.trust_score || 0) > 60 || p.is_partner_listed,
    tags: p.tags || [],
    gradient: GRADIENTS[idx % GRADIENTS.length],
  };
}

function SkeletonCard({ t }: { t: Theme }) {
  return (
    <div style={{ background: t.card, borderRadius: 16, overflow: "hidden", marginBottom: 14, border: `1px solid ${t.border}`, opacity: 0.6 }}>
      <div style={{ height: 70, background: t.border }} />
      <div style={{ padding: 14 }}>
        <div style={{ height: 16, width: "60%", background: t.border, borderRadius: 4, marginBottom: 8 }} />
        <div style={{ height: 12, width: "80%", background: t.border, borderRadius: 4, marginBottom: 6 }} />
        <div style={{ height: 12, width: "40%", background: t.border, borderRadius: 4, marginBottom: 12 }} />
        <div style={{ height: 14, width: "30%", background: t.border, borderRadius: 4 }} />
      </div>
    </div>
  );
}

export function GuidesScreen({ t }: { t: Theme }) {
  const [booked, setBooked] = useState<Record<string, boolean>>({});
  const [places, setPlaces] = useState<PlaceResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useFallback, setUseFallback] = useState(false);

  const fetchGuides = () => {
    setLoading(true);
    setError(null);
    setUseFallback(false);
    api.get<PaginatedList<PlaceResponse>>("/api/places?type=guide&per_page=20")
      .then(res => {
        startTransition(() => {
          setPlaces(res.items);
          setLoading(false);
        });
      })
      .catch(err => {
        startTransition(() => {
          setError(err instanceof Error ? err.message : "Failed to load guides");
          setUseFallback(true);
          setLoading(false);
        });
      });
  };

  useEffect(() => { startTransition(() => fetchGuides()); }, []);

  const fallbackGuides = GUIDES.map(g => ({ ...g, id: String(g.id) }));
  const apiGuides = places ? places.map(mapPlaceToGuide) : [];
  const guides = useFallback ? fallbackGuides : apiGuides;
  const isEmpty = !loading && !useFallback && places !== null && places.length === 0;

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ background: `linear-gradient(135deg,${t.gold}12,${t.accent}08)`, borderRadius: 12, padding: "13px 16px", marginBottom: 20, border: `1px solid ${t.gold}20` }}>
        <div style={{ fontSize: 14, color: t.gold, fontWeight: 700 }}>🧭 Local Guide Marketplace</div>
        <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>Verified guides. Real experiences. Fair prices.</div>
      </div>

      {error && !loading && (
        <div style={{ background: t.text + "12", borderRadius: 12, padding: "12px 16px", marginBottom: 16, border: `1px solid ${t.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Icon name="AlertTriangle" size={16} color={t.muted} />
            <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>Could not load live guides</span>
          </div>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 8 }}>{error}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={fetchGuides}
              style={{
                padding: "6px 14px", borderRadius: 6,
                border: `1px solid ${t.accent}40`,
                background: t.card, color: t.accent,
                fontSize: 12, fontWeight: 600, cursor: "pointer",
              }}
            >
              Retry
            </button>
            <span style={{ fontSize: 12, color: t.muted, lineHeight: "30px" }}>Showing sample guides below</span>
          </div>
        </div>
      )}

      {loading && Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} t={t} />)}

      {isEmpty && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>🧭</div>
          <div style={{ fontSize: 14, fontWeight: 600, color: t.text }}>No guides available for this destination</div>
          <div style={{ fontSize: 12, color: t.muted, marginTop: 4 }}>Check back later or explore other destinations</div>
        </div>
      )}

      {!loading && guides.map((g, _idx) => (
        <div key={g.id} style={{ background: t.card, borderRadius: 16, overflow: "hidden", marginBottom: 14, border: `1px solid ${t.border}` }}>
          <div style={{ height: 70, background: g.gradient, position: "relative" }}>
            {g.verified && (
              <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(255,255,255,0.92)", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#1B263B", display: "flex", alignItems: "center", gap: 5 }}>
                <Icon name="BadgeCheck" size={13} color="#B58F4F" /> Verified Guide
              </div>
            )}
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{g.name}</div>
                <div style={{ fontSize: 12, color: t.muted }}>📍 {g.location} · {g.speciality}</div>
                <div style={{ fontSize: 11, color: t.muted, marginTop: 3 }}>🗣 {g.languages.join(", ")}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.warning }}>★ {g.rating}</div>
                <div style={{ fontSize: 11, color: t.muted }}>{g.reviews} reviews</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
              {g.tags.map(tag => <span key={tag} style={{ fontSize: 11, color: t.muted, background: t.tag, padding: "3px 10px", borderRadius: 4 }}>{tag}</span>)}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <TrustBadge score={g.score} t={t} />
                <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, marginTop: 6 }}>{g.price}</div>
              </div>
              <button
                onClick={() => setBooked(b => ({ ...b, [g.id]: !b[g.id] }))}
                style={{
                  padding: "9px 18px", borderRadius: 7,
                  border: `1.5px solid ${booked[g.id] ? t.success : t.accent}`,
                  background: booked[g.id] ? t.success + "15" : t.accent + "10",
                  color: booked[g.id] ? t.success : t.accent,
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}
              >
                {booked[g.id] ? "✓ Booked" : "Book Guide"}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

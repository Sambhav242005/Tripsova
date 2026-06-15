"use client";

import React, { useState, useEffect, startTransition } from "react";
import type { Theme } from "@/data";
import { ALL_FOOD_TYPES } from "@/data";
import { getFI } from "@/data";
import { Icon } from "../icon";
import { SectionTitle, ScreenHeader } from "../primitives/index";
import { PoweredBy } from "../badges/index";
import { api } from "@/lib/api";
import type { FoodPlaceResponse } from "@/lib/types";

const FOOD_TYPES_FILTER = ALL_FOOD_TYPES.filter(f => f.id !== "everything");

const GRADIENTS = [
  "linear-gradient(150deg,#1B263B,#5E7C99)",
  "linear-gradient(150deg,#243A33,#6E8C7E)",
  "linear-gradient(150deg,#2E2C44,#6E6E96)",
  "linear-gradient(150deg,#1E2E2C,#5E847E)",
  "linear-gradient(150deg,#6B5A38,#D4B483)",
  "linear-gradient(150deg,#5A4F3E,#C2A878)",
  "linear-gradient(150deg,#1B3A47,#5E97A8)",
  "linear-gradient(150deg,#3A2E3A,#9A7E8E)",
];

function apiToPlace(p: FoodPlaceResponse, idx: number) {
  const dietTags = p.diet_tags || [];
  const verifiedBy: Record<string, number> = {};
  if (p.verified_count > 0) {
    if (dietTags.length > 0) {
      const perTag = Math.max(1, Math.round(p.verified_count / dietTags.length));
      for (const tag of dietTags) verifiedBy[tag] = perTag;
    } else {
      verifiedBy.community = p.verified_count;
    }
  }
  return {
    id: p.id,
    name: p.name,
    location: p.address || "",
    types: dietTags,
    verifiedBy,
    rating: Math.round(p.food_score * 10) / 10,
    reviews: Math.max(1, Math.round(p.food_score * 30 + (p.verified_count || 0) * 2)),
    tags: Array.from(new Set(dietTags.map(t => getFI(t).label))),
    distance: "—",
    lastVerified: "—",
    gradient: GRADIENTS[idx % GRADIENTS.length],
  };
}

export function PureFindScreen({ t }: { t: Theme }) {
  const [filters, setFilters] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [scanning, setScanning] = useState(false);
  const [expanded, setExpanded] = useState<string | number | null>(null);
  const [apiPlaces, setApiPlaces] = useState<FoodPlaceResponse[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryKey, setRetryKey] = useState(0);

  const toggleF = (id: string) => setFilters(f => f.includes(id) ? f.filter(x => x !== id) : [...f, id]);

  useEffect(() => {
    let mounted = true;
    const isFirstLoad = apiPlaces === null;
    startTransition(() => {
      setError(null);
      if (isFirstLoad) setLoading(true);
    });

    const params = new URLSearchParams();
    filters.forEach(f => params.append("diet_tag", f));
    const qs = params.toString();

    api.get<FoodPlaceResponse[]>(`/api/food${qs ? `?${qs}` : ""}`)
      .then(data => {
        if (!mounted) return;
        startTransition(() => {
          setApiPlaces(data);
          setLoading(false);
        });
      })
      .catch(err => {
        if (!mounted) return;
        startTransition(() => {
          setError(err.message);
          setLoading(false);
        });
      });

    return () => { mounted = false; };
  }, [filters, retryKey]);

  const displayPlaces = apiPlaces ? apiPlaces.map(apiToPlace) : [];

  const filtered = displayPlaces.filter(r => {
    const ms = search === "" || r.name.toLowerCase().includes(search.toLowerCase()) || r.location.toLowerCase().includes(search.toLowerCase());
    const mf = filters.length === 0 || filters.every(f => r.types.includes(f));
    return ms && mf;
  });

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <ScreenHeader t={t} eyebrow="Eat with confidence" title={<>Find food you can<br />actually eat.</>} subtitle="Diet-aware places, verified by fellow travellers — never ads.">
        <PoweredBy t={t} style={{ marginTop: 10 }} />
      </ScreenHeader>

      <div style={{ position: "relative", marginBottom: 14 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex" }}><Icon name="Search" size={17} color={t.muted} /></span>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search restaurant or city..." style={{ width: "100%", padding: "12px 16px 12px 42px", borderRadius: 12, border: `1px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
      </div>

      <div style={{ background: t.card, borderRadius: 14, padding: "13px 16px", marginBottom: 18, border: `1px solid ${t.border}`, display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 40, height: 40, borderRadius: 11, background: t.accent + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="Camera" size={19} color={t.accent} /></div>
          <div>
            <div style={{ fontSize: 15, color: t.heading }}>AI Menu Scanner</div>
            <div style={{ fontSize: 11.5, color: t.muted }}>Photograph any menu — AI highlights safe items</div>
          </div>
        </div>
        <button
          onClick={() => { setScanning(true); setTimeout(() => setScanning(false), 2500); }}
          style={{ padding: "9px 16px", borderRadius: 8, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}
        >
          {scanning ? "Scanning…" : "Scan"}
        </button>
      </div>
      {scanning && (
        <div style={{ background: t.accent + "10", borderRadius: 12, padding: "12px 16px", marginBottom: 14, border: `1px solid ${t.accent}20`, fontSize: 13, color: t.accent, display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="Loader" size={15} color={t.accent} /> Identifying Jain & Vegan items, allergens, and translations…
        </div>
      )}

      <SectionTitle t={t}>Dietary Filters · Select Multiple</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
        {FOOD_TYPES_FILTER.map(f => {
          const active = filters.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => toggleF(f.id)}
              style={{
                display: "flex", alignItems: "center", gap: 5, padding: "6px 13px", borderRadius: 8,
                border: `1.5px solid ${active ? f.color : t.border}`,
                background: active ? f.color + "15" : t.tag,
                color: active ? f.color : t.muted, fontSize: 12, fontWeight: active ? 700 : 500,
                cursor: "pointer", transition: "all 0.18s",
              }}
            >
              {f.emoji} {f.label} {active && <Icon name="Check" size={12} color={f.color} />}
            </button>
          );
        })}
      </div>
      {filters.length > 1 && (
        <div style={{ padding: "10px 13px", background: t.tag, borderRadius: 10, fontSize: 12.5, color: t.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 7 }}>
          <Icon name="Users" size={14} color={t.secondary} /> Showing places that support <strong style={{ color: t.accent }}>{filters.map(id => getFI(id).label).join(" + ")}</strong>
        </div>
      )}
      {filters.length > 0 && <button onClick={() => setFilters([])} style={{ fontSize: 12, color: t.muted, background: "transparent", border: "none", cursor: "pointer", marginBottom: 10 }}>✕ Clear filters</button>}

      {loading && apiPlaces === null && (
        <div>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} style={{ background: t.card, borderRadius: 16, overflow: "hidden", marginBottom: 14, border: `1px solid ${t.border}`, opacity: 0.5 }}>
              <div style={{ height: 90, background: t.tag }} />
              <div style={{ padding: 14 }}>
                <div style={{ height: 16, width: "60%", background: t.tag, borderRadius: 6, marginBottom: 8 }} />
                <div style={{ height: 12, width: "40%", background: t.tag, borderRadius: 6, marginBottom: 12 }} />
                <div style={{ height: 12, width: "80%", background: t.tag, borderRadius: 6 }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && apiPlaces === null && (
        <div style={{ background: t.danger + "12", borderRadius: 12, padding: "12px 16px", marginBottom: 14, border: `1px solid ${t.danger}25`, display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: t.danger }}>
          <Icon name="AlertTriangle" size={15} color={t.danger} />
          <span style={{ flex: 1 }}>Could not load live data.</span>
          <button onClick={() => setRetryKey(k => k + 1)} style={{ padding: "6px 12px", borderRadius: 6, border: `1px solid ${t.danger}40`, background: "transparent", color: t.danger, fontSize: 12, cursor: "pointer" }}>Retry</button>
        </div>
      )}

      {(!loading || apiPlaces !== null) && !(error && apiPlaces === null) && (
        <>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 14 }}>{filtered.length} community-verified places</div>

          {filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 24px" }}>
              <div style={{ width: 60, height: 60, borderRadius: 18, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Icon name="Salad" size={28} color={t.secondary} /></div>
              <div style={{ fontSize: 18, color: t.heading, marginBottom: 6 }}>No restaurants found matching your diet.</div>
              <div style={{ fontSize: 13.5, color: t.muted }}>Try removing a filter or searching a different city.</div>
            </div>
          )}

          {filtered.map((r) => (
            <div key={r.id} style={{ background: t.card, borderRadius: 16, overflow: "hidden", marginBottom: 14, border: `1px solid ${t.border}`, boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ height: 90, background: r.gradient, position: "relative" }}>
                <div style={{ position: "absolute", bottom: 10, left: 12, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {Object.entries(r.verifiedBy).slice(0, 2).map(([fid, c]) => (
                    <span key={fid} style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.94)", borderRadius: 7, padding: "4px 9px", fontSize: 11, fontWeight: 700, color: getFI(fid).color }}>
                      <Icon name="BadgeCheck" size={12} color={getFI(fid).color} /> {getFI(fid).label} · {c}
                    </span>
                  ))}
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <div>
                    <div style={{ fontSize: 16, color: t.heading }}>{r.name}</div>
                    <div style={{ fontSize: 12, color: t.muted, display: "flex", alignItems: "center", gap: 4 }}><Icon name="MapPin" size={11} color={t.muted} /> {r.location} · {r.distance}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: t.warning, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}><Icon name="Star" size={12} color={t.warning} /> {r.rating}</div>
                    <div style={{ fontSize: 11, color: t.muted }}>{r.reviews} reviews</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {r.tags.map(tag => <span key={tag} style={{ fontSize: 11, color: t.muted, background: t.tag, padding: "3px 10px", borderRadius: 6 }}>{tag}</span>)}
                </div>
                {expanded === r.id ? (
                  <div style={{ background: t.gold + "10", border: `1px solid ${t.gold}35`, borderRadius: 12, padding: 13 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 8 }}><Icon name="Sparkles" size={15} color={t.gold} /><span style={{ fontSize: 13, fontWeight: 700, color: t.gold }}>Premium enhancements for this menu</span></div>
                    {["Ingredient analysis — flags hidden onion, garlic & dairy", "Allergy warnings tailored to your profile", "One-tap menu translation to English"].map(x => (
                      <div key={x} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: t.text, marginBottom: 6 }}><Icon name="Check" size={13} color={t.gold} /> {x}</div>
                    ))}
                    <button style={{ marginTop: 6, width: "100%", padding: "10px", borderRadius: 9, border: "none", background: `linear-gradient(135deg,${t.gold},${t.goldFill})`, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>Try Premium free for 7 days</button>
                  </div>
                ) : (
                  <button onClick={() => setExpanded(r.id)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 13px", borderRadius: 10, border: `1px dashed ${t.gold}55`, background: t.gold + "0A", color: t.text, fontSize: 12.5, cursor: "pointer", textAlign: "left" }}>
                    <Icon name="Sparkles" size={15} color={t.gold} /> <span>Want ingredient analysis & menu translation?</span> <span style={{ marginLeft: "auto" }}><Icon name="ChevronRight" size={15} color={t.muted} /></span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

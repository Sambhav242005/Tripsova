"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Destination, Theme } from "@/data";
import { useDestinations, mapDestination } from "@/lib/destinations";
import type { DestinationResponse, PaginatedList } from "@/lib/types";
import { api, ApiError } from "@/lib/api";
import { Icon } from "../icon";
import { SectionTitle, ScreenHeader } from "../primitives/index";
import type { JourneySeed } from "./journey-screen";

// A city resolved live from OpenStreetMap when it isn't one of our curated
// destinations — so a search for a real place never dead-ends at "0 results".
interface GeoCity { name: string; latitude: number; longitude: number; }

export function DiscoverScreen({
  t,
  openDest,
  openJourney,
}: {
  t: Theme;
  openDest: (id: string) => void;
  openJourney?: (seed: Omit<JourneySeed, "key">) => void;
}) {
  const [q, setQ] = useState("");
  // Trending grid (no query) comes from the shared cached hook.
  const { destinations, loading: trendingLoading, error: trendingError, reload } = useDestinations();

  // Search state — backend search + live geocode fallback, debounced.
  const [results, setResults] = useState<Destination[] | null>(null);
  const [geoCity, setGeoCity] = useState<GeoCity | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const reqSeq = useRef(0);

  const query = q.trim();

  useEffect(() => {
    if (query === "") {
      // Cleared input → reset the debounced-search results synchronously.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults(null);
      setGeoCity(null);
      setSearchError(null);
      setSearching(false);
      return;
    }
    const seq = ++reqSeq.current;
    setSearching(true);
    setSearchError(null);
    const timer = window.setTimeout(async () => {
      try {
        // 1) Real server-side search across name/description/city/state/country.
        const res = await api.get<PaginatedList<DestinationResponse>>(
          `/api/destinations?page=1&per_page=20&search=${encodeURIComponent(query)}`,
        );
        if (seq !== reqSeq.current) return; // a newer keystroke superseded us
        if (res.items.length > 0) {
          setResults(res.items.map((d, i) => mapDestination(d, i)));
          setGeoCity(null);
        } else {
          // 2) Nothing curated — try resolving it live so the user still gets a result.
          setResults([]);
          try {
            const point = await api.get<GeoCity>(`/api/trips/geocode?q=${encodeURIComponent(query)}`);
            if (seq !== reqSeq.current) return;
            setGeoCity(point);
          } catch (e) {
            if (seq !== reqSeq.current) return;
            // 404 = genuinely unknown place; anything else = transient/network.
            setGeoCity(null);
            if (!(e instanceof ApiError && e.status === 404)) {
              setSearchError("Couldn't search right now. Check your connection and try again.");
            }
          }
        }
      } catch {
        if (seq !== reqSeq.current) return;
        setResults([]);
        setSearchError("Couldn't search right now. Check your connection and try again.");
      } finally {
        if (seq === reqSeq.current) setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const isSearch = query !== "";
  const grid = isSearch ? results ?? [] : destinations ?? [];
  const loading = isSearch ? searching : trendingLoading;
  const error = isSearch ? searchError : trendingError;
  const showEmpty = !loading && grid.length === 0 && !(isSearch && geoCity);

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
            onClick={() => (isSearch ? setQ(q => q + " ") : reload())}
            style={{
              padding: "7px 16px", borderRadius: 10, border: "none",
              background: t.accent, color: t.onAccent, fontSize: 12,
              fontWeight: 700, cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      )}

      <SectionTitle t={t}>{isSearch ? `${grid.length} ${grid.length === 1 ? "destination" : "destinations"}` : "Trending Destinations"}</SectionTitle>

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

      {/* Live-resolved city when nothing curated matched — keeps a real search useful. */}
      {!loading && isSearch && grid.length === 0 && geoCity && (
        <button
          onClick={() => openJourney?.({ origin: "", destination: geoCity.name, autoPlan: false })}
          style={{
            width: "100%", textAlign: "left", marginBottom: 26, cursor: openJourney ? "pointer" : "default",
            background: t.card, borderRadius: 20, padding: 18, border: `1px solid ${t.border}`,
            boxShadow: `0 1px 3px ${t.overlay}`, display: "flex", alignItems: "center", gap: 14,
          }}
        >
          <span style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, background: t.accent + "15", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="MapPin" size={20} color={t.accent} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: "block", fontSize: 15, fontWeight: 700, color: t.text }}>{geoCity.name}</span>
            <span style={{ display: "block", fontSize: 12, color: t.muted, marginTop: 2 }}>
              Not in our curated destinations yet — found via OpenStreetMap.{openJourney ? " Tap to plan a journey here." : ""}
            </span>
          </span>
          {openJourney && <Icon name="ChevronRight" size={18} color={t.muted} />}
        </button>
      )}

      {showEmpty && (
        <div style={{
          marginBottom: 26, textAlign: "center", padding: "36px 0",
          background: t.card, borderRadius: 20, border: `1px solid ${t.border}`,
        }}>
          <div style={{ fontSize: 14, color: t.muted }}>{isSearch ? `No place called “${query}” found.` : "No destinations available yet."}</div>
        </div>
      )}

      {!loading && grid.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 26 }}>
          {grid.map(d => (
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

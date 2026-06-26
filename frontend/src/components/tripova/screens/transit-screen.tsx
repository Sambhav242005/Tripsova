"use client";

import React, { useCallback, useState } from "react";
import type { Theme } from "@/data";
import { Card, SectionTitle } from "../primitives/index";
import { Icon } from "../icon";
import { api, ApiError } from "@/lib/api";
import type {
  TransitSearchResult,
  TransitLiveRoute,
  TransitRouteDirection,
  TransitLiveBus,
} from "@/lib/types";

type View = "search" | "route";

// Real, well-known Bengaluru hubs and route families a newcomer can tap to start —
// these are just *search terms*, not fabricated live data. The actual routes/buses
// still come from BMTC. Gives a "I don't know any route number" user a way in.
const POPULAR_SEARCHES: { label: string; q: string }[] = [
  { label: "Majestic (KBS)", q: "Majestic" },
  { label: "Shivajinagar", q: "Shivajinagar" },
  { label: "Silk Board", q: "Silk Board" },
  { label: "Electronic City", q: "Electronic City" },
  { label: "Whitefield", q: "Whitefield" },
  { label: "Airport (KIA)", q: "KIA" },
  { label: "Route 500", q: "500" },
  { label: "Route 201", q: "201" },
];

export function TransitScreen({ t, onBack, embedded = false }: { t: Theme; onBack?: () => void; embedded?: boolean }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<TransitSearchResult | null>(null);
  const [view, setView] = useState<View>("search");
  const [selectedRoute, setSelectedRoute] = useState<TransitLiveRoute | null>(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResult(null); return; }
    setSearching(true);
    setError(null);
    try {
      const res = await api.get<TransitSearchResult>(`/api/transit/search?q=${encodeURIComponent(q)}`);
      setSearchResult(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setSearchResult(null);
      } else {
        setError("Could not search BMTC. Is the backend running?");
      }
    } finally {
      setSearching(false);
    }
  }, []);

  const openRoute = useCallback(async (routeId: number) => {
    setLoadingRoute(true);
    setError(null);
    try {
      const res = await api.get<TransitLiveRoute>(`/api/transit/routes/${routeId}`);
      setSelectedRoute(res);
      setView("route");
    } catch {
      setError("Could not load route data.");
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  const goBack = () => {
    if (view === "route") { setView("search"); setSelectedRoute(null); return; }
    onBack?.();
  };

  return (
    <div style={{ padding: embedded ? 0 : "0 16px 16px" }}>
      {embedded ? (
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
          <button onClick={goBack} aria-label={view === "route" ? "Back to search" : "Back to route builder"}
            style={{ width: 34, height: 34, borderRadius: 9, border: `1px solid ${t.border}`, background: t.card, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: t.text }}>
            <Icon name="ChevronLeft" size={17} color={t.text} />
          </button>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.text }}>{view === "search" ? "Live bus tracker" : selectedRoute?.route_no || "Route"}</div>
            <div style={{ fontSize: 11.5, color: t.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {view === "search" ? "Bengaluru (BMTC) — search a route or stop" : `${selectedRoute?.route_no} · ${selectedRoute?.route_name}`}
            </div>
          </div>
        </div>
      ) : (
        <div style={{
          background: `linear-gradient(135deg,${t.accent}15,${t.secondary}10)`,
          borderRadius: 12, padding: "13px 16px", marginBottom: 18,
          border: `1px solid ${t.accent}20`,
        }}>
          <div style={{ fontSize: 14, color: t.accent, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <button onClick={goBack} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0, color: t.accent }}>
              <Icon name={view === "search" ? "Bus" : "ChevronLeft"} size={16} color={t.accent} />
            </button>
            {view === "search" ? "BMTC Bus Tracker" : selectedRoute?.route_no || "Route"}
          </div>
          <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>
            {view === "search"
              ? "Track live BMTC buses in Bengaluru — search by route number or stop name."
              : `${selectedRoute?.route_no} · ${selectedRoute?.route_name}`}
          </div>
        </div>
      )}

      {error && (
        <div style={{
          background: t.danger + "12", border: `1px solid ${t.danger}25`,
          borderRadius: 8, padding: "10px 14px", color: t.danger, fontSize: 13, marginBottom: 12,
        }}>
          {error}
        </div>
      )}

      {view === "search" && (
        <SearchView
          t={t}
          query={query}
          onQueryChange={v => { setQuery(v); doSearch(v); }}
          searching={searching}
          result={searchResult}
          onSelectRoute={openRoute}
        />
      )}

      {view === "route" && selectedRoute && (
        <RouteView t={t} route={selectedRoute} loading={loadingRoute} />
      )}
    </div>
  );
}

function SearchView({
  t, query, onQueryChange, searching, result, onSelectRoute,
}: {
  t: Theme; query: string; onQueryChange: (v: string) => void;
  searching: boolean; result: TransitSearchResult | null;
  onSelectRoute: (id: number) => void;
}) {
  return (
    <div>
      <div style={{ position: "relative", marginBottom: 16 }}>
        <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", display: "flex", pointerEvents: "none" }}>
          <Icon name="Search" size={17} color={t.muted} />
        </span>
        <input
          aria-label="Search BMTC routes or stops"
          value={query}
          onChange={e => onQueryChange(e.target.value)}
          placeholder="Route number e.g. 500 or stop name…"
          style={{
            width: "100%", padding: "14px 16px 14px 44px", borderRadius: 14,
            border: `1.5px solid ${query ? t.accent : t.border}`, background: t.card,
            color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box",
            transition: "border-color 0.2s, box-shadow 0.2s",
            boxShadow: query ? `0 0 0 3px ${t.accent}15` : `0 1px 3px ${t.overlay}`,
          }}
        />
        {searching && (
          <span style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" }}>
            <span style={{
              display: "inline-block", width: 16, height: 16, borderRadius: "50%",
              border: `2px solid ${t.border}`, borderTopColor: t.accent,
              animation: "spin 0.7s linear infinite",
            }} />
          </span>
        )}
      </div>

      {!result && query.length >= 2 && !searching && (
        <div style={{
          textAlign: "center", padding: "32px 16px", color: t.muted, fontSize: 12.5,
          background: t.card, borderRadius: 16, border: `1px solid ${t.border}`,
        }}>
          <Icon name="Bus" size={32} color={t.border} />
          <div style={{ marginTop: 8 }}>No routes or stops found for &quot;{query}&quot;</div>
        </div>
      )}

      {result && (
        <div>
          {result.routes.length > 0 && (
            <div>
              <SectionTitle t={t}>Routes ({result.routes.length})</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                {result.routes.slice(0, 20).map(r => (
                  <button
                    key={r.route_id}
                    onClick={() => onSelectRoute(r.route_id)}
                    style={{
                      display: "flex", alignItems: "center", gap: 12,
                      padding: "12px 14px", borderRadius: 14,
                      border: `1px solid ${t.border}`, background: t.card,
                      cursor: "pointer", textAlign: "left", width: "100%",
                      transition: "all 0.15s", color: t.text,
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.accent + "08"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.card; }}
                  >
                    <span style={{
                      width: 40, height: 40, borderRadius: 12,
                      background: t.accent + "15", display: "flex",
                      alignItems: "center", justifyContent: "center",
                      fontSize: 18, flexShrink: 0,
                    }}>
                      <Icon name="Bus" size={18} color={t.accent} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700 }}>{r.route_no}</div>
                      {r.route_name && (
                        <div style={{ fontSize: 12, color: t.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {r.route_name}
                        </div>
                      )}
                    </div>
                    <Icon name="ChevronRight" size={16} color={t.muted} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.stops.length > 0 && (
            <div>
              <SectionTitle t={t}>Bus Stops ({result.stops.length})</SectionTitle>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                {result.stops.slice(0, 10).map(s => (
                  <div key={s.station_id} style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "10px 12px", borderRadius: 12,
                    border: `1px solid ${t.border}`, background: t.card,
                  }}>
                    <span style={{
                      width: 32, height: 32, borderRadius: 10,
                      background: t.tag, display: "flex",
                      alignItems: "center", justifyContent: "center", flexShrink: 0,
                    }}>
                      <Icon name="MapPin" size={14} color={t.secondary} />
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{s.station_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!query && (
        <div>
          <div style={{ textAlign: "center", padding: "28px 16px 8px", color: t.muted, fontSize: 12.5 }}>
            <Icon name="Bus" size={40} color={t.border} />
            <div style={{ marginTop: 10, fontWeight: 600, color: t.text }}>Live buses for Bengaluru (BMTC)</div>
            <div style={{ marginTop: 4, fontSize: 11.5 }}>Don&apos;t know a route number? Tap a popular place or route below — or search any stop name.</div>
          </div>
          <SectionTitle t={t}>Start here</SectionTitle>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {POPULAR_SEARCHES.map(p => (
              <button
                key={p.q}
                onClick={() => onQueryChange(p.q)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "9px 14px", borderRadius: 999,
                  border: `1.5px solid ${t.border}`, background: t.card,
                  color: t.text, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent; e.currentTarget.style.background = t.accent + "08"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.card; }}
              >
                <Icon name={/^\d/.test(p.q) ? "Bus" : "MapPin"} size={13} color={t.accent} /> {p.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: t.muted, marginTop: 10, display: "flex", alignItems: "flex-start", gap: 6 }}>
            <Icon name="Info" size={12} color={t.muted} />
            <span style={{ flex: 1 }}>Live tracking is available for Bengaluru city buses only. For intercity buses, use the trip planner.</span>
          </div>
        </div>
      )}
    </div>
  );
}

function RouteView({ t, route, loading }: { t: Theme; route: TransitLiveRoute; loading: boolean }) {
  if (loading) {
    return <div style={{ textAlign: "center", padding: 40, color: t.muted }}>Loading route data…</div>;
  }

  return (
    <div>
      <Card t={t}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <span style={{
            width: 44, height: 44, borderRadius: 14,
            background: t.accent + "15", display: "flex",
            alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
          }}>
            <Icon name="Bus" size={20} color={t.accent} />
          </span>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, color: t.text }}>{route.route_no}</div>
            <div style={{ fontSize: 12, color: t.muted }}>{route.route_name}</div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: t.muted, fontStyle: "italic" }}>
          Last updated: {new Date(route.fetched_at).toLocaleTimeString()}
        </div>
      </Card>

      <DirectionCard t={t} direction={route.up} label="Up Direction" accent={t.accent} />
      {route.down && <DirectionCard t={t} direction={route.down} label="Down Direction" accent={t.secondary} />}
    </div>
  );
}

function DirectionCard({ t, direction, label, accent }: {
  t: Theme; direction: TransitRouteDirection; label: string; accent: string;
}) {
  const { stations, live_buses } = direction;
  const hasBuses = live_buses.length > 0;

  return (
    <Card t={t}>
      <div style={{
        fontSize: 12, fontWeight: 700, color: accent,
        letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: accent }} />
        {label} · {live_buses.length} bus live
      </div>

      {hasBuses && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 8 }}>
            Live Buses
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {live_buses.slice(0, 10).map(bus => (
              <BusCard key={bus.vehicle_id} bus={bus} t={t} accent={accent} />
            ))}
          </div>
        </div>
      )}

      <div>
        <div style={{
          fontSize: 11, fontWeight: 700, color: t.muted,
          letterSpacing: 1, textTransform: "uppercase", marginBottom: 8,
        }}>
          Stations ({stations.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {stations.map((s, i) => {
            const busHere = live_buses.find(b =>
              Math.abs(b.latitude - s.latitude) < 0.005 &&
              Math.abs(b.longitude - s.longitude) < 0.005
            );
            return (
              <div key={s.station_id} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 0", borderBottom: i < stations.length - 1 ? `1px solid ${t.border}30` : "none",
              }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 16 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    background: busHere ? accent : t.border,
                    border: busHere ? `2px solid ${accent}50` : "none",
                    flexShrink: 0,
                  }} />
                  {i < stations.length - 1 && <div style={{ width: 1, flex: 1, background: t.border, marginTop: 2 }} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 12.5, fontWeight: busHere ? 700 : 500, color: t.text,
                  }}>
                    {s.station_name}
                    {busHere && <span style={{ color: accent, marginLeft: 6, fontSize: 11 }}>● Bus here</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

function BusCard({ bus, t, accent }: { bus: TransitLiveBus; t: Theme; accent: string }) {
  const etaStr = bus.eta ? new Date(bus.eta).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 10,
      padding: "10px 12px", borderRadius: 12,
      border: `1px solid ${accent}25`, background: accent + "06",
    }}>
      <span style={{
        width: 34, height: 34, borderRadius: 10,
        background: accent + "15", display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0,
      }}>
        <Icon name="Bus" size={16} color={accent} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>
          {bus.vehicle_number}
          {bus.service_type && (
            <span style={{
              fontSize: 9, fontWeight: 800, marginLeft: 6,
              padding: "2px 5px", borderRadius: 4,
              background: t.gold + "20", color: t.gold,
              letterSpacing: 0.5,
            }}>
              {bus.service_type}
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>
          {etaStr ? `ETA: ${etaStr}` : "Live"}
          {bus.heading > 0 && ` · ${headingToDir(bus.heading)}`}
        </div>
      </div>
      <span style={{
        width: 8, height: 8, borderRadius: "50%",
        background: t.success, flexShrink: 0, display: "block",
        animation: "pulse 2s infinite",
      }} />
    </div>
  );
}

function headingToDir(deg: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW", "N"];
  return dirs[Math.round(deg / 45) % 8] || "N";
}

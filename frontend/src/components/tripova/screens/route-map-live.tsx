"use client";

import React, { useEffect, useRef, useState } from "react";
import type { Theme } from "@/data";
import { Card } from "../primitives/index";
import { RouteMap, mediumColor, type RoutePlanResult } from "./route-screen";

// ── Why this exists ───────────────────────────────────────────────────────────
// The lightweight SVG map (RouteMap, in route-screen) draws straight lines on an
// abstract grid — honest about the estimate model, but it doesn't look like a map
// to a first-time traveller. This renders the same journey on a REAL OpenStreetMap
// basemap and traces the ACTUAL road for ground legs (via the public OSRM router),
// so the path reads the way people expect from Google Maps. Flights/ferries stay as
// curved arcs — that's how real maps draw them too. If Leaflet, the tiles, or the
// router can't be reached (e.g. offline), we fall back to the SVG schematic so the
// screen never breaks.

// Leaflet is loaded from CDN at runtime rather than bundled — this is a forked
// Next.js, and pulling react-leaflet through npm risks peer-dep / SSR breakage.
const LEAFLET_VERSION = "1.9.4";
const LEAFLET_CSS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.css`;
const LEAFLET_JS = `https://unpkg.com/leaflet@${LEAFLET_VERSION}/dist/leaflet.js`;
// Public OSRM demo server — fine for dev/demo, rate-limited (not for production scale).
const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
// Overpass (OpenStreetMap query API, keyless, CORS-enabled) — used to find REAL petrol
// pumps and places to eat that lie along the traced road, not invented points. The main
// instance rate-limits aggressively (429) and occasionally times out, which used to leave
// the corridor silently POI-less; we fall through these CORS-enabled mirrors in turn.
const OVERPASS_MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

// ── Minimal typed facade over the bits of the Leaflet global we touch ─────────
type LatLng = [number, number];
interface LLayer {
  addTo(map: LMap): LLayer;
  bindTooltip(content: string, opts?: Record<string, unknown>): LLayer;
}
interface LBounds {
  isValid(): boolean;
}
interface LMap {
  remove(): void;
  fitBounds(bounds: LBounds, opts?: Record<string, unknown>): void;
  setView(center: LatLng, zoom: number): LMap;
}
interface LeafletStatic {
  map(el: HTMLElement, opts?: Record<string, unknown>): LMap;
  tileLayer(url: string, opts?: Record<string, unknown>): LLayer;
  polyline(pts: LatLng[], opts?: Record<string, unknown>): LLayer;
  circleMarker(center: LatLng, opts?: Record<string, unknown>): LLayer;
  marker(center: LatLng, opts?: Record<string, unknown>): LLayer;
  divIcon(opts: Record<string, unknown>): unknown;
  latLngBounds(pts: LatLng[]): LBounds;
}

let leafletPromise: Promise<LeafletStatic> | null = null;

function loadLeaflet(): Promise<LeafletStatic> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const existing = (window as unknown as { L?: LeafletStatic }).L;
  if (existing) return Promise.resolve(existing);
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise<LeafletStatic>((resolve, reject) => {
    // CSS
    if (!document.querySelector(`link[data-leaflet]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      link.setAttribute("data-leaflet", "1");
      document.head.appendChild(link);
    }
    // JS
    const onReady = () => {
      const L = (window as unknown as { L?: LeafletStatic }).L;
      if (L) resolve(L);
      else reject(new Error("Leaflet failed to initialise"));
    };
    const prior = document.querySelector<HTMLScriptElement>(`script[data-leaflet]`);
    if (prior) {
      if ((window as unknown as { L?: LeafletStatic }).L) onReady();
      else {
        prior.addEventListener("load", onReady);
        prior.addEventListener("error", () => reject(new Error("Leaflet script error")));
      }
      return;
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.setAttribute("data-leaflet", "1");
    script.addEventListener("load", onReady);
    script.addEventListener("error", () => reject(new Error("Leaflet script error")));
    document.body.appendChild(script);
  });
  return leafletPromise;
}

// Fetch the real driving road geometry between two points. Returns [lat,lng][] or
// null on any failure (caller draws a straight line for that leg instead).
async function fetchRoad(from: LatLng, to: LatLng, signal: AbortSignal): Promise<LatLng[] | null> {
  try {
    const url = `${OSRM_BASE}/${from[1]},${from[0]};${to[1]},${to[0]}?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      routes?: { geometry?: { coordinates?: [number, number][] } }[];
    };
    const coords = data.routes?.[0]?.geometry?.coordinates;
    if (!coords || coords.length < 2) return null;
    return coords.map(([lng, lat]) => [lat, lng] as LatLng);
  } catch {
    return null; // aborted, network, or CORS — fall back to a straight line
  }
}

// A gentle great-circle-ish arc for air/water legs (quadratic bezier bulged
// perpendicular to the chord), so flights curve the way travellers expect.
function arc(from: LatLng, to: LatLng): LatLng[] {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const mx = (lat1 + lat2) / 2;
  const my = (lng1 + lng2) / 2;
  const dx = lat2 - lat1;
  const dy = lng2 - lng1;
  const dist = Math.hypot(dx, dy) || 1;
  // Bend ~18% of the span, perpendicular to the line.
  const bend = dist * 0.18;
  const cx = mx + (-dy / dist) * bend;
  const cy = my + (dx / dist) * bend;
  const pts: LatLng[] = [];
  const STEPS = 48;
  for (let i = 0; i <= STEPS; i++) {
    const s = i / STEPS;
    const lat = (1 - s) * (1 - s) * lat1 + 2 * (1 - s) * s * cx + s * s * lat2;
    const lng = (1 - s) * (1 - s) * lng1 + 2 * (1 - s) * s * cy + s * s * lng2;
    pts.push([lat, lng]);
  }
  return pts;
}

// Roughly-even downsample of a polyline (or any list) to at most `max` items.
function thin<T>(pts: T[], max: number): T[] {
  if (pts.length <= max) return pts;
  const step = (pts.length - 1) / (max - 1);
  const out: T[] = [];
  for (let i = 0; i < max; i++) out.push(pts[Math.round(i * step)]);
  return out;
}

interface Poi { lat: number; lng: number; name: string; kind: "fuel" | "food" }

// Real petrol pumps + eateries within ~1.5 km of the traced road. Returns [] on any
// failure (offline, rate-limited, CORS) so the map degrades to road-only, never breaks.
async function fetchPois(road: LatLng[], signal: AbortSignal): Promise<Poi[]> {
  if (road.length < 2) return [];
  // Sample the road to a manageable corridor of waypoints. A single combined amenity
  // clause (fuel + eateries) is cheaper for Overpass than two separate `around`s, so
  // it's far less likely to time out on a long highway.
  const coords = thin(road, 24).map(([lat, lng]) => `${lat.toFixed(4)},${lng.toFixed(4)}`).join(",");
  const q =
    "[out:json][timeout:25];" +
    `node["amenity"~"^(fuel|restaurant|fast_food|cafe)$"](around:1500,${coords});` +
    "out body 150;";
  const body = "data=" + encodeURIComponent(q);

  const parse = (data: { elements?: { lat?: number; lon?: number; tags?: Record<string, string> }[] }): Poi[] => {
    const out: Poi[] = [];
    for (const el of data.elements ?? []) {
      if (el.lat == null || el.lon == null) continue;
      const tags = el.tags ?? {};
      const kind: "fuel" | "food" = tags.amenity === "fuel" ? "fuel" : "food";
      const name = tags["name:en"] || tags.name || (kind === "fuel" ? "Fuel station" : "Place to eat");
      out.push({ lat: el.lat, lng: el.lon, name, kind });
    }
    return out;
  };

  // Try each mirror in turn — the primary instance frequently 429s. A timeout/429 on
  // one mirror shouldn't cost the whole corridor its markers; the next one usually works.
  for (const url of OVERPASS_MIRRORS) {
    if (signal.aborted) return [];
    try {
      const res = await fetch(url, {
        method: "POST",
        body,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal,
      });
      if (!res.ok) continue; // 429 / 504 / 503 — fall through to the next mirror
      const pois = parse((await res.json()) as Parameters<typeof parse>[0]);
      return pois; // a successful (even if empty) response is authoritative for that corridor
    } catch {
      if (signal.aborted) return []; // genuinely cancelled (unmount) — stop trying
      // network / CORS / parse error on this mirror — try the next one
    }
  }
  return []; // every mirror failed — road-only is fine
}

export function LiveRouteMap({ result, t }: { result: RoutePlanResult; t: Theme }) {
  const elRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LMap | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "failed">("loading");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    (async () => {
      let L: LeafletStatic;
      try {
        L = await loadLeaflet();
      } catch {
        if (!cancelled) setPhase("failed");
        return;
      }
      if (cancelled || !elRef.current) return;

      // Guard against a stale instance (e.g. React 18 strict double-invoke).
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* noop */ }
        mapRef.current = null;
      }

      let map: LMap;
      try {
        map = L.map(elRef.current, { scrollWheelZoom: false, attributionControl: true });
        mapRef.current = map;
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 19,
        }).addTo(map);
      } catch {
        if (!cancelled) setPhase("failed");
        return;
      }

      const allPts: LatLng[] = [];
      const roadPts: LatLng[] = []; // self-driven road geometry, for the fuel/food corridor

      // Road vehicles actually follow the driving network, so we trace the real road for
      // them. Trains & metros ride rails we can't route here — tracing a *driving* road
      // under a train would draw a misleading "car route", so we draw a plain link line.
      const tracesRoad = (m: string) => ["CAR", "MOTORCYCLE", "BUS", "BICYCLE", "WALK"].includes(m);
      // Only self-driven legs get fuel/food markers — on a scheduled train/bus the
      // traveller can't choose roadside stops, so pumps along the line are just noise.
      const selfDriven = (m: string) => m === "CAR" || m === "MOTORCYCLE";

      // Draw each leg: real road for road vehicles, straight link for rail, arc for air/water.
      for (const leg of result.legs) {
        const from: LatLng = [leg.from.latitude, leg.from.longitude];
        const to: LatLng = [leg.to.latitude, leg.to.longitude];
        const color = mediumColor(t, leg.medium);
        const mode = leg.transport;
        let line: LatLng[];
        let isRail = false;
        if (leg.medium === "LAND" && tracesRoad(mode)) {
          const road = await fetchRoad(from, to, controller.signal);
          line = road ?? [from, to];
          if (selfDriven(mode)) roadPts.push(...line);
        } else if (leg.medium === "LAND") {
          // Train / metro — no rail router available, so an honest straight link beats
          // pretending a road is the route.
          isRail = true;
          line = [from, to];
        } else {
          line = arc(from, to);
        }
        if (cancelled) return;
        allPts.push(...line);
        // Soft casing under the route for contrast on the map.
        L.polyline(line, { color: "#ffffff", weight: 7, opacity: 0.7 }).addTo(map);
        L.polyline(line, {
          color,
          weight: 4,
          opacity: 0.95,
          // Air = long dashes; rail = fine dots (reads as a railway, not a traced road).
          dashArray: leg.medium === "AIR" ? "8 8" : isRail ? "1 7" : undefined,
        }).addTo(map).bindTooltip(`${leg.icon} ${leg.from.name} → ${leg.to.name} · ${Math.round(leg.distanceKm).toLocaleString()} km`, { sticky: true });
      }

      // City markers: origin, intermediate joins, final destination.
      const cityDot = (p: LatLng, label: string, fill: string, r: number) => {
        L.circleMarker(p, { radius: r, color: "#fff", weight: 2, fillColor: fill, fillOpacity: 1 })
          .addTo(map)
          .bindTooltip(label, { permanent: true, direction: "top", className: "tv-city-label", offset: [0, -6] });
      };
      if (result.legs.length > 0) {
        const first = result.legs[0];
        cityDot([first.from.latitude, first.from.longitude], first.from.name, t.success, 7);
        for (let i = 0; i < result.legs.length - 1; i++) {
          const j = result.legs[i];
          cityDot([j.to.latitude, j.to.longitude], j.to.name, t.secondary, 6);
        }
        const last = result.legs[result.legs.length - 1];
        cityDot([last.to.latitude, last.to.longitude], last.to.name, t.gold, 7);
      }

      // Overnight + fuel markers.
      const emojiMarker = (p: LatLng, emoji: string, tip: string) => {
        L.marker(p, {
          icon: L.divIcon({
            html: `<div style="font-size:16px;line-height:16px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.4))">${emoji}</div>`,
            className: "tv-emoji-icon",
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
        }).addTo(map).bindTooltip(tip, { direction: "top" });
        allPts.push(p);
      };
      // A smaller pin for the many POIs, so they don't crowd out the route itself.
      const poiMarker = (p: LatLng, emoji: string, name: string) => {
        L.marker(p, {
          icon: L.divIcon({
            html: `<div style="font-size:13px;line-height:13px;filter:drop-shadow(0 1px 1px rgba(0,0,0,0.45))">${emoji}</div>`,
            className: "tv-emoji-icon",
            iconSize: [15, 15],
            iconAnchor: [7, 7],
          }),
        }).addTo(map).bindTooltip(name, { direction: "top" });
      };

      result.overnightStops.forEach(s =>
        emojiMarker([s.location.latitude, s.location.longitude], "🌙",
          `Overnight${s.nearestCity?.name ? ` near ${s.nearestCity.name}` : ""}`));

      if (cancelled) return;

      // Frame the whole journey, then reveal the map immediately.
      try {
        if (allPts.length > 0) {
          const bounds = L.latLngBounds(allPts);
          if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] });
        }
      } catch { /* leave default view */ }
      if (!cancelled) setPhase("ready");

      // Real petrol pumps + places to eat ALONG the traced road (OpenStreetMap /
      // Overpass, keyless). Fetched after the map shows so the markers just pop in;
      // any failure simply leaves the route without POIs. Ground legs only — pumps
      // and roadside food are meaningless under a flight or ferry arc.
      const pois = await fetchPois(roadPts, controller.signal);
      if (cancelled) return;
      thin(pois.filter(p => p.kind === "fuel"), 8).forEach(p =>
        poiMarker([p.lat, p.lng], "⛽", p.name));
      thin(pois.filter(p => p.kind === "food"), 12).forEach(p =>
        poiMarker([p.lat, p.lng], "🍽️", p.name));
    })();

    return () => {
      cancelled = true;
      controller.abort();
      if (mapRef.current) {
        try { mapRef.current.remove(); } catch { /* noop */ }
        mapRef.current = null;
      }
    };
  }, [result, t]);

  // If anything map-related fails, fall back to the honest SVG schematic.
  if (phase === "failed") return <RouteMap result={result} t={t} />;

  return (
    // `isolation: isolate` keeps Leaflet's internal panes/markers/controls (which carry
    // z-indexes up to ~1000) inside their own stacking context, so the map can never
    // bleed over an app overlay like the Create sheet (z-300) sitting above it.
    <Card t={t} style={{ padding: 0, overflow: "hidden", isolation: "isolate" }}>
      {/* Permanent city labels styled to match the app */}
      <style>{`
        .tv-city-label{background:${t.card};color:${t.text};border:1px solid ${t.border};
          border-radius:6px;padding:1px 6px;font-size:11px;font-weight:700;box-shadow:0 1px 3px rgba(13,19,32,0.15)}
        .tv-city-label::before{display:none}
        .leaflet-container{font-family:inherit}
      `}</style>
      <div style={{ position: "relative" }}>
        <div ref={elRef} style={{ width: "100%", height: 280, background: t.bg2 }} />
        {phase === "loading" && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            background: `${t.bg2}cc`, color: t.muted, fontSize: 13, fontStyle: "italic", gap: 8, zIndex: 500,
          }}>
            <span style={{ fontSize: 18, animation: "spin 2s linear infinite", display: "inline-block", color: t.accent }}>✦</span>
            Tracing the roads…
          </div>
        )}
      </div>

      {/* legend — mirrors the SVG map's key */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "10px 14px", borderTop: `1px solid ${t.border}` }}>
        <Legend swatch={t.success} label="Road / rail" t={t} />
        <Legend swatch={t.secondary} label="Air" t={t} />
        <Legend swatch={t.teal} label="Water" t={t} />
        <Legend swatch={t.accent} label="🌙 Overnight" t={t} />
        <Legend swatch={t.warning} label="⛽ Fuel pumps" t={t} />
        <Legend swatch={t.gold} label="🍽️ Places to eat" t={t} />
      </div>
    </Card>
  );
}

function Legend({ swatch, label, t }: { swatch: string; label: string; t: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 10, height: 10, borderRadius: 3, background: swatch, flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: t.muted, fontWeight: 600 }}>{label}</span>
    </div>
  );
}

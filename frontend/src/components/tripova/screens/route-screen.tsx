"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Theme } from "@/data";
import { Card, Btn, CollapsibleForm, PlannerSkeleton } from "../primitives/index";
import { Icon } from "../icon";
import { api, ApiError } from "@/lib/api";
import { scrollPlannerToTop } from "@/lib/scroll";
import { LiveRouteMap } from "./route-map-live";
import type {
  DestinationResponse,
  PaginatedList,
  RouteLeg,
  RoutePoint,
  RoutePlanRequest,
  TransportKey,
} from "@/lib/types";

// ── Transport presentation (mirrors backend transport.py behaviour flags) ─────
type Medium = "LAND" | "AIR" | "WATER";
const TRANSPORT_META: Record<TransportKey, { label: string; icon: string; medium: Medium }> = {
  CAR: { label: "Car", icon: "🚗", medium: "LAND" },
  MOTORCYCLE: { label: "Motorcycle", icon: "🏍️", medium: "LAND" },
  TRAIN: { label: "Train", icon: "🚆", medium: "LAND" },
  BUS: { label: "Bus", icon: "🚌", medium: "LAND" },
  METRO: { label: "Metro", icon: "🚇", medium: "LAND" },
  BICYCLE: { label: "Bicycle", icon: "🚲", medium: "LAND" },
  WALK: { label: "Walk", icon: "🚶", medium: "LAND" },
  FLIGHT: { label: "Flight", icon: "✈️", medium: "AIR" },
  // FERRY & CRUISE paused — water transport module on hold.
};
const TRANSPORT_KEYS = Object.keys(TRANSPORT_META) as TransportKey[];

// ── Feasibility: only offer transports that actually make sense for the leg ────
// A first-time traveller shouldn't be shown a "Flight" button for a 40 km hop or a
// "Walk" button across the country. We filter modes by the straight-line distance
// (mirroring the backend's drive/train/fly thresholds). Water modes can't be inferred
// from distance alone (no coastline data here), so they live behind "more ways".
function haversineKm(a: RoutePoint, b: RoutePoint): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(s));
}

// Max sensible straight-line distance (km) for each mode; air has a *minimum* instead.
const MODE_MAX_KM: Partial<Record<TransportKey, number>> = {
  WALK: 15, BICYCLE: 60, METRO: 35, BUS: 1800, CAR: 2200, MOTORCYCLE: 2200, TRAIN: 2600,
};
const FLIGHT_MIN_KM = 200;
const WATER_KEYS: TransportKey[] = [];

// Hard ceilings — beyond these a mode is *impossible*, not just unusual, so it's never
// offered even under "more ways" (mirrors backend feasibility.py). MODE_MAX_KM above are
// the softer "best default" limits; these are the absolute cutoffs. A metro doesn't run
// between cities, you can't walk across a state, and you can't fly a 100 km hop.
const MODE_HARD_MAX_KM: Partial<Record<TransportKey, number>> = { WALK: 40, BICYCLE: 200, METRO: 60 };
function isImpossible(k: TransportKey, km: number): boolean {
  if (k === "FLIGHT") return km < FLIGHT_MIN_KM;
  const hardMax = MODE_HARD_MAX_KM[k];
  return hardMax !== undefined && km > hardMax;
}

function feasibleModes(o: RoutePoint | null, d: RoutePoint | null): TransportKey[] {
  if (!o || !d) return TRANSPORT_KEYS; // nothing picked yet → don't pre-judge
  const km = haversineKm(o, d);
  return TRANSPORT_KEYS.filter(k => {
    if (WATER_KEYS.includes(k)) return false;     // revealed only via "more ways"
    if (k === "FLIGHT") return km >= FLIGHT_MIN_KM;
    const max = MODE_MAX_KM[k];
    return max === undefined || km <= max;
  });
}

// The single best mode for a leg — same rule the auto-planner uses.
function recommendedMode(o: RoutePoint, d: RoutePoint): TransportKey {
  const km = haversineKm(o, d);
  if (km <= 250) return "CAR";
  if (km <= 700) return "TRAIN";
  return "FLIGHT";
}

// Why that mode is the pick — so "BEST" isn't a black box. Mirrors the thresholds above.
function recommendedReason(km: number, mode: TransportKey): string {
  const d = Math.round(km);
  if (mode === "CAR") return `Under ~250 km (this leg is ~${d} km), driving is usually fastest door-to-door — no station or airport transfers.`;
  if (mode === "TRAIN") return `At ~${d} km, a train is typically the best balance of cost, comfort and time — faster than a bus, far cheaper than flying.`;
  return `Over ~700 km (this leg is ~${d} km), flying saves the most time even after airport transfers.`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
export function fmtClock(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function fmtDuration(hours: number): string {
  if (!hours || hours <= 0) return "0h";
  const days = Math.floor(hours / 24);
  const h = Math.floor(hours % 24);
  const m = Math.round((hours - Math.floor(hours)) * 60);
  const parts: string[] = [];
  if (days) parts.push(`${days}d`);
  if (h) parts.push(`${h}h`);
  if (!days && m) parts.push(`${m}m`);
  return parts.join(" ") || "0h";
}

export function mediumColor(t: Theme, medium: string): string {
  if (medium === "AIR") return t.secondary;
  if (medium === "WATER") return t.teal;
  return t.success; // LAND
}

// Intercity bus legs have no live timetable (we only have a real city-bus feed for
// Bengaluru/BMTC), so their times are distance-based estimates. Say so plainly and
// link out to where the traveller can see the actual buses & operators for the route,
// rather than dressing an estimate up as a schedule.
export function BusEstimateNote({ from, to, t }: { from: string; to: string; t: Theme }) {
  const q = encodeURIComponent(`bus from ${from} to ${to}`);
  return (
    <div style={{ fontSize: 11.5, marginTop: 4 }}>
      <span style={{ display: "block", color: t.muted, fontStyle: "italic" }}>
        Estimated from distance — no live intercity bus timetable.
      </span>
      <a
        href={`https://www.google.com/search?q=${q}`}
        target="_blank"
        rel="noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, color: t.accent, fontWeight: 700, textDecoration: "none", marginTop: 2 }}
      >
        Find real buses &amp; operators →
      </a>
    </div>
  );
}

// Flights need a paid/keyed provider, and even then thinner routes/dates (e.g. a
// regional airport like Indore) often have no cached fare — so a FLIGHT leg can come
// back with times but no real flight number. Rather than silently show nothing, say the
// flight is estimated and link the traveller to a live flight search for the route.
export function FlightEstimateNote({ from, to, t }: { from: string; to: string; t: Theme }) {
  const q = encodeURIComponent(`flights from ${from} to ${to}`);
  return (
    <div style={{ fontSize: 11.5, marginTop: 4 }}>
      <span style={{ display: "block", color: t.muted, fontStyle: "italic" }}>
        No live flight found for this route/date — times &amp; cost are estimated.
      </span>
      <a
        href={`https://www.google.com/travel/flights?q=${q}`}
        target="_blank"
        rel="noreferrer"
        style={{ display: "inline-flex", alignItems: "center", gap: 4, color: t.accent, fontWeight: 700, textDecoration: "none", marginTop: 2 }}
      >
        Find real flights &amp; fares →
      </a>
    </div>
  );
}

export interface LegResponse {
  legIndex: number; transport: string; medium: string; label: string; icon: string;
  from: RoutePoint; to: RoutePoint; distanceKm: number;
  departureTime: string; arrivalTime: string; durationHours: number;
  // Real train identity (TRAIN legs only), from the datameet/railways dataset.
  // scheduled* present only on a direct timetable match; otherwise times are estimates.
  trainNumber?: string | null; trainName?: string | null;
  scheduledDeparture?: string | null; scheduledArrival?: string | null;
  // Real flight identity (FLIGHT legs only), from the configured provider.
  // scheduled* present only on a match; priceText is indicative.
  flightNumber?: string | null; airline?: string | null;
  fromAirport?: string | null; toAirport?: string | null; priceText?: string | null;
}
interface SegmentResponse {
  legIndex: number; transport: string; medium: string; day: number;
  startTime: string; endTime: string;
  startPoint: { latitude: number; longitude: number };
  endPoint: { latitude: number; longitude: number };
  distanceKm: number; travelHours: number;
}
interface OvernightStop {
  legIndex: number; transport: string; day: number; arrivalTime: string; resumeTime: string;
  location: { latitude: number; longitude: number };
  nearestCity?: { name: string; city?: string; state?: string } | null;
  options: { type: string; label: string; hotels?: Record<string, unknown>[] }[];
}
interface FuelStop {
  legIndex: number; atKm: number; location: { latitude: number; longitude: number }; estimatedTime?: string | null;
}
export interface RoutePlanResult {
  travelMode: string; transport: string; medium: string;
  origin: RoutePoint; destination: RoutePoint;
  distanceKm: number; estimatedDurationHours: number;
  departureTime: string; arrivalTime: string;
  legs: LegResponse[]; segments: SegmentResponse[];
  overnightStops: OvernightStop[]; fuelStops: FuelStop[]; notes: string[];
  tripId?: string | null;
}

// Each endpoint keeps both the resolved point (lat/lng) and the raw text the user typed.
// The text lives here (not just inside PointInput) so that "Plan Route" can resolve any
// endpoint the user filled but never blurred — fixing the click-vs-blur race where the
// form looked complete but validation saw null coordinates.
type FormLeg = {
  origin: RoutePoint | null; originText: string;
  destination: RoutePoint | null; destinationText: string;
  transport: TransportKey;
};

export function RouteScreen({ t, onUseAutoPlanner, onOpenTransit, embedded = false }: { t: Theme; onUseAutoPlanner?: () => void; onOpenTransit?: () => void; embedded?: boolean }) {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [legs, setLegs] = useState<FormLeg[]>([{ origin: null, originText: "", destination: null, destinationText: "", transport: "CAR" }]);
  const [showAllModes, setShowAllModes] = useState(false);
  const [departure, setDeparture] = useState("");
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoutePlanResult | null>(null);
  // Per-overnight-stop chosen option (keyed by `${legIndex}-${day}`).
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Live destinations (with coords) seed the autocomplete suggestions. They're only a
  // convenience — any city the user types is resolved live via /api/trips/geocode, so
  // the planner is never limited to this list (no hardcoded dropdown).
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<PaginatedList<DestinationResponse>>("/api/destinations?page=1&per_page=100");
        const live: RoutePoint[] = (res.items || [])
          .filter(d => typeof d.latitude === "number" && typeof d.longitude === "number")
          .map(d => ({ name: d.name, latitude: d.latitude as number, longitude: d.longitude as number }));
        const byName = new Map<string, RoutePoint>();
        live.forEach(p => { if (!byName.has(p.name)) byName.set(p.name, p); });
        setPoints(Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        // no suggestions — free-text + geocode still works
      }
    })();
  }, []);

  const pointNames = useMemo(() => points.map(p => p.name), [points]);

  // Case-insensitive lookup against the already-known points (live destinations or
  // cities resolved earlier this session) — avoids a network round-trip for repeats.
  const findPoint = (name: string): RoutePoint | null => {
    const q = name.trim().toLowerCase();
    return points.find(p => p.name.toLowerCase() === q) ?? null;
  };

  // Pure-ish resolver: a typed city → coordinates (known point first, else backend
  // geocode). Returns the point (or null + a friendly message). It only touches the
  // shared known-points cache; it never mutates a leg, so it's safe to call both from
  // the input's blur handler and from planRoute's pre-submit flush.
  const resolvePoint = async (name: string): Promise<{ point: RoutePoint | null; message?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) return { point: null };
    const local = findPoint(trimmed);
    if (local) return { point: local };
    try {
      const pt = await api.get<RoutePoint & { source?: string }>(`/api/trips/geocode?q=${encodeURIComponent(trimmed)}`);
      const point: RoutePoint = { name: pt.name, latitude: pt.latitude, longitude: pt.longitude };
      setPoints(ps => (ps.some(p => p.name.toLowerCase() === point.name.toLowerCase())
        ? ps
        : [...ps, point].sort((a, b) => a.name.localeCompare(b.name))));
      return { point };
    } catch (e) {
      let message = `Couldn't find "${trimmed}". Try a more specific name (add the state).`;
      if (e instanceof ApiError) {
        const d = e.detail as unknown;
        if (typeof d === "string") message = d;
        else if (d && typeof d === "object" && typeof (d as { detail?: unknown }).detail === "string") {
          message = (d as { detail: string }).detail;
        }
      }
      return { point: null, message };
    }
  };

  const setLeg = (i: number, patch: Partial<FormLeg>) =>
    setLegs(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  // Live text edits: store the raw text and clear the resolved point — it's now stale
  // until the user blurs (or hits Plan), which re-resolves it.
  const setLegText = (i: number, which: "origin" | "destination", text: string) =>
    setLegs(ls => ls.map((l, idx) => (idx === i ? { ...l, [which]: null, [`${which}Text`]: text } : l)));

  // Commit a resolved (or cleared) endpoint into a leg, keeping its text in sync and the
  // transport sensible: once both ends are known we preselect the recommended mode and
  // never leave an impossible one selected (e.g. a flight chosen before the leg turned
  // out to be 30 km).
  const applyEndpoint = (i: number, which: "origin" | "destination", point: RoutePoint | null, text: string) =>
    setLegs(ls => ls.map((l, idx) => {
      if (idx !== i) return l;
      const next: FormLeg = { ...l, [which]: point, [`${which}Text`]: text };
      if (next.origin && next.destination) {
        const feasible = feasibleModes(next.origin, next.destination);
        if (!feasible.includes(next.transport)) next.transport = recommendedMode(next.origin, next.destination);
      }
      return next;
    }));

  // Blur/Enter handler for an endpoint input: resolve the typed text and commit it.
  const resolveEndpoint = async (
    i: number,
    which: "origin" | "destination",
    name: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) { applyEndpoint(i, which, null, ""); return { ok: true }; }
    const { point, message } = await resolvePoint(trimmed);
    // On success snap the text to the geocoder's canonical name; on failure keep the
    // user's text (and clear the point) so they can correct it.
    applyEndpoint(i, which, point, point ? point.name : trimmed);
    return point ? { ok: true } : { ok: false, message };
  };

  const addLeg = () =>
    setLegs(ls => {
      const prev = ls[ls.length - 1];
      // New leg starts where the last one ends — that's what makes it one journey.
      return [...ls, {
        origin: prev?.destination ?? null, originText: prev?.destinationText ?? "",
        destination: null, destinationText: "", transport: "CAR",
      }];
    });

  const removeLeg = (i: number) => setLegs(ls => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)));

  const buildBody = (sourceLegs: FormLeg[], save: boolean): RoutePlanRequest => {
    const body: RoutePlanRequest = {
      legs: sourceLegs.map<RouteLeg>(l => ({
        origin: l.origin as RoutePoint,
        destination: l.destination as RoutePoint,
        transport: l.transport,
      })),
    };
    if (departure) body.departureTime = new Date(departure).toISOString();
    if (save) body.save = true;
    return body;
  };

  const planRoute = async () => {
    setError(null);
    setLoading(true);
    // Flush any endpoint the user typed but never blurred (or that's mid-resolve) before
    // validating — this is what fixes the race where the form looked complete but the
    // synchronous validation saw null coordinates and rejected it.
    const resolved = await Promise.all(legs.map(async (l) => {
      let { origin, originText, destination, destinationText } = l;
      if (!origin && originText.trim()) {
        const r = await resolvePoint(originText.trim());
        if (r.point) { origin = r.point; originText = r.point.name; }
      }
      if (!destination && destinationText.trim()) {
        const r = await resolvePoint(destinationText.trim());
        if (r.point) { destination = r.point; destinationText = r.point.name; }
      }
      return { ...l, origin, originText, destination, destinationText };
    }));
    setLegs(resolved); // reflect resolved coords back into chips/feasibility/inputs
    for (let i = 0; i < resolved.length; i++) {
      if (!resolved[i].origin || !resolved[i].destination) {
        setError(`Leg ${i + 1}: pick both a start and an end point.`);
        setLoading(false);
        return;
      }
    }
    setResult(null);
    setChoices({});
    setSavedId(null);
    try {
      const res = await api.post<RoutePlanResult>("/api/trips/route-plan", buildBody(resolved, false));
      setResult(res);
      setFormOpen(false);
      scrollPlannerToTop();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not plan this route. Is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  const saveRoute = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<RoutePlanResult>("/api/trips/route-plan", buildBody(legs, true));
      setSavedId(res.tripId || "saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this route.");
    } finally {
      setSaving(false);
    }
  };

  const routeSummary = (() => {
    const from = legs[0]?.origin?.name;
    const to = legs[legs.length - 1]?.destination?.name;
    const n = legs.length;
    return `${from || "?"} → ${to || "?"} · ${n} ${n === 1 ? "leg" : "legs"}`;
  })();

  return (
    <div style={{ padding: embedded ? 0 : "0 16px 16px" }}>
      {!embedded && (
        <div style={{ background: `linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, borderRadius: 12, padding: "13px 16px", marginBottom: 18, border: `1px solid ${t.accent}20` }}>
          <div style={{ fontSize: 14, color: t.accent, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="Route" size={16} color={t.accent} /> Route &amp; Map Planner
          </div>
          <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>
            The hands-on planner: chain your own legs — drive, train, then fly. We estimate times,
            plot the real roads, and flag where to stop overnight.
          </div>
        </div>
      )}

      {/* Escape hatch — most people shouldn't have to pick modes at all. The auto-planner
          shortcut is hidden when embedded (the hub's Auto/Manual toggle already covers it);
          the live-bus link stays, as it's the only entry point to the transit tracker. */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        {onUseAutoPlanner && !embedded && (
          <button onClick={onUseAutoPlanner}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${t.accent}`, background: t.accent + "10", color: t.text, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.accent + "1e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="Sparkles" size={17} color={t.accent} />
            </div>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: t.accent }}>Don&apos;t want to pick? Let us plan it</span>
              <span style={{ display: "block", fontSize: 11.5, color: t.muted, marginTop: 1 }}>Just enter where you&apos;re going — we choose the transport for you.</span>
            </span>
            <Icon name="ChevronRight" size={18} color={t.accent} />
          </button>
        )}
        {onOpenTransit && (
          <button onClick={onOpenTransit}
            style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${t.secondary}`, background: t.secondary + "10", color: t.text, cursor: "pointer" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: t.secondary + "1e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name="Bus" size={17} color={t.secondary} />
            </div>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 13.5, fontWeight: 700, color: t.secondary }}>🚍 Live BMTC Bus Tracker</span>
              <span style={{ display: "block", fontSize: 11.5, color: t.muted, marginTop: 1 }}>Track live Bengaluru city buses — route, stops, ETAs.</span>
            </span>
            <Icon name="ChevronRight" size={18} color={t.secondary} />
          </button>
        )}
      </div>

      {/* ── Builder (collapses to a compact bar once a route exists) ──────── */}
      <CollapsibleForm t={t} title="Route details" open={formOpen} onToggle={() => setFormOpen(o => !o)} canCollapse={!!result} summary={routeSummary}>
        {legs.map((leg, i) => {
          const meta = TRANSPORT_META[leg.transport];
          return (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < legs.length - 1 ? `1px dashed ${t.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: 2, textTransform: "uppercase" }}>
                  Leg {i + 1}
                </div>
                {legs.length > 1 && (
                  <button onClick={() => removeLeg(i)} style={{ background: "transparent", border: "none", color: t.danger, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                    <Icon name="X" size={12} color={t.danger} /> Remove
                  </button>
                )}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <PointInput label="From" text={leg.originText} resolved={!!leg.origin} knownNames={pointNames} onText={v => setLegText(i, "origin", v)} onResolve={n => resolveEndpoint(i, "origin", n)} t={t} />
                <PointInput label="To" text={leg.destinationText} resolved={!!leg.destination} knownNames={pointNames} onText={v => setLegText(i, "destination", v)} onResolve={n => resolveEndpoint(i, "destination", n)} t={t} />
              </div>
              {(() => {
                const bothSet = !!leg.origin && !!leg.destination;
                const feasible = feasibleModes(leg.origin, leg.destination);
                const recommended = bothSet ? recommendedMode(leg.origin!, leg.destination!) : null;
                // Show feasible modes; "more ways" reveals the rest (incl. water) for edge
                // cases — but never the impossible ones (intercity metro, a 100 km flight).
                const km = bothSet ? haversineKm(leg.origin!, leg.destination!) : 0;
                const allModes = bothSet ? TRANSPORT_KEYS.filter(k => !isImpossible(k, km)) : TRANSPORT_KEYS;
                const shown = showAllModes ? allModes : feasible;
                const hiddenCount = allModes.length - feasible.length;
                return (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
                  {bothSet ? "How you'll travel" : "Transport"}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {shown.map(k => {
                    const active = leg.transport === k;
                    const isRec = k === recommended;
                    return (
                      <button key={k} onClick={() => setLeg(i, { transport: k })} title={TRANSPORT_META[k].label}
                        style={{ padding: "6px 9px", borderRadius: 8, border: `1.5px solid ${active ? t.accent : t.border}`, background: active ? t.accent + "12" : t.tag, color: active ? t.accent : t.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
                        <span style={{ fontSize: 14 }}>{TRANSPORT_META[k].icon}</span>{TRANSPORT_META[k].label}
                        {isRec && !active && <span style={{ fontSize: 8.5, fontWeight: 800, color: t.success, letterSpacing: 0.5 }}>BEST</span>}
                      </button>
                    );
                  })}
                  {bothSet && hiddenCount > 0 && (
                    <button onClick={() => setShowAllModes(s => !s)}
                      style={{ padding: "6px 9px", borderRadius: 8, border: `1.5px dashed ${t.border}`, background: "transparent", color: t.muted, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                      {showAllModes ? "Fewer ways" : `+ More ways`}
                    </button>
                  )}
                </div>
                {/* Why the BEST badge picked what it did — distance-based, the same rule the
                    auto-planner uses. Shown whenever both endpoints are set. */}
                {bothSet && recommended && (
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 6, marginTop: 8, padding: "8px 10px", borderRadius: 8, background: t.success + "12", border: `1px solid ${t.success}25` }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name="Sparkles" size={13} color={t.success} /></span>
                    <span style={{ fontSize: 11, color: t.text, lineHeight: 1.45 }}>
                      <strong style={{ color: t.success }}>Best: {TRANSPORT_META[recommended].label}.</strong>{" "}
                      {recommendedReason(km, recommended)}
                      {leg.transport !== recommended && (
                        <span style={{ color: t.muted }}> You&apos;ve picked {TRANSPORT_META[leg.transport].label} instead.</span>
                      )}
                    </span>
                  </div>
                )}
                <div style={{ fontSize: 11, color: t.muted, marginTop: 6, fontStyle: "italic" }}>
                  {meta.medium === "LAND" && (leg.transport === "CAR" || leg.transport === "MOTORCYCLE")
                    ? "Self-driven — fuel stops + overnight rest are planned along this leg."
                    : meta.medium === "LAND" && (leg.transport === "TRAIN" || leg.transport === "BUS" || leg.transport === "METRO")
                    ? "Scheduled — one continuous ride, no roadside fuel or overnight stops."
                    : meta.medium === "AIR"
                    ? "Air leg — continuous, arrive the same journey."
                    : meta.medium === "WATER"
                    ? "Water leg — continuous, you rest on board."
                    : "Continuous leg."}
                </div>
              </div>
                );
              })()}
            </div>
          );
        })}

        <button onClick={addLeg} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1.5px dashed ${t.border}`, color: t.accent, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", width: "100%", justifyContent: "center", marginBottom: 14 }}>
          <Icon name="Plus" size={14} color={t.accent} /> Add another leg
        </button>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 7 }}>Departure (optional)</div>
          <input type="datetime-local" aria-label="Departure date and time" value={departure} onChange={e => setDeparture(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          <div style={{ fontSize: 11, color: t.muted, marginTop: 5, fontStyle: "italic" }}>Leave blank to depart tomorrow at 08:00.</div>
        </div>

        {error && <div style={{ background: t.danger + "12", border: `1px solid ${t.danger}25`, borderRadius: 8, padding: "10px 14px", color: t.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <Btn onClick={planRoute} disabled={loading} full t={t}>{loading ? "Plotting your journey..." : "✦ Plan Route & Map"}</Btn>
      </CollapsibleForm>

      {loading && <PlannerSkeleton t={t} label="Estimating times and stops…" rows={2} />}

      {result && <RouteResult result={result} choices={choices} setChoices={setChoices} onSave={saveRoute} saving={saving} savedId={savedId} t={t} />}
    </div>
  );
}

// ── Free-text city box (any city, not a fixed dropdown) ───────────────────────
// Suggestions come from live destinations via a native datalist, but the user can
// type ANY place. The raw text is owned by the parent (`text`) so planRoute can resolve
// it even if the user never blurred; on commit (blur/Enter) the parent resolves it
// through the backend geocoder. `resolved` is true once a point is attached. Status
// line reports locating / not-found inline.
function PointInput({ label, text, resolved, knownNames, onText, onResolve, t }: {
  label: string; text: string; resolved: boolean; knownNames: string[];
  onText: (value: string) => void;
  onResolve: (name: string) => Promise<{ ok: boolean; message?: string }>; t: Theme;
}) {
  const [status, setStatus] = useState<"idle" | "resolving" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const listId = React.useId();

  const commit = async () => {
    const name = text.trim();
    // Empty, or already resolved to a point — nothing to look up.
    if (!name || resolved) { setStatus("idle"); setMessage(null); return; }
    setStatus("resolving");
    setMessage(null);
    const res = await onResolve(name);
    if (res.ok) { setStatus("idle"); setMessage(null); }
    else { setStatus("error"); setMessage(res.message ?? "Couldn't find that place."); }
  };

  const borderColor = status === "error" ? t.danger : resolved ? t.accent : t.border;
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <input
        aria-label={label}
        list={listId}
        value={text}
        onChange={e => { onText(e.target.value); if (status === "error") { setStatus("idle"); setMessage(null); } }}
        onBlur={commit}
        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); commit(); } }}
        placeholder="Type any city…"
        style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${borderColor}`, background: t.card, color: text ? t.text : t.muted, fontSize: 13, outline: "none", boxSizing: "border-box" }}
      />
      <datalist id={listId}>
        {knownNames.map(n => <option key={n} value={n} />)}
      </datalist>
      {status === "resolving" && <div style={{ fontSize: 10.5, color: t.muted, marginTop: 4, fontStyle: "italic" }}>Locating…</div>}
      {status === "error" && message && <div style={{ fontSize: 10.5, color: t.danger, marginTop: 4 }}>{message}</div>}
    </div>
  );
}

// ── Result: map + summary + timeline + stop choices ───────────────────────────
function RouteResult({ result, choices, setChoices, onSave, saving, savedId, t }: {
  result: RoutePlanResult; choices: Record<string, string>;
  setChoices: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSave: () => void; saving: boolean; savedId: string | null; t: Theme;
}) {
  return (
    <div>
      <LiveRouteMap result={result} t={t} />

      {/* Save / persist the computed route as a trip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", marginBottom: 14, borderRadius: 14, border: `1px solid ${savedId ? t.success : t.border}`, background: savedId ? t.success + "12" : t.card }}>
        <div style={{ fontSize: 12.5, color: savedId ? t.success : t.muted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={savedId ? "Check" : "Bookmark"} size={15} color={savedId ? t.success : t.muted} />
          {savedId ? "Saved to your trips" : "Keep this route for later"}
        </div>
        {!savedId && (
          <button onClick={onSave} disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: t.accent, color: t.onAccent, fontSize: 12.5, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save route"}
          </button>
        )}
      </div>

      <Card t={t}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Stat label="Total distance" value={`${Math.round(result.distanceKm).toLocaleString()} km`} t={t} />
          <Stat label="Time in transit" value={fmtDuration(result.estimatedDurationHours)} t={t} />
          <Stat label="Departs" value={fmtClock(result.departureTime)} t={t} />
          <Stat label="Arrives" value={fmtClock(result.arrivalTime)} t={t} />
        </div>
        {result.notes.length > 0 && (
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${t.border}` }}>
            {result.notes.map((n, i) => {
              const warn = n.startsWith("⚠️");
              return (
                <div key={i} style={{ fontSize: 12, color: warn ? t.warning : t.muted, marginBottom: 6, lineHeight: 1.5, fontWeight: warn ? 600 : 400, ...(warn ? { background: t.warning + "14", border: `1px solid ${t.warning}33`, borderRadius: 8, padding: "8px 10px" } : {}) }}>{n}</div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Per-leg timeline */}
      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14 }}>🧭 Journey timeline</div>
        {result.legs.map((leg, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < result.legs.length - 1 ? 16 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: mediumColor(t, leg.medium) + "18", border: `1.5px solid ${mediumColor(t, leg.medium)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{leg.icon}</div>
              {i < result.legs.length - 1 && <div style={{ flex: 1, width: 2, background: t.border, marginTop: 4 }} />}
            </div>
            <div style={{ flex: 1, paddingBottom: 2 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{leg.from.name} → {leg.to.name}</div>
              <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                {leg.label} · {Math.round(leg.distanceKm).toLocaleString()} km · {fmtDuration(leg.durationHours)}
              </div>
              <div style={{ fontSize: 11.5, color: t.secondary, marginTop: 3, fontWeight: 600 }}>
                {fmtClock(leg.departureTime)} → {fmtClock(leg.arrivalTime)}
              </div>
              {leg.trainNumber && (
                <div style={{ fontSize: 11.5, color: t.text, marginTop: 4, fontWeight: 700 }}>
                  🚆 Train {leg.trainNumber}{leg.trainName ? ` · ${leg.trainName}` : ""}
                  {leg.scheduledDeparture ? (
                    <span style={{ display: "block", color: t.muted, fontWeight: 600, marginTop: 1 }}>
                      Scheduled {leg.scheduledDeparture} → {leg.scheduledArrival}
                    </span>
                  ) : (
                    <span style={{ display: "block", color: t.muted, fontWeight: 400, fontStyle: "italic", marginTop: 1 }}>
                      Times above are estimated
                    </span>
                  )}
                </div>
              )}
              {leg.flightNumber && (
                <div style={{ fontSize: 11.5, color: t.text, marginTop: 4, fontWeight: 700 }}>
                  ✈️ {leg.flightNumber}{leg.airline ? ` · ${leg.airline}` : ""}
                  {leg.scheduledDeparture ? (
                    <span style={{ display: "block", color: t.muted, fontWeight: 600, marginTop: 1 }}>
                      Scheduled {leg.scheduledDeparture} → {leg.scheduledArrival}
                      {leg.priceText ? ` · from ${leg.priceText}` : ""}
                    </span>
                  ) : (
                    <span style={{ display: "block", color: t.muted, fontWeight: 400, fontStyle: "italic", marginTop: 1 }}>
                      Times above are estimated
                    </span>
                  )}
                </div>
              )}
              {/* Flight leg with no live flight matched — be explicit it's an estimate and
                  point to a real flight search, the same way bus legs are handled. */}
              {leg.transport === "FLIGHT" && !leg.flightNumber && (
                <FlightEstimateNote from={leg.from.name} to={leg.to.name} t={t} />
              )}
              {/* No live intercity bus timetable exists, so we never imply a specific
                  bus. Be explicit that the clock is an estimate and point to where the
                  traveller can find the real operators/buses for this route. */}
              {leg.transport === "BUS" && <BusEstimateNote from={leg.from.name} to={leg.to.name} t={t} />}
            </div>
          </div>
        ))}
      </Card>

      {/* Overnight stops with the traveller's choice */}
      {result.overnightStops.length > 0 && (
        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>🌙 Overnight stops</div>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 12 }}>Driving pauses for the night — pick what you&apos;ll do at each.</div>
          {result.overnightStops.map((stop, i) => {
            const key = `${stop.legIndex}-${stop.day}`;
            const chosen = choices[key];
            const cityName = stop.nearestCity?.name || stop.nearestCity?.city || "an unnamed spot";
            return (
              <div key={i} style={{ marginBottom: 14, padding: 12, borderRadius: 12, background: t.tag, border: `1px solid ${t.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>Night near {cityName}</div>
                <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, marginBottom: 10 }}>
                  Arrive {fmtClock(stop.arrivalTime)} · resume {fmtClock(stop.resumeTime)}
                </div>
                {stop.options.map(opt => {
                  const active = chosen === opt.type;
                  return (
                    <div key={opt.type} style={{ marginBottom: 6 }}>
                      <button onClick={() => setChoices(c => ({ ...c, [key]: opt.type }))}
                        style={{ width: "100%", textAlign: "left", display: "flex", alignItems: "center", gap: 9, padding: "9px 11px", borderRadius: 9, border: `1.5px solid ${active ? t.accent : t.border}`, background: active ? t.accent + "12" : t.card, color: active ? t.accent : t.text, fontSize: 12.5, fontWeight: active ? 700 : 500, cursor: "pointer", transition: "all 0.15s" }}>
                        <span style={{ width: 15, height: 15, borderRadius: "50%", border: `1.5px solid ${active ? t.accent : t.muted}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          {active && <span style={{ width: 7, height: 7, borderRadius: "50%", background: t.accent }} />}
                        </span>
                        {opt.label}
                      </button>
                      {active && opt.type === "BOOK_HOTEL" && (
                        <div style={{ marginTop: 6, marginLeft: 24 }}>
                          {opt.hotels && opt.hotels.length > 0 ? opt.hotels.map((h, hi) => (
                            <div key={hi} style={{ padding: "7px 10px", borderRadius: 8, background: t.card, border: `1px solid ${t.border}`, marginBottom: 5 }}>
                              <div style={{ fontSize: 12.5, fontWeight: 700, color: t.text }}>{String(h.name ?? "Stay")}</div>
                              <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>
                                {[h.type, h.price_range, h.external_rating ? `★ ${h.external_rating}` : null].filter(Boolean).join(" · ")}
                              </div>
                              {h.phone ? <div style={{ fontSize: 11, color: t.secondary, marginTop: 1 }}>📞 {String(h.phone)}</div> : null}
                            </div>
                          )) : (
                            <div style={{ fontSize: 11.5, color: t.muted, fontStyle: "italic" }}>No listed stays here yet — search on arrival.</div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </Card>
      )}

      {/* Fuel stops */}
      {result.fuelStops.length > 0 && (
        <Card t={t}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 4 }}>⛽ Fuel stops</div>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 12 }}>Plan a refuel roughly at each point along the self-driven legs.</div>
          {result.fuelStops.map((fs, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: i < result.fuelStops.length - 1 ? `1px solid ${t.border}` : "none" }}>
              <div style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>~{Math.round(fs.atKm).toLocaleString()} km in</div>
              <div style={{ fontSize: 12, color: t.secondary, fontWeight: 600 }}>{fmtClock(fs.estimatedTime)}</div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: t.text }}>{value}</div>
    </div>
  );
}

// ── Inline SVG map (straight-line projection — honest about the estimate model) ─
export function RouteMap({ result, t }: { result: RoutePlanResult; t: Theme }) {
  const VW = 100, VH = 64, PAD = 8;

  const geo = useMemo(() => {
    const pts: { lat: number; lng: number }[] = [];
    result.segments.forEach(s => {
      pts.push({ lat: s.startPoint.latitude, lng: s.startPoint.longitude });
      pts.push({ lat: s.endPoint.latitude, lng: s.endPoint.longitude });
    });
    result.legs.forEach(l => {
      pts.push({ lat: l.from.latitude, lng: l.from.longitude });
      pts.push({ lat: l.to.latitude, lng: l.to.longitude });
    });
    result.overnightStops.forEach(s => pts.push({ lat: s.location.latitude, lng: s.location.longitude }));
    result.fuelStops.forEach(s => pts.push({ lat: s.location.latitude, lng: s.location.longitude }));
    if (pts.length === 0) return null;

    const lats = pts.map(p => p.lat), lngs = pts.map(p => p.lng);
    const minLat = Math.min(...lats), maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
    const spanLat = maxLat - minLat || 1, spanLng = maxLng - minLng || 1;
    const project = (lat: number, lng: number) => ({
      x: PAD + ((lng - minLng) / spanLng) * (VW - 2 * PAD),
      y: PAD + ((maxLat - lat) / spanLat) * (VH - 2 * PAD), // invert lat for screen y
    });
    return { project };
  }, [result]);

  if (!geo) return null;

  return (
    <Card t={t} style={{ padding: 0, overflow: "hidden", isolation: "isolate" }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} style={{ width: "100%", display: "block", background: `linear-gradient(160deg,${t.bg2},${t.tag})` }}>
        {/* subtle grid */}
        {[0.25, 0.5, 0.75].map(f => (
          <g key={f} stroke={t.border} strokeWidth={0.15} opacity={0.6}>
            <line x1={PAD + f * (VW - 2 * PAD)} y1={PAD} x2={PAD + f * (VW - 2 * PAD)} y2={VH - PAD} />
            <line x1={PAD} y1={PAD + f * (VH - 2 * PAD)} x2={VW - PAD} y2={PAD + f * (VH - 2 * PAD)} />
          </g>
        ))}

        {/* leg paths, coloured by medium; air legs dashed */}
        {result.segments.map((s, i) => {
          const a = geo.project(s.startPoint.latitude, s.startPoint.longitude);
          const b = geo.project(s.endPoint.latitude, s.endPoint.longitude);
          const col = mediumColor(t, s.medium);
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={col} strokeWidth={0.9} strokeLinecap="round" strokeDasharray={s.medium === "AIR" ? "2 1.5" : undefined} opacity={0.95} />;
        })}

        {/* fuel markers */}
        {result.fuelStops.map((fs, i) => {
          const p = geo.project(fs.location.latitude, fs.location.longitude);
          return <circle key={`f${i}`} cx={p.x} cy={p.y} r={0.9} fill={t.warning} stroke={t.card} strokeWidth={0.25} />;
        })}

        {/* overnight markers */}
        {result.overnightStops.map((s, i) => {
          const p = geo.project(s.location.latitude, s.location.longitude);
          return (
            <g key={`o${i}`}>
              <circle cx={p.x} cy={p.y} r={1.5} fill={t.accent} stroke={t.card} strokeWidth={0.3} />
              <text x={p.x} y={p.y + 0.55} textAnchor="middle" fontSize={1.6} fill="#fff">🌙</text>
            </g>
          );
        })}

        {/* leg endpoints + labels */}
        {result.legs.map((leg, i) => {
          const a = geo.project(leg.from.latitude, leg.from.longitude);
          const isFirst = i === 0;
          return (
            <g key={`p${i}`}>
              {isFirst && (
                <>
                  <circle cx={a.x} cy={a.y} r={1.8} fill={t.success} stroke={t.card} strokeWidth={0.4} />
                  <text x={a.x} y={a.y - 2.6} textAnchor="middle" fontSize={2.6} fontWeight={700} fill={t.text}>{leg.from.name}</text>
                </>
              )}
            </g>
          );
        })}
        {(() => {
          const last = result.legs[result.legs.length - 1];
          if (!last) return null;
          const p = geo.project(last.to.latitude, last.to.longitude);
          return (
            <g>
              <circle cx={p.x} cy={p.y} r={2} fill={t.gold} stroke={t.card} strokeWidth={0.4} />
              <text x={p.x} y={p.y - 2.8} textAnchor="middle" fontSize={2.6} fontWeight={700} fill={t.text}>{last.to.name}</text>
            </g>
          );
        })()}
        {/* intermediate leg joins */}
        {result.legs.slice(0, -1).map((leg, i) => {
          const p = geo.project(leg.to.latitude, leg.to.longitude);
          return (
            <g key={`j${i}`}>
              <circle cx={p.x} cy={p.y} r={1.4} fill={t.secondary} stroke={t.card} strokeWidth={0.3} />
              <text x={p.x} y={p.y - 2.2} textAnchor="middle" fontSize={2.2} fontWeight={600} fill={t.muted}>{leg.to.name}</text>
            </g>
          );
        })}
      </svg>

      {/* legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, padding: "10px 14px", borderTop: `1px solid ${t.border}` }}>
        <Legend swatch={t.success} label="Land" t={t} />
        <Legend swatch={t.secondary} label="Air" t={t} />
        <Legend swatch={t.teal} label="Water" t={t} />
        <Legend swatch={t.accent} label="🌙 Overnight" t={t} />
        <Legend swatch={t.warning} label="⛽ Fuel" t={t} />
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

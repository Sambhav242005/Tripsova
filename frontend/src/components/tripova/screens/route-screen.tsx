"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Theme } from "@/data";
import { Card, Btn } from "../primitives/index";
import { Icon } from "../icon";
import { api } from "@/lib/api";
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
  FERRY: { label: "Ferry", icon: "⛴️", medium: "WATER" },
  CRUISE: { label: "Cruise", icon: "🛳️", medium: "WATER" },
};
const TRANSPORT_KEYS = Object.keys(TRANSPORT_META) as TransportKey[];

// A handful of well-known points so the planner is usable (incl. the fly→train→drive
// overseas scenario) even before the destinations DB is fully seeded. Merged with and
// de-duplicated against live API destinations by name.
const CURATED: RoutePoint[] = [
  { name: "Mumbai", latitude: 19.076, longitude: 72.8777 },
  { name: "Delhi", latitude: 28.6139, longitude: 77.209 },
  { name: "Jaipur", latitude: 26.9124, longitude: 75.7873 },
  { name: "Goa", latitude: 15.2993, longitude: 74.124 },
  { name: "Manali", latitude: 32.2396, longitude: 77.1887 },
  { name: "Bengaluru", latitude: 12.9716, longitude: 77.5946 },
  { name: "Tokyo", latitude: 35.6762, longitude: 139.6503 },
  { name: "Kyoto", latitude: 35.0116, longitude: 135.7681 },
  { name: "Nara", latitude: 34.6851, longitude: 135.8048 },
];

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

export interface LegResponse {
  legIndex: number; transport: string; medium: string; label: string; icon: string;
  from: RoutePoint; to: RoutePoint; distanceKm: number;
  departureTime: string; arrivalTime: string; durationHours: number;
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

type FormLeg = { origin: RoutePoint | null; destination: RoutePoint | null; transport: TransportKey };

export function RouteScreen({ t }: { t: Theme }) {
  const [points, setPoints] = useState<RoutePoint[]>(CURATED);
  const [legs, setLegs] = useState<FormLeg[]>([{ origin: null, destination: null, transport: "CAR" }]);
  const [departure, setDeparture] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RoutePlanResult | null>(null);
  // Per-overnight-stop chosen option (keyed by `${legIndex}-${day}`).
  const [choices, setChoices] = useState<Record<string, string>>({});
  const [savedId, setSavedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Pull live destinations (with coords) and merge with the curated seed list.
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<PaginatedList<DestinationResponse>>("/api/destinations?page=1&per_page=50");
        const live: RoutePoint[] = (res.items || [])
          .filter(d => typeof d.latitude === "number" && typeof d.longitude === "number")
          .map(d => ({ name: d.name, latitude: d.latitude as number, longitude: d.longitude as number }));
        const byName = new Map<string, RoutePoint>();
        [...live, ...CURATED].forEach(p => { if (!byName.has(p.name)) byName.set(p.name, p); });
        setPoints(Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name)));
      } catch {
        // keep curated seed list
      }
    })();
  }, []);

  const findPoint = (name: string): RoutePoint | null => points.find(p => p.name === name) ?? null;

  const setLeg = (i: number, patch: Partial<FormLeg>) =>
    setLegs(ls => ls.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));

  const addLeg = () =>
    setLegs(ls => {
      const prev = ls[ls.length - 1];
      // New leg starts where the last one ends — that's what makes it one journey.
      return [...ls, { origin: prev?.destination ?? null, destination: null, transport: "CAR" }];
    });

  const removeLeg = (i: number) => setLegs(ls => (ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)));

  const buildBody = (save: boolean): RoutePlanRequest => {
    const body: RoutePlanRequest = {
      legs: legs.map<RouteLeg>(l => ({
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
    for (let i = 0; i < legs.length; i++) {
      if (!legs[i].origin || !legs[i].destination) {
        setError(`Leg ${i + 1}: pick both a start and an end point.`);
        return;
      }
    }
    setLoading(true);
    setResult(null);
    setChoices({});
    setSavedId(null);
    try {
      const res = await api.post<RoutePlanResult>("/api/trips/route-plan", buildBody(false));
      setResult(res);
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
      const res = await api.post<RoutePlanResult>("/api/trips/route-plan", buildBody(true));
      setSavedId(res.tripId || "saved");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save this route.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ background: `linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, borderRadius: 12, padding: "13px 16px", marginBottom: 18, border: `1px solid ${t.accent}20` }}>
        <div style={{ fontSize: 14, color: t.accent, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="Route" size={16} color={t.accent} /> Route &amp; Map Planner
        </div>
        <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>
          Chain legs — fly, then train, then drive. We estimate times, plot the path, and flag where to stop overnight.
        </div>
      </div>

      {/* ── Builder ───────────────────────────────────────────────────────── */}
      <Card t={t}>
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
                <PointSelect label="From" value={leg.origin?.name ?? ""} points={points} onChange={n => setLeg(i, { origin: findPoint(n) })} t={t} />
                <PointSelect label="To" value={leg.destination?.name ?? ""} points={points} onChange={n => setLeg(i, { destination: findPoint(n) })} t={t} />
              </div>
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>Transport</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {TRANSPORT_KEYS.map(k => {
                    const active = leg.transport === k;
                    return (
                      <button key={k} onClick={() => setLeg(i, { transport: k })} title={TRANSPORT_META[k].label}
                        style={{ padding: "6px 9px", borderRadius: 8, border: `1.5px solid ${active ? t.accent : t.border}`, background: active ? t.accent + "12" : t.tag, color: active ? t.accent : t.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all 0.15s" }}>
                        <span style={{ fontSize: 14 }}>{TRANSPORT_META[k].icon}</span>{TRANSPORT_META[k].label}
                      </button>
                    );
                  })}
                </div>
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
            </div>
          );
        })}

        <button onClick={addLeg} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1.5px dashed ${t.border}`, color: t.accent, borderRadius: 10, padding: "9px 12px", fontSize: 12.5, fontWeight: 700, cursor: "pointer", width: "100%", justifyContent: "center", marginBottom: 14 }}>
          <Icon name="Plus" size={14} color={t.accent} /> Add another leg
        </button>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 7 }}>Departure (optional)</div>
          <input type="datetime-local" value={departure} onChange={e => setDeparture(e.target.value)}
            style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1.5px solid ${t.border}`, background: t.card, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          <div style={{ fontSize: 11, color: t.muted, marginTop: 5, fontStyle: "italic" }}>Leave blank to depart tomorrow at 08:00.</div>
        </div>

        {error && <div style={{ background: t.danger + "12", border: `1px solid ${t.danger}25`, borderRadius: 8, padding: "10px 14px", color: t.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <Btn onClick={planRoute} disabled={loading} full t={t}>{loading ? "Plotting your journey..." : "✦ Plan Route & Map"}</Btn>
      </Card>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 30, animation: "spin 2s linear infinite", display: "inline-block", marginBottom: 12, color: t.accent }}>✦</div>
          <div style={{ color: t.muted, fontSize: 14, fontStyle: "italic" }}>Estimating times and stops...</div>
        </div>
      )}

      {result && <RouteResult result={result} choices={choices} setChoices={setChoices} onSave={saveRoute} saving={saving} savedId={savedId} t={t} />}
    </div>
  );
}

// ── Searchable native select over known points ────────────────────────────────
function PointSelect({ label, value, points, onChange, t }: {
  label: string; value: string; points: RoutePoint[]; onChange: (name: string) => void; t: Theme;
}) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "11px 12px", borderRadius: 10, border: `1.5px solid ${value ? t.accent : t.border}`, background: t.card, color: value ? t.text : t.muted, fontSize: 13, outline: "none", boxSizing: "border-box", cursor: "pointer", appearance: "none" }}>
        <option value="">Select…</option>
        {points.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
      </select>
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
      <RouteMap result={result} t={t} />

      {/* Save / persist the computed route as a trip */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", marginBottom: 14, borderRadius: 14, border: `1px solid ${savedId ? t.success : t.border}`, background: savedId ? t.success + "12" : t.card }}>
        <div style={{ fontSize: 12.5, color: savedId ? t.success : t.muted, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name={savedId ? "Check" : "Bookmark"} size={15} color={savedId ? t.success : t.muted} />
          {savedId ? "Saved to your trips" : "Keep this route for later"}
        </div>
        {!savedId && (
          <button onClick={onSave} disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 10, border: "none", background: t.accent, color: "#fff", fontSize: 12.5, fontWeight: 700, cursor: saving ? "default" : "pointer", opacity: saving ? 0.6 : 1 }}>
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
            {result.notes.map((n, i) => (
              <div key={i} style={{ fontSize: 12, color: t.muted, marginBottom: 6, lineHeight: 1.5 }}>{n}</div>
            ))}
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
    <Card t={t} style={{ padding: 0, overflow: "hidden" }}>
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

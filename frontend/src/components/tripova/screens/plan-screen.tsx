"use client";

import React, { useState, useEffect } from "react";
import type { Theme } from "@/data";
import { Card, Btn, InputF, CollapsibleForm, PlannerSkeleton } from "../primitives/index";
import { MultiSelectFood, FoodBadge } from "../badges/index";
import { Icon } from "../icon";
import { useApp } from "../app-provider";
import { api } from "@/lib/api";
import { scrollPlannerToTop } from "@/lib/scroll";
import { fmtClock, fmtDuration, BusEstimateNote, type RoutePlanResult } from "./route-screen";
import { LiveRouteMap } from "./route-map-live";
import type { GettingThere, TransportKey, TripGenerateRequest, TripGenerateResponse } from "@/lib/types";

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

// Staged loading copy — advances on a timer while loading, holding on the last stage
// (we don't know exactly when the model finishes, so we never pretend it's done).
const LOAD_STAGES = ["Resolving your route…", "Finding places & food…", "Building your day-by-day plan…", "Almost there — polishing the details…"];

const TRANSPORT_PRESENTATION: Record<string, { label: string; icon: string }> = {
  CAR: { label: "Car", icon: "🚗" }, MOTORCYCLE: { label: "Motorcycle", icon: "🏍️" },
  TRAIN: { label: "Train", icon: "🚆" }, BUS: { label: "Bus", icon: "🚌" },
  METRO: { label: "Metro", icon: "🚇" }, BICYCLE: { label: "Bicycle", icon: "🚲" },
  WALK: { label: "Walk", icon: "🚶" }, FLIGHT: { label: "Flight", icon: "✈️" },
  // FERRY & CRUISE paused — water transport module on hold.
};

export function PlanScreen({ t, embedded = false }: { t: Theme; embedded?: boolean }) {
  const { setSub } = useApp();
  const [form, setForm] = useState({ origin: "", destination: "", days: "4", groupType: "Friends", travelMode: "CAR" as TransportKey, budget: "10000", interests: [] as string[], foods: [] as string[], groupMode: false, members: [{ name: "Person 1", foods: [] as string[] }] });
  const [loading, setLoading] = useState(false);
  // Cycles a staged status while the (single, slow) generate call is in flight, so the
  // wait reads as progress through sections rather than one long frozen spinner.
  const [loadStage, setLoadStage] = useState(0);
  const [formOpen, setFormOpen] = useState(true);
  const [fuelStops, setFuelStops] = useState<Record<string, unknown>[]>([]);
  const [gettingThere, setGettingThere] = useState<GettingThere | null>(null);
  const [itinerary, setItinerary] = useState<{
    destination: string; totalCost: string; activeFoods: string[]; days: Record<string, unknown>[]; tips: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading) return; // stage is reset in generate() before each run
    const id = window.setInterval(() => setLoadStage(s => Math.min(s + 1, LOAD_STAGES.length - 1)), 2500);
    return () => window.clearInterval(id);
  }, [loading]);

  const groupTypes = [{ id: "Solo", icon: "🧍" }, { id: "Couple", icon: "👫" }, { id: "Family", icon: "👨‍👩‍👧" }, { id: "Friends", icon: "👯" }];
  // Each transport carries its own behaviour; refuel === true means fuel stops are shown.
  const travelModes: { id: TransportKey; icon: string; label: string; refuel: boolean }[] = [
    { id: "CAR", icon: "🚗", label: "Car", refuel: true },
    { id: "MOTORCYCLE", icon: "🏍️", label: "Bike", refuel: true },
    { id: "TRAIN", icon: "🚆", label: "Train", refuel: false },
    { id: "BUS", icon: "🚌", label: "Bus", refuel: false },
    { id: "FLIGHT", icon: "✈️", label: "Flight", refuel: false },
    // FERRY paused — water transport module on hold.
  ];
  const currentMode = travelModes.find(m => m.id === form.travelMode);
  const interests = ["Adventure", "Nature", "Food", "Culture", "Spiritual", "Photography", "Shopping", "Wellness"];
  const toggleI = (i: string) => setForm(f => ({ ...f, interests: f.interests.includes(i) ? f.interests.filter(x => x !== i) : [...f.interests, i] }));
  const tripSummary = [form.destination, `${form.days} ${Number(form.days) === 1 ? "day" : "days"}`, `₹${Number(form.budget || 0).toLocaleString("en-IN")}`].filter(Boolean).join(" · ");

  const generate = async () => {
    if (!form.destination) { setError("Please enter a destination"); return; }
    setLoading(true); setLoadStage(0); setItinerary(null); setError(null); setFuelStops([]); setGettingThere(null);
    const body: TripGenerateRequest = {
      destination: form.destination,
      days: parseInt(form.days),
      budget: parseInt(form.budget),
      peopleCount: form.groupType === "Solo" ? 1 : form.groupType === "Couple" ? 2 : 4,
      tripType: form.groupType,
      travelMode: form.travelMode,
    };
    if (form.origin.trim()) body.origin = form.origin.trim();
    if (form.interests.length > 0) body.travelStyle = form.interests;
    if (form.foods.length > 0) body.dietPreference = form.foods;
    try {
      const res = await api.post<TripGenerateResponse>("/api/trips/generate", body);
      setItinerary(transformResponse(res, form));
      setFuelStops(res.fuelStops || []);
      setGettingThere(res.gettingThere ?? null);
      setFormOpen(false);
      scrollPlannerToTop();
    } catch {
      // No fabricated fallback — show an honest error rather than a fake itinerary.
      setError("Couldn't build your trip right now. Please check your connection and try again.");
    }
    setLoading(false);
  };

  interface ItineraryResult { destination: string; totalCost: string; activeFoods: string[]; days: Record<string, unknown>[]; tips: string[]; }

  // Map the backend trip plan (itinerary[].slots.{morning|afternoon|evening} with
  // { activity, place_type, food_match, budget_share }) into the shape this screen
  // renders. Real data only — slots the backend omits are simply not shown.
  function transformResponse(res: TripGenerateResponse, form: Record<string, unknown>): ItineraryResult {
    const budget = res.estimatedBudget || {};
    const total = Number(budget.total) || parseInt(form.budget as string);
    const perDay = Number(budget.per_day) || Math.floor(total / Math.max(parseInt(form.days as string), 1));
    const humanize = (pt: unknown) =>
      typeof pt === "string" ? pt.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : "";
    const slotCost = (share: unknown) => {
      const pct = typeof share === "string" ? parseFloat(share) : NaN;
      return Number.isNaN(pct) ? null : `₹${Math.round((perDay * pct) / 100)}`;
    };
    const mapSlot = (slots: Record<string, unknown>, key: string) => {
      const s = slots?.[key] as Record<string, unknown> | undefined;
      if (!s) return null;
      return {
        activity: s.activity ?? null,
        description: humanize(s.place_type) || null,
        cost: slotCost(s.budget_share),
        food: s.food_match ?? null,
      };
    };
    const days = (res.itinerary || []).map((d: Record<string, unknown>, i: number) => {
      const slots = (d.slots as Record<string, unknown>) || {};
      return {
        day: d.day || i + 1,
        title: d.title || `Day ${i + 1}`,
        morning: mapSlot(slots, "morning"),
        afternoon: mapSlot(slots, "afternoon"),
        evening: mapSlot(slots, "evening"),
      };
    });
    return {
      destination: form.destination as string,
      totalCost: `₹${total}`,
      activeFoods: form.foods as string[],
      days,
      tips: res.safetyNotes?.length > 0 ? res.safetyNotes : [],
    } as ItineraryResult;
  }

  return (
    <div style={{ padding: "0 12px 16px" }}>
      {/* Standalone-only shortcut into the manual route planner. Inside the trip-planner
          hub the "Getting there" step already covers this, so it's hidden when embedded. */}
      {!embedded && (
        <button onClick={() => { setSub("route"); document.getElementById("tripova-scroll")?.scrollTo({ top: 0, behavior: "smooth" }); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", marginBottom: 14, borderRadius: 14, border: `1px solid ${t.accent}25`, background: `linear-gradient(135deg,${t.accent}12,${t.secondary}0A)`, cursor: "pointer", textAlign: "left" }}>
          <span style={{ width: 38, height: 38, borderRadius: 10, background: t.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="Route" size={19} color={t.accent} />
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: t.text }}>Plan the route &amp; map</span>
            <span style={{ display: "block", fontSize: 12, color: t.muted, marginTop: 1 }}>Multi-leg journey, travel times, overnight &amp; fuel stops</span>
          </span>
          <Icon name="ChevronRight" size={18} color={t.muted} />
        </button>
      )}
      <CollapsibleForm t={t} title="✦ Build My Trip" open={formOpen} onToggle={() => setFormOpen(o => !o)} canCollapse={!!itinerary} summary={tripSummary}>
        {/* Lock the whole form while a trip is being built — `fieldset[disabled]` natively
            disables every input/button inside, so the traveller can't change the brief
            mid-generation (which would mismatch the result they're about to get). */}
        <fieldset disabled={loading} style={{ border: "none", padding: 0, margin: 0, minInlineSize: 0, opacity: loading ? 0.55 : 1, transition: "opacity 0.2s" }}>
        <InputF label="Starting point (optional)" value={form.origin} onChange={e => setForm(f => ({ ...f, origin: e.target.value }))} placeholder="Where are you travelling from? e.g. Indore" t={t} />
        <InputF label="Destination" value={form.destination} onChange={e => setForm(f => ({ ...f, destination: e.target.value }))} placeholder="Manali, Goa, Spiti, Udaipur..." t={t} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 0 }}>
          <InputF label="Days" value={form.days} onChange={e => setForm(f => ({ ...f, days: e.target.value }))} type="number" t={t} />
          <InputF label="Budget (₹)" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} type="number" t={t} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8 }}>Group Type</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {groupTypes.map(g => (
              <button key={g.id} onClick={() => setForm(f => ({ ...f, groupType: g.id }))} style={{ flex: 1, padding: "9px 6px", borderRadius: 8, border: `1.5px solid ${form.groupType === g.id ? t.accent : t.border}`, background: form.groupType === g.id ? t.accent + "12" : t.tag, color: form.groupType === g.id ? t.accent : t.muted, fontSize: 11, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, transition: "all 0.18s" }}>
                <span style={{ fontSize: 18 }}>{g.icon}</span>{g.id}
              </button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8 }}>How are you getting there?</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {travelModes.map(m => (
              <button key={m.id} onClick={() => setForm(f => ({ ...f, travelMode: m.id }))} style={{ minHeight: 62, padding: "9px 4px", borderRadius: 8, border: `1.5px solid ${form.travelMode === m.id ? t.accent : t.border}`, background: form.travelMode === m.id ? t.accent + "12" : t.tag, color: form.travelMode === m.id ? t.accent : t.muted, fontSize: 10.5, fontWeight: 700, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, transition: "all 0.18s" }}>
                <span style={{ fontSize: 17 }}>{m.icon}</span>{m.label}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 11, color: t.muted, marginTop: 6, fontStyle: "italic" }}>
            {currentMode?.refuel ? "Self-driven — petrol-pump stops will be suggested along the way" : "You're a passenger — no fuel stops (you don't refuel a " + (currentMode?.label.toLowerCase() ?? "vehicle") + ")"}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 8 }}>Interests</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {interests.map(i => { const a = form.interests.includes(i); return <button key={i} onClick={() => toggleI(i)} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${a ? t.accent : t.border}`, background: a ? t.accent + "12" : t.tag, color: a ? t.accent : t.muted, fontSize: 12, fontWeight: a ? 700 : 400, cursor: "pointer", transition: "all 0.18s" }}>{i}</button>; })}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <MultiSelectFood selected={form.foods} onChange={foods => setForm(f => ({ ...f, foods }))} t={t} hint="Select all that apply — mix and match freely" />
        </div>
        {error && <div style={{ background: t.danger + "12", border: `1px solid ${t.danger}25`, borderRadius: 8, padding: "10px 14px", color: t.danger, fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <Btn onClick={generate} disabled={loading} full t={t}>{loading ? "Crafting your journey..." : "✦ Build My Trip"}</Btn>
        </fieldset>
      </CollapsibleForm>

      {loading && <PlannerSkeleton t={t} label={LOAD_STAGES[loadStage]} />}

      {itinerary && (
        <div>
          {/* Sections fade in one after another (a small per-section delay) so the result
              arrives as readable chunks instead of a single dense wall. */}
          <style>{`@keyframes tvReveal{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ background: `linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${t.accent}20`, animation: "tvReveal .4s ease both" }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>📍 {itinerary.destination}</div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 4 }}>Estimated total: <span style={{ color: t.accent, fontWeight: 700 }}>{itinerary.totalCost}</span></div>
            {itinerary.activeFoods.length > 0 && <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>{itinerary.activeFoods.map((id: string) => <FoodBadge key={id} id={id} small t={t} />)}</div>}
          </div>
          {gettingThere && <div style={{ animation: "tvReveal .4s ease both", animationDelay: "0.09s" }}><GettingThereCard gt={gettingThere} t={t} /></div>}
          {itinerary.days.map((day: Record<string, unknown>, idx: number) => (
            <Card key={String(day.day ?? idx)} t={t} style={{ animation: "tvReveal .4s ease both", animationDelay: `${(idx + 2) * 0.09}s` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.accent, marginBottom: 14 }}>Day {String(day.day ?? "")} — {String(day.title ?? "")}</div>
              {["morning", "afternoon", "evening"].map(time => {
                const slot = day[time] as Record<string, string> | undefined;
                return slot && (
                <div key={time} style={{ marginBottom: 12, paddingLeft: 14, borderLeft: `2px solid ${t.border}` }}>
                  <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: 2 }}>{time}</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginTop: 2 }}>{slot.activity}</div>
                  {slot.description ? <div style={{ fontSize: 13, color: t.muted, marginTop: 2 }}>{slot.description}</div> : null}
                  {(slot.cost || slot.food) && (
                  <div style={{ display: "flex", gap: 12, marginTop: 5 }}>
                    {slot.cost ? <span style={{ fontSize: 11, color: t.success, fontWeight: 600 }}>💰 {slot.cost}</span> : null}
                    {slot.food ? <span style={{ fontSize: 11, color: t.secondary, fontWeight: 600 }}>🍽 {slot.food}</span> : null}
                  </div>
                  )}
                </div>
                );
              })}
            </Card>
          ))}
          {fuelStops.length > 0 && (
            <Card t={t} style={{ animation: "tvReveal .4s ease both", animationDelay: `${(itinerary.days.length + 2) * 0.09}s` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>⛽ Fuel Stops Nearby</div>
              <div style={{ fontSize: 12, color: t.muted, marginBottom: 10 }}>Real petrol pumps around {itinerary.destination} for your road trip.</div>
              {fuelStops.map((fs, i) => (
                <div key={String(fs.id ?? i)} style={{ marginBottom: 9, paddingLeft: 12, borderLeft: `2px solid ${t.accent}` }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{String(fs.name ?? "Petrol pump")}</div>
                  {fs.address ? <div style={{ fontSize: 12, color: t.muted }}>{String(fs.address)}</div> : null}
                  {fs.phone ? <div style={{ fontSize: 11, color: t.secondary, marginTop: 2 }}>📞 {String(fs.phone)}</div> : null}
                </div>
              ))}
            </Card>
          )}
          {itinerary.tips.length > 0 && (
          <Card t={t} style={{ animation: "tvReveal .4s ease both", animationDelay: `${(itinerary.days.length + 3) * 0.09}s` }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>💡 Pro Tips</div>
            {itinerary.tips.map((tip: string, i: number) => <div key={i} style={{ fontSize: 13, color: t.muted, marginBottom: 9, paddingLeft: 12, borderLeft: `2px solid ${t.secondary}`, lineHeight: 1.6 }}>{tip}</div>)}
          </Card>
          )}
        </div>
      )}
    </div>
  );
}

// "Getting there": the real origin→destination leg the backend computed from the
// starting point. On success it shows the route summary, travel cost, and along-the-road
// fuel markers; if the leg couldn't be planned (origin unknown, or an impossible mode),
// it shows the backend's honest note instead of a fake ETA.
function GettingThereCard({ gt, t }: { gt: GettingThere; t: Theme }) {
  const meta = (gt.transport && TRANSPORT_PRESENTATION[gt.transport]) || { label: gt.transport || "Travel", icon: "🧭" };
  const from = gt.origin?.name || gt.originQuery || "Start";
  const to = gt.destination?.name || "Destination";
  const planned = gt.distanceKm != null;
  const route = gt.route as RoutePlanResult | undefined;
  const hasMap = !!(route && Array.isArray(route.legs) && route.legs.length > 0);

  return (
    <Card t={t}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: planned ? 12 : 8 }}>
        <span style={{ fontSize: 18 }}>{meta.icon}</span>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, flex: 1 }}>Getting there · {meta.label}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>{from} → {to}</div>

      {/* Real train identity from the railways dataset, when this is a matched train leg. */}
      {gt.trainNumber && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 10, background: t.secondary + "12", border: `1px solid ${t.secondary}25`, marginBottom: 12 }}>
          <span style={{ fontSize: 15 }}>🚆</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>Train {gt.trainNumber}{gt.trainName ? ` · ${gt.trainName}` : ""}</div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>
              {gt.scheduledDeparture
                ? `Scheduled ${gt.scheduledDeparture} → ${gt.scheduledArrival}`
                : "Times below are estimated"}
            </div>
          </div>
        </div>
      )}

      {/* Real flight identity from the configured provider, when this is a matched flight leg. */}
      {gt.flightNumber && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 11px", borderRadius: 10, background: t.secondary + "12", border: `1px solid ${t.secondary}25`, marginBottom: 12 }}>
          <span style={{ fontSize: 15 }}>✈️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: t.text }}>{gt.flightNumber}{gt.airline ? ` · ${gt.airline}` : ""}</div>
            <div style={{ fontSize: 11, color: t.muted, marginTop: 1 }}>
              {gt.scheduledDeparture
                ? `Scheduled ${gt.scheduledDeparture} → ${gt.scheduledArrival}${gt.priceText ? ` · from ${gt.priceText}` : ""}`
                : "Times below are estimated"}
            </div>
          </div>
        </div>
      )}

      {/* The journey on a real map (same component the Route Planner uses). */}
      {hasMap && (
        <div style={{ marginBottom: 12 }}>
          <LiveRouteMap result={route as RoutePlanResult} t={t} />
        </div>
      )}

      {planned ? (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <Stat label="Distance" value={`${Math.round(gt.distanceKm as number).toLocaleString()} km`} t={t} />
            <Stat label="Travel time" value={fmtDuration(gt.durationHours || 0)} t={t} />
            <Stat label="Departs" value={fmtClock(gt.departureTime)} t={t} />
            <Stat label="Arrives" value={fmtClock(gt.arrivalTime)} t={t} />
          </div>
          {gt.travelCost != null && (
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "10px 12px", borderRadius: 10, background: t.accent + "0F", border: `1px solid ${t.accent}25`, marginBottom: gt.fuelStops && gt.fuelStops.length > 0 ? 12 : 0 }}>
              <span style={{ fontSize: 12.5, color: t.muted, fontWeight: 600 }}>Estimated travel cost</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: t.accent }}>{inr(gt.travelCost)}</span>
            </div>
          )}
          {gt.fuelStops && gt.fuelStops.length > 0 && (
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: t.text, marginBottom: 6 }}>⛽ Refuel along the way</div>
              {gt.fuelStops.map((fs, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: i < (gt.fuelStops!.length - 1) ? `1px solid ${t.border}` : "none" }}>
                  <span style={{ fontSize: 12.5, color: t.text, fontWeight: 600 }}>~{Math.round(Number(fs.atKm) || 0).toLocaleString()} km in</span>
                  <span style={{ fontSize: 11.5, color: t.secondary, fontWeight: 600 }}>{fmtClock(fs.estimatedTime as string | undefined)}</span>
                </div>
              ))}
            </div>
          )}
        </>
      ) : null}

      {gt.transport === "BUS" && <BusEstimateNote from={from} to={to} t={t} />}

      {gt.note && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: planned ? 12 : 0, fontSize: 12, color: t.muted, lineHeight: 1.5 }}>
          <Icon name="Info" size={13} color={t.muted} /> <span style={{ flex: 1 }}>{gt.note}</span>
        </div>
      )}
    </Card>
  );
}

// Compact stat used by the getting-there card (mirrors the route planner's Stat).
function Stat({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{value}</div>
    </div>
  );
}

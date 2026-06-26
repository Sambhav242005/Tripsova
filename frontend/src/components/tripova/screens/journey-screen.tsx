"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import type { Theme } from "@/data";
import { Card, Btn, CollapsibleForm, PlannerSkeleton } from "../primitives/index";
import { Icon } from "../icon";
import { api, ApiError } from "@/lib/api";
import { scrollPlannerToTop } from "@/lib/scroll";
import type {
  JourneyListItem,
  JourneyPlanRequest,
  JourneyPlanResponse,
  JourneyRecordResponse,
  TransportKey,
} from "@/lib/types";
import {
  fmtClock,
  fmtDuration,
  mediumColor,
  BusEstimateNote,
  type RoutePlanResult,
  type LegResponse,
} from "./route-screen";
import { LiveRouteMap } from "./route-map-live";

// Presentation for the engine-chosen transports (mirrors route-screen's catalog).
const TRANSPORT_META: Record<TransportKey, { label: string; icon: string }> = {
  CAR: { label: "Car", icon: "🚗" },
  MOTORCYCLE: { label: "Motorcycle", icon: "🏍️" },
  TRAIN: { label: "Train", icon: "🚆" },
  BUS: { label: "Bus", icon: "🚌" },
  METRO: { label: "Metro", icon: "🚇" },
  BICYCLE: { label: "Bicycle", icon: "🚲" },
  WALK: { label: "Walk", icon: "🚶" },
  FLIGHT: { label: "Flight", icon: "✈️" },
  // FERRY & CRUISE paused — water transport module on hold.
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

const controlTags = new Set(["input", "textarea", "select"]);

export interface JourneySeed {
  key: string;
  origin: string;
  destination: string;
  people?: number;
  budget?: number;
  departure?: string;
  autoPlan?: boolean;
  // When set, reopen this already-saved journey on mount (e.g. tapped from the
  // Journeys list on the profile) instead of presenting a blank planning form.
  openJourneyId?: string;
}

interface JourneyValues {
  origin: string;
  destination: string;
  roundTrip: boolean;
  people: number;
  budget: string;
  departure: string;
}

const autoPlannedSeedKeys = new Set<string>();
// Seed keys whose saved journey we've already reopened, so re-renders don't refetch.
const openedSeedKeys = new Set<string>();

export function JourneyScreen({ t, seed, embedded = false }: { t: Theme; seed?: JourneySeed | null; embedded?: boolean }) {
  const [origin, setOrigin] = useState(() => seed?.origin ?? "");
  const [destination, setDestination] = useState(() => seed?.destination ?? "");
  const [roundTrip, setRoundTrip] = useState(true);
  const [people, setPeople] = useState(() => Math.max(1, seed?.people || 1));
  const [budget, setBudget] = useState(() => (typeof seed?.budget === "number" ? String(seed.budget) : ""));
  const [departure, setDeparture] = useState(() => seed?.departure || "");
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JourneyPlanResponse | null>(null);
  // Saved journeys + background-job tracking (Issue 4: store results, run in bg).
  const [history, setHistory] = useState<JourneyListItem[]>([]);
  const [bgLoading, setBgLoading] = useState(false);
  const pollingRef = useRef<Set<string>>(new Set());

  // Build the API request from the current form (with optional overrides), or null
  // with an error set if the required cities are missing. Shared by foreground and
  // background planning so both validate identically.
  const buildBody = useCallback((values?: Partial<JourneyValues>): JourneyPlanRequest | null => {
    const current: JourneyValues = { origin, destination, roundTrip, people, budget, departure, ...values };
    if (!current.origin.trim() || !current.destination.trim()) {
      setError("Tell us where you're starting and where you're going.");
      return null;
    }
    const body: JourneyPlanRequest = {
      origin: current.origin.trim(),
      destination: current.destination.trim(),
      roundTrip: current.roundTrip,
      peopleCount: Math.max(1, current.people),
    };
    if (current.budget.trim()) body.budget = Number(current.budget);
    if (current.departure) body.departureTime = new Date(current.departure).toISOString();
    return body;
  }, [budget, departure, destination, origin, people, roundTrip]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await api.get<JourneyListItem[]>("/api/trips/journeys");
      // Defensive: only an array is renderable. An endpoint that returns an object
      // (e.g. a paginated `{items:[]}` envelope) would otherwise crash `history.map`.
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      /* history is best-effort — never block planning on it */
    }
  }, []);

  // Poll a pending background journey until it's ready/failed, flipping its history row.
  const pollRecord = useCallback((id: string) => {
    if (pollingRef.current.has(id)) return;
    pollingRef.current.add(id);
    const tick = async () => {
      try {
        const rec = await api.get<JourneyRecordResponse>(`/api/trips/journeys/${id}`);
        if (rec.status === "pending") {
          window.setTimeout(tick, 3000);
          return;
        }
        pollingRef.current.delete(id);
        void loadHistory();
      } catch {
        pollingRef.current.delete(id);
      }
    };
    window.setTimeout(tick, 3000);
  }, [loadHistory]);

  const planJourneyWith = useCallback(async (values?: Partial<JourneyValues>) => {
    setError(null);
    const body = buildBody(values);
    if (!body) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<JourneyPlanResponse>("/api/trips/journey", body);
      setResult(res);
      setFormOpen(false);
      scrollPlannerToTop();
      void loadHistory();
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError(e.message || "We couldn't find one of those places. Try a nearby city name.");
      } else {
        setError(e instanceof Error ? e.message : "Could not plan this journey. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  }, [buildBody, loadHistory]);

  // Fire-and-forget: start the plan on the server and let the user keep moving. The
  // new pending journey shows in history and we poll it until it's ready.
  const planInBackground = useCallback(async () => {
    setError(null);
    const body = buildBody();
    if (!body) return;
    setBgLoading(true);
    try {
      const rec = await api.post<JourneyRecordResponse>("/api/trips/journey/async", body);
      await loadHistory();
      pollRecord(rec.id);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError(e.message || "We couldn't find one of those places. Try a nearby city name.");
      } else {
        setError("Couldn't start the background plan. Please try again.");
      }
    } finally {
      setBgLoading(false);
    }
  }, [buildBody, loadHistory, pollRecord]);

  // Reopen a saved journey (or surface a pending/failed one honestly).
  const openSaved = useCallback(async (id: string) => {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      const rec = await api.get<JourneyRecordResponse>(`/api/trips/journeys/${id}`);
      if (rec.status === "ready" && rec.result) {
        setResult(rec.result);
        setFormOpen(false);
        scrollPlannerToTop();
      } else if (rec.status === "failed") {
        setError(rec.error || "That journey couldn't be planned.");
      } else {
        setError("That journey is still being planned — it'll appear here shortly.");
        pollRecord(id);
      }
    } catch {
      setError("Couldn't open that journey.");
    } finally {
      setLoading(false);
    }
  }, [pollRecord]);

  // On mount: load history and resume polling any journeys still pending.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const items = await api.get<JourneyListItem[]>("/api/trips/journeys");
        if (!active) return;
        const list = Array.isArray(items) ? items : [];
        setHistory(list);
        list.filter(it => it.status === "pending").forEach(it => pollRecord(it.id));
      } catch {
        /* best-effort */
      }
    })();
    return () => { active = false; };
  }, [pollRecord]);

  // Reopen a saved journey when the screen was entered from the profile's Journeys list.
  // Deferred (like the auto-plan seed effect) so the reopen fetch doesn't set state
  // synchronously inside the effect body.
  useEffect(() => {
    if (!seed?.openJourneyId || openedSeedKeys.has(seed.key)) return;
    const id = seed.openJourneyId;
    const timer = window.setTimeout(() => {
      if (openedSeedKeys.has(seed.key)) return;
      openedSeedKeys.add(seed.key);
      void openSaved(id);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [openSaved, seed]);

  const planJourney = () => planJourneyWith();
  const journeySummary = `${origin || "?"} → ${destination || "?"} · ${people} ${people === 1 ? "traveller" : "travellers"}`;

  useEffect(() => {
    if (!seed) return;
    const nextBudget = typeof seed.budget === "number" ? String(seed.budget) : "";
    const nextPeople = Math.max(1, seed.people || 1);
    if (seed.autoPlan && !autoPlannedSeedKeys.has(seed.key)) {
      const timer = window.setTimeout(() => {
        if (autoPlannedSeedKeys.has(seed.key)) return;
        autoPlannedSeedKeys.add(seed.key);
        void planJourneyWith({
          origin: seed.origin,
          destination: seed.destination,
          roundTrip: true,
          people: nextPeople,
          budget: nextBudget,
          departure: seed.departure || "",
        });
      }, 0);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [planJourneyWith, seed]);

  return (
    <div style={{ padding: embedded ? 0 : "0 16px 16px" }}>
      {!embedded && (
        <div style={{ background: `linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, borderRadius: 12, padding: "13px 16px", marginBottom: 18, border: `1px solid ${t.accent}20` }}>
          <div style={{ fontSize: 14, color: t.accent, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
            <Icon name="Sparkles" size={16} color={t.accent} /> Plan My Journey
          </div>
          <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>
            Just say where you&apos;re going. We pick the transport — drive, train, or fly with airport
            hops — and estimate the cost. No mode-picking needed.
          </div>
        </div>
      )}

      {/* ── Form (collapses to a compact bar once a plan exists) ──────────── */}
      <CollapsibleForm t={t} title="Journey details" open={formOpen} onToggle={() => setFormOpen(o => !o)} canCollapse={!!result} summary={journeySummary}>
        <Field label="From" t={t}>
          <input
            value={origin}
            onChange={e => setOrigin(e.target.value)}
            placeholder="e.g. Ratlam"
            style={inputStyle(t, !!origin)}
          />
        </Field>
        <div style={{ height: 12 }} />
        <Field label="To" t={t}>
          <input
            value={destination}
            onChange={e => setDestination(e.target.value)}
            placeholder="e.g. Mumbai"
            style={inputStyle(t, !!destination)}
          />
        </Field>

        {/* Round trip toggle */}
        <button
          onClick={() => setRoundTrip(r => !r)}
          style={{
            display: "flex", alignItems: "center", gap: 10, width: "100%", marginTop: 14,
            padding: "11px 13px", borderRadius: 11, cursor: "pointer", textAlign: "left",
            border: `1.5px solid ${roundTrip ? t.accent : t.border}`,
            background: roundTrip ? t.accent + "12" : t.card, color: t.text,
          }}
        >
          <span style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            border: `1.5px solid ${roundTrip ? t.accent : t.muted}`,
            background: roundTrip ? t.accent : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {roundTrip && <Icon name="Check" size={12} color="#fff" />}
          </span>
          <span style={{ flex: 1 }}>
            <span style={{ fontSize: 13.5, fontWeight: 700 }}>Round trip</span>
            <span style={{ display: "block", fontSize: 11.5, color: t.muted, marginTop: 1 }}>
              {roundTrip ? "We'll plan the return legs too." : "One way only."}
            </span>
          </span>
          <Icon name="Repeat" size={16} color={roundTrip ? t.accent : t.muted} />
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14 }}>
          <Field label="Travellers" t={t}>
            <input
              type="number" min={1} value={people}
              onChange={e => setPeople(Math.max(1, Number(e.target.value) || 1))}
              style={inputStyle(t, true)}
            />
          </Field>
          <Field label="Budget ₹ (optional)" t={t}>
            <input
              type="number" min={0} value={budget} placeholder="e.g. 20000"
              onChange={e => setBudget(e.target.value)}
              style={inputStyle(t, !!budget)}
            />
          </Field>
        </div>

        <div style={{ marginTop: 14 }}>
          <Field label="Departure (optional)" t={t}>
            <input
              type="datetime-local" value={departure}
              onChange={e => setDeparture(e.target.value)}
              style={inputStyle(t, !!departure)}
            />
          </Field>
          <div style={{ fontSize: 11, color: t.muted, marginTop: 5, fontStyle: "italic" }}>Leave blank to depart tomorrow at 08:00.</div>
        </div>

        {error && <div data-testid="journey-error" style={{ background: t.danger + "12", border: `1px solid ${t.danger}25`, borderRadius: 8, padding: "10px 14px", color: t.danger, fontSize: 13, marginTop: 14 }}>{error}</div>}
        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}>
          <Btn onClick={planJourney} disabled={loading || bgLoading} full t={t}>{loading ? "Finding the best way..." : "✦ Plan My Journey"}</Btn>
          <button
            onClick={planInBackground}
            disabled={loading || bgLoading}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              width: "100%", padding: "11px", borderRadius: 12, cursor: loading || bgLoading ? "default" : "pointer",
              border: `1.5px solid ${t.border}`, background: t.card, color: t.text,
              fontSize: 13, fontWeight: 600, opacity: loading || bgLoading ? 0.6 : 1,
            }}
          >
            <Icon name="Clock" size={15} color={t.accent} />
            {bgLoading ? "Starting…" : "Plan in background"}
          </button>
          <div style={{ fontSize: 11, color: t.muted, textAlign: "center", fontStyle: "italic" }}>
            Background plans keep running if you leave — find them under Recent journeys.
          </div>
        </div>
      </CollapsibleForm>

      {loading && (
        <>
          <JourneyProgress t={t} />
          <PlannerSkeleton t={t} label="Choosing modes and estimating cost…" rows={2} />
        </>
      )}

      {result && <JourneyResult result={result} t={t} />}

      <JourneyHistory t={t} history={history} onOpen={openSaved} />
    </div>
  );
}

// Honest progress affordance: planning time is dominated by live geocoding + Overpass
// hub lookups, so we can't show true percent — an indeterminate bar with staged labels
// reflects what's happening without faking a number.
function JourneyProgress({ t }: { t: Theme }) {
  const stages = ["Locating your cities…", "Choosing the best transport…", "Estimating times & cost…"];
  const [stage, setStage] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setStage(s => (s + 1) % stages.length), 1800);
    return () => window.clearInterval(id);
  }, [stages.length]);
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 12.5, color: t.muted, marginBottom: 7, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="Loader" size={14} color={t.accent} /> {stages[stage]}
      </div>
      <div style={{ height: 4, borderRadius: 999, background: t.tag, overflow: "hidden" }}>
        <div style={{ height: "100%", width: "40%", borderRadius: 999, background: t.accent, animation: "journeyProgress 1.3s ease-in-out infinite" }} />
      </div>
      <style>{`@keyframes journeyProgress { 0% { margin-left: -40%; } 100% { margin-left: 100%; } }`}</style>
    </div>
  );
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function JourneyHistory({ t, history, onOpen }: { t: Theme; history: JourneyListItem[]; onOpen: (id: string) => void }) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
  return (
    <Card t={t}>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
        <Icon name="History" size={15} color={t.text} /> Recent journeys
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {history.map(j => {
          const pending = j.status === "pending";
          const failed = j.status === "failed";
          const statusColor = failed ? t.danger : pending ? t.muted : t.success;
          return (
            <button
              key={j.id}
              onClick={() => onOpen(j.id)}
              style={{
                display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
                padding: "10px 12px", borderRadius: 12, border: `1px solid ${t.border}`,
                background: t.card, color: t.text, cursor: "pointer",
              }}
            >
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, flexShrink: 0, ...(pending ? { animation: "pulse 2s infinite" } : {}) }} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {j.origin} → {j.destination}
                </span>
                <span style={{ display: "block", fontSize: 11, color: t.muted, marginTop: 1 }}>
                  {pending ? "Planning…" : failed ? "Couldn't plan" : j.total != null ? inr(j.total) : "Ready"}
                  {" · "}{relativeTime(j.createdAt)}
                </span>
              </span>
              <Icon name={failed ? "AlertTriangle" : "ChevronRight"} size={15} color={t.muted} />
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function JourneyResult({ result, t }: { result: JourneyPlanResponse; t: Theme }) {
  const route = result.route as unknown as RoutePlanResult;
  const legs: LegResponse[] = route.legs || [];
  const cost = result.cost;
  const within = result.withinBudget;
  const isExpensive = cost.total > 15000;

  return (
    <div data-testid="journey-result">
      {/* Hero summary — clean mode chips + origin/destination */}
      <Card t={t}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>
              Recommended route
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.text, lineHeight: 1.3 }}>
              {result.origin.name}
              <span style={{ color: t.muted, margin: "0 8px", fontWeight: 400 }}>→</span>
              {result.destination.name}
            </div>
          </div>
          <span data-testid="cost-total" style={{
            padding: "8px 14px", borderRadius: 12,
            background: t.accent + "12", border: `1.5px solid ${t.accent}`,
            color: t.accent, fontSize: 20, fontWeight: 800,
            whiteSpace: "nowrap",
          }}>
            {inr(cost.total)}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {result.chosenModes.map((m, i) => {
            const meta = TRANSPORT_META[m] ?? { label: m, icon: "•" };
            return (
              <span key={`${m}-${i}`} data-testid="mode-chip" style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "5px 10px", borderRadius: 8,
                background: t.tag, color: t.text, fontSize: 12, fontWeight: 600,
                border: `1px solid ${t.border}`,
              }}>
                <span style={{ fontSize: 14 }}>{meta.icon}</span>{meta.label}
              </span>
            );
          })}
          {result.roundTrip && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.tag, color: t.muted, fontSize: 11.5, fontWeight: 600 }}>
              <Icon name="Repeat" size={12} color={t.muted} /> Round trip
            </span>
          )}
          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 8, border: `1px solid ${t.border}`, background: t.tag, color: t.muted, fontSize: 11.5, fontWeight: 600 }}>
            <Icon name="Users" size={12} color={t.muted} /> {result.peopleCount}
          </span>
        </div>

        <div style={{
          display: "flex", gap: 16, padding: "10px 0 0",
          borderTop: `1px solid ${t.border}30`, marginTop: 8,
        }}>
          <MiniStat label="Distance" value={`${Math.round(route.distanceKm).toLocaleString()} km`} t={t} />
          <MiniStat label="Duration" value={fmtDuration(route.estimatedDurationHours)} t={t} />
          <MiniStat label="Per person" value={inr(cost.perPerson)} t={t} />
        </div>

        <GeoNote result={result} t={t} />
      </Card>

      {/* Budget banner (if set) */}
      {within !== null && within !== undefined && result.budget != null && (
        <div data-testid="budget-banner" data-within={within ? "yes" : "no"} style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "11px 14px", borderRadius: 12, marginBottom: 14,
          background: (within ? t.success : t.danger) + "12",
          border: `1px solid ${(within ? t.success : t.danger)}30`,
          color: within ? t.success : t.danger, fontSize: 12.5, fontWeight: 700,
        }}>
          <Icon name={within ? "CheckCircle" : "AlertTriangle"} size={16} color={within ? t.success : t.danger} />
          {within
            ? `Within your ${inr(result.budget)} budget — ${inr(result.budget - cost.total)} to spare.`
            : `Over your ${inr(result.budget)} budget by ${inr(cost.total - result.budget)}.`}
        </div>
      )}

      {/* Cost breakdown */}
      <Card t={t}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="IndianRupee" size={15} color={t.text} /> Cost breakdown
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {cost.perLeg.map((leg, i) => {
            const meta = leg.transport ? TRANSPORT_META[leg.transport] : undefined;
            return (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "9px 10px", borderRadius: 10,
                background: i % 2 === 0 ? t.tag : "transparent",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{meta?.icon ?? "•"}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: t.text }}>
                      {leg.from || "?"} → {leg.to || "?"}
                    </div>
                    <div style={{ fontSize: 11, color: t.muted }}>
                      {meta?.label ?? leg.transport}{leg.distanceKm ? ` · ${Math.round(leg.distanceKm).toLocaleString()} km` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: t.text, flexShrink: 0, marginLeft: 10 }}>{inr(leg.estimatedCost)}</div>
              </div>
            );
          })}
        </div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 10, paddingTop: 10, borderTop: `1px solid ${t.border}`,
        }}>
          <span style={{ fontSize: 13, color: t.muted }}>Total</span>
          <span style={{ fontSize: 18, fontWeight: 800, color: isExpensive ? t.danger : t.text }}>{inr(cost.total)}</span>
        </div>
      </Card>

      {/* Map */}
      <LiveRouteMap result={route} t={t} />

      {/* Journey stats */}
      <Card t={t}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Stat label="Total distance" value={`${Math.round(route.distanceKm).toLocaleString()} km`} t={t} />
          <Stat label="Time in transit" value={fmtDuration(route.estimatedDurationHours)} t={t} />
          <Stat label="Departs" value={fmtClock(route.departureTime)} t={t} />
          <Stat label="Arrives" value={fmtClock(route.arrivalTime)} t={t} />
        </div>
      </Card>

      {/* Timeline */}
      <Card t={t}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="Map" size={15} color={t.text} /> Journey timeline
        </div>
        <div style={{ position: "relative", paddingLeft: 6 }}>
          {legs.map((leg, i) => {
            const col = mediumColor(t, leg.medium);
            return (
              <div key={i} style={{ display: "flex", gap: 14, marginBottom: i < legs.length - 1 ? 18 : 0, position: "relative" }}>
                {/* Timeline dot + connector line */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0, width: 24 }}>
                  <div style={{
                    width: 24, height: 24, borderRadius: "50%",
                    background: col + "18", border: `2px solid ${col}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 12, flexShrink: 0, position: "relative", zIndex: 1,
                  }}>
                    {leg.icon}
                  </div>
                  {i < legs.length - 1 && <div style={{
                    flex: 1, width: 2, background: `linear-gradient(to bottom, ${col}, ${t.border})`,
                    marginTop: 4, minHeight: 20,
                  }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: 4 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>{leg.from.name} → {leg.to.name}</div>
                  <div style={{ fontSize: 12, color: t.muted, marginTop: 2 }}>
                    {leg.label} · {Math.round(leg.distanceKm).toLocaleString()} km · {fmtDuration(leg.durationHours)}
                  </div>
                  <div style={{
                    fontSize: 11.5, color: t.secondary, marginTop: 4, fontWeight: 600,
                    background: t.secondary + "0a", padding: "4px 10px", borderRadius: 8,
                    display: "inline-flex", alignItems: "center", gap: 4,
                  }}>
                    <Icon name="Clock" size={11} color={t.secondary} />
                    {fmtClock(leg.departureTime)} → {fmtClock(leg.arrivalTime)}
                  </div>
                  {leg.transport === "BUS" && <BusEstimateNote from={leg.from.name} to={leg.to.name} t={t} />}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function GeoNote({ result, t }: { result: JourneyPlanResponse; t: Theme }) {
  const fromNominatim = [result.geocoding.origin, result.geocoding.destination].some(g => g.source === "nominatim");
  if (!fromNominatim) return null;
  return (
    <div style={{ fontSize: 11, color: t.muted, marginTop: 8, display: "flex", alignItems: "center", gap: 5, fontStyle: "italic" }}>
      <Icon name="MapPin" size={12} color={t.muted} />
      Located via OpenStreetMap — not yet in our destinations, so coordinates are approximate.
    </div>
  );
}

function Field({ label, children, t }: { label: string; children: React.ReactNode; t: Theme }) {
  const generatedId = React.useId();
  const onlyChild = React.Children.count(children) === 1 ? React.Children.only(children) : null;
  const isControl =
    React.isValidElement(onlyChild) &&
    typeof onlyChild.type === "string" &&
    controlTags.has(onlyChild.type);
  const controlId = isControl ? ((onlyChild.props as { id?: string }).id ?? generatedId) : undefined;

  return (
    <div>
      {controlId ? (
        <label htmlFor={controlId} style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 7 }}>{label}</label>
      ) : (
        <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      )}
      {isControl
        ? React.cloneElement(onlyChild as React.ReactElement<Record<string, unknown>>, { id: controlId })
        : children}
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

function MiniStat({ label, value, t }: { label: string; value: string; t: Theme }) {
  return (
    <div>
      <div style={{ fontSize: 9, fontWeight: 700, color: t.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: t.text }}>{value}</div>
    </div>
  );
}

function inputStyle(t: Theme, filled: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "12px 14px", borderRadius: 12,
    border: `1.5px solid ${filled ? t.accent : t.border}`,
    background: t.card, color: t.text, fontSize: 14, boxSizing: "border-box",
  };
}

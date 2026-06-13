"use client";

import React, { useState } from "react";
import type { Theme } from "@/data";
import { Card, Btn } from "../primitives/index";
import { Icon } from "../icon";
import { api, ApiError } from "@/lib/api";
import type { JourneyPlanRequest, JourneyPlanResponse, TransportKey } from "@/lib/types";
import {
  RouteMap,
  fmtClock,
  fmtDuration,
  mediumColor,
  type RoutePlanResult,
  type LegResponse,
} from "./route-screen";

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
  FERRY: { label: "Ferry", icon: "⛴️" },
  CRUISE: { label: "Cruise", icon: "🛳️" },
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

export function JourneyScreen({ t }: { t: Theme }) {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [roundTrip, setRoundTrip] = useState(true);
  const [people, setPeople] = useState(1);
  const [budget, setBudget] = useState("");
  const [departure, setDeparture] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<JourneyPlanResponse | null>(null);

  const planJourney = async () => {
    setError(null);
    if (!origin.trim() || !destination.trim()) {
      setError("Tell us where you're starting and where you're going.");
      return;
    }
    const body: JourneyPlanRequest = {
      origin: origin.trim(),
      destination: destination.trim(),
      roundTrip,
      peopleCount: Math.max(1, people),
    };
    if (budget.trim()) body.budget = Number(budget);
    if (departure) body.departureTime = new Date(departure).toISOString();

    setLoading(true);
    setResult(null);
    try {
      const res = await api.post<JourneyPlanResponse>("/api/trips/journey", body);
      setResult(res);
    } catch (e) {
      if (e instanceof ApiError && e.status === 404) {
        setError(e.message || "We couldn't find one of those places. Try a nearby city name.");
      } else {
        setError(e instanceof Error ? e.message : "Could not plan this journey. Is the backend running?");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ background: `linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, borderRadius: 12, padding: "13px 16px", marginBottom: 18, border: `1px solid ${t.accent}20` }}>
        <div style={{ fontSize: 14, color: t.accent, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon name="Sparkles" size={16} color={t.accent} /> Plan My Journey
        </div>
        <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>
          Just say where you&apos;re going. We pick the transport — drive, train, or fly with airport
          hops — and estimate the cost. No mode-picking needed.
        </div>
      </div>

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <Card t={t}>
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
        <div style={{ marginTop: 14 }}>
          <Btn onClick={planJourney} disabled={loading} full t={t}>{loading ? "Finding the best way..." : "✦ Plan My Journey"}</Btn>
        </div>
      </Card>

      {loading && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 30, animation: "spin 2s linear infinite", display: "inline-block", marginBottom: 12, color: t.accent }}>✦</div>
          <div style={{ color: t.muted, fontSize: 14, fontStyle: "italic" }}>Choosing modes and estimating cost...</div>
        </div>
      )}

      {result && <JourneyResult result={result} t={t} />}
    </div>
  );
}

function JourneyResult({ result, t }: { result: JourneyPlanResponse; t: Theme }) {
  const route = result.route as unknown as RoutePlanResult;
  const legs: LegResponse[] = route.legs || [];
  const cost = result.cost;
  const within = result.withinBudget;

  return (
    <div data-testid="journey-result">
      {/* Headline: what the engine chose */}
      <Card t={t}>
        <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          We&apos;ll get you there by
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
          {result.chosenModes.map((m, i) => {
            const meta = TRANSPORT_META[m] ?? { label: m, icon: "•" };
            return (
              <span key={`${m}-${i}`} data-testid="mode-chip" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 999, border: `1.5px solid ${t.accent}`, background: t.accent + "12", color: t.accent, fontSize: 13, fontWeight: 700 }}>
                <span style={{ fontSize: 15 }}>{meta.icon}</span>{meta.label}
              </span>
            );
          })}
          {result.roundTrip && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", borderRadius: 999, border: `1.5px solid ${t.border}`, background: t.tag, color: t.muted, fontSize: 12.5, fontWeight: 700 }}>
              <Icon name="Repeat" size={13} color={t.muted} /> Round trip
            </span>
          )}
        </div>
        <div style={{ fontSize: 12.5, color: t.muted, marginTop: 8 }}>
          {result.origin.name} → {result.destination.name} · {result.peopleCount} {result.peopleCount === 1 ? "traveller" : "travellers"}
        </div>
        <GeoNote result={result} t={t} />
      </Card>

      {/* Cost */}
      <Card t={t}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 4 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>💰 Estimated cost</div>
          <div data-testid="cost-total" style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{inr(cost.total)}</div>
        </div>
        <div style={{ fontSize: 12, color: t.muted, marginBottom: 12 }}>
          ≈ {inr(cost.perPerson)} per person · {cost.currency}
        </div>

        {within !== null && within !== undefined && result.budget != null && (
          <div data-testid="budget-banner" data-within={within ? "yes" : "no"} style={{
            display: "flex", alignItems: "center", gap: 8, padding: "9px 12px", borderRadius: 10, marginBottom: 12,
            background: (within ? t.success : t.danger) + "12",
            border: `1px solid ${(within ? t.success : t.danger)}30`,
            color: within ? t.success : t.danger, fontSize: 12.5, fontWeight: 700,
          }}>
            <Icon name={within ? "Check" : "AlertTriangle"} size={15} color={within ? t.success : t.danger} />
            {within
              ? `Within your ${inr(result.budget)} budget — ${inr(result.budget - cost.total)} to spare.`
              : `Over your ${inr(result.budget)} budget by ${inr(cost.total - result.budget)}.`}
          </div>
        )}

        {cost.perLeg.map((leg, i) => {
          const meta = leg.transport ? TRANSPORT_META[leg.transport] : undefined;
          return (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: i < cost.perLeg.length - 1 ? `1px solid ${t.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>{meta?.icon ?? "•"}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {leg.from} → {leg.to}
                  </div>
                  <div style={{ fontSize: 11, color: t.muted }}>
                    {meta?.label ?? leg.transport}{leg.distanceKm ? ` · ${Math.round(leg.distanceKm).toLocaleString()} km` : ""}
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.text, flexShrink: 0, marginLeft: 10 }}>{inr(leg.estimatedCost)}</div>
            </div>
          );
        })}
        <div style={{ fontSize: 11, color: t.muted, marginTop: 10, fontStyle: "italic" }}>
          Estimate from distance × per-km rates — cars are charged per vehicle, tickets per person.
        </div>
      </Card>

      {/* Map + timeline (reused from the route planner) */}
      <RouteMap result={route} t={t} />

      <Card t={t}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Stat label="Total distance" value={`${Math.round(route.distanceKm).toLocaleString()} km`} t={t} />
          <Stat label="Time in transit" value={fmtDuration(route.estimatedDurationHours)} t={t} />
          <Stat label="Departs" value={fmtClock(route.departureTime)} t={t} />
          <Stat label="Arrives" value={fmtClock(route.arrivalTime)} t={t} />
        </div>
      </Card>

      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14 }}>🧭 Journey timeline</div>
        {legs.map((leg, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < legs.length - 1 ? 16 : 0 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: mediumColor(t, leg.medium) + "18", border: `1.5px solid ${mediumColor(t, leg.medium)}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{leg.icon}</div>
              {i < legs.length - 1 && <div style={{ flex: 1, width: 2, background: t.border, marginTop: 4 }} />}
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
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 7 }}>{label}</div>
      {children}
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

function inputStyle(t: Theme, filled: boolean): React.CSSProperties {
  return {
    width: "100%", padding: "12px 14px", borderRadius: 12,
    border: `1.5px solid ${filled ? t.accent : t.border}`,
    background: t.card, color: t.text, fontSize: 14, outline: "none", boxSizing: "border-box",
  };
}

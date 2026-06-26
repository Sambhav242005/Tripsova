"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import type { Theme } from "@/data";
import { ScreenHeader, SegmentedTabs } from "../primitives/index";
import { Icon } from "../icon";
import { queryToSeed } from "../nav";
import { PlanScreen } from "./plan-screen";
import { JourneyScreen } from "./journey-screen";
import { RouteScreen } from "./route-screen";
import { TransitScreen } from "./transit-screen";
import { BudgetScreen } from "./budget-screen";

// ─────────────────────────────────────────────────────────────────────────────
// One front door for trip planning. The four tools that used to be separate nav
// items — AI Trip Builder, Plan My Journey, Route Planner, Budget Tracker — are now
// three steps of a single flow. Each step re-hosts its existing, fully backend-wired
// screen in `embedded` mode (no rewrite of the planning logic); the hub only owns the
// step chrome and the URL sync (`?step=`), so steps stay shareable and back-friendly.
// ─────────────────────────────────────────────────────────────────────────────

type Step = "itinerary" | "getting-there" | "budget";
type GoMode = "auto" | "manual" | "transit";

const STEPS: { id: Step; label: string; icon: string; subtitle: string }[] = [
  {
    id: "itinerary",
    label: "Itinerary",
    icon: "Sparkles",
    subtitle: "Tell us your destination and dates — we'll build a day-by-day plan with food and stops.",
  },
  {
    id: "getting-there",
    label: "Getting there",
    icon: "Navigation",
    subtitle: "How you'll travel and what it costs — auto-planned, or build the legs yourself.",
  },
  {
    id: "budget",
    label: "Budget",
    icon: "Wallet",
    subtitle: "Track and split what you actually spend, so the group always knows who owes whom.",
  },
];

const GO_OPTIONS: { id: GoMode; label: string; icon: string }[] = [
  { id: "auto", label: "Auto-plan", icon: "Sparkles" },
  { id: "manual", label: "Build it myself", icon: "Route" },
];

export function TripPlannerHub({ t }: { t: Theme }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  // A journey seed in the URL (?from=&to=…, e.g. opened from the profile's saved
  // journeys) means the traveller wants the "getting there" step, auto mode.
  const seed = useMemo(() => queryToSeed(sp), [sp]);

  const rawStep = sp.get("step");
  const step: Step = STEPS.some(s => s.id === rawStep)
    ? (rawStep as Step)
    : seed
      ? "getting-there"
      : "itinerary";

  const [goMode, setGoMode] = useState<GoMode>("auto");

  const scrollTop = useCallback(() => {
    requestAnimationFrame(() => {
      document.getElementById("tripova-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
    });
  }, []);

  const setStep = useCallback((next: Step) => {
    const params = new URLSearchParams(sp.toString());
    params.set("step", next);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    scrollTop();
  }, [router, pathname, sp, scrollTop]);

  // Switching transport mode within the "getting there" step shouldn't make the user
  // hunt for the result — bring them back to the top of the panel.
  useEffect(() => { scrollTop(); }, [goMode, scrollTop]);

  const active = STEPS.find(s => s.id === step) ?? STEPS[0];

  return (
    <div style={{ padding: "12px 16px 28px" }}>
      <ScreenHeader t={t} eyebrow="Trip planner" title="Plan a trip" subtitle={active.subtitle} />

      <SegmentedTabs<Step>
        t={t}
        ariaLabel="Trip planning steps"
        value={step}
        onChange={setStep}
        options={STEPS.map(s => ({ id: s.id, label: s.label, icon: s.icon }))}
      />

      {step === "itinerary" && <PlanScreen t={t} embedded />}

      {step === "getting-there" && (
        <div>
          <SegmentedTabs<GoMode>
            t={t}
            size="sm"
            ariaLabel="How to plan getting there"
            value={goMode === "transit" ? "manual" : goMode}
            onChange={setGoMode}
            options={GO_OPTIONS}
          />
          {goMode === "auto" && (
            <>
              <ModeHint
                t={t}
                icon="Sparkles"
                text="Just enter where you're going — we pick the transport (drive, train or fly) and estimate the cost."
              />
              <JourneyScreen t={t} seed={seed} embedded />
            </>
          )}
          {goMode === "manual" && (
            <RouteScreen
              t={t}
              embedded
              onUseAutoPlanner={() => setGoMode("auto")}
              onOpenTransit={() => setGoMode("transit")}
            />
          )}
          {goMode === "transit" && (
            <TransitScreen t={t} embedded onBack={() => setGoMode("manual")} />
          )}
        </div>
      )}

      {step === "budget" && <BudgetScreen t={t} embedded />}
    </div>
  );
}

// Small italic helper line above an embedded planner, replacing the standalone screen's
// banner so the step still explains itself inside the hub.
function ModeHint({ t, icon, text }: { t: Theme; icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginBottom: 14, fontSize: 12, color: t.muted, lineHeight: 1.5, fontStyle: "italic" }}>
      <span style={{ flexShrink: 0, marginTop: 1 }}><Icon name={icon} size={14} color={t.accent} /></span>
      <span style={{ flex: 1 }}>{text}</span>
    </div>
  );
}

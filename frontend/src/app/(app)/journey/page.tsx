"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { JourneyScreen } from "@/components/tripova/screens/journey-screen";
import { useApp } from "@/components/tripova/app-provider";
import { queryToSeed } from "@/components/tripova/nav";

function JourneyRoute() {
  const { t } = useApp();
  const sp = useSearchParams();
  const seed = queryToSeed(sp);
  // Re-key on the query string so opening a new journey seed remounts the planner.
  return <JourneyScreen key={sp.toString() || "manual"} t={t} seed={seed} />;
}

export default function JourneyPage() {
  return (
    <Suspense fallback={null}>
      <JourneyRoute />
    </Suspense>
  );
}

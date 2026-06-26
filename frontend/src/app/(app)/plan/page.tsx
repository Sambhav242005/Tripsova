"use client";

import { Suspense } from "react";
import { TripPlannerHub } from "@/components/tripova/screens/trip-planner-hub";
import { useApp } from "@/components/tripova/app-provider";

export default function PlanPage() {
  const { t } = useApp();
  return (
    <Suspense fallback={null}>
      <TripPlannerHub t={t} />
    </Suspense>
  );
}

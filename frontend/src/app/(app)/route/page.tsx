"use client";

import { RouteScreen } from "@/components/tripova/screens/route-screen";
import { useApp } from "@/components/tripova/app-provider";
import { useAppNav } from "@/components/tripova/nav";

export default function RoutePage() {
  const { t } = useApp();
  const { goSub } = useAppNav();
  return <RouteScreen t={t} onUseAutoPlanner={() => goSub("journey")} onOpenTransit={() => goSub("transit")} />;
}

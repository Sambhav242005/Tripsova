"use client";

import { PodsScreen } from "@/components/tripova/screens/pods-screen";
import { useApp } from "@/components/tripova/app-provider";
import { useAppNav } from "@/components/tripova/nav";

export default function TripPodsPage() {
  const { t } = useApp();
  const { openJourney } = useAppNav();
  return <PodsScreen t={t} openJourney={openJourney} />;
}

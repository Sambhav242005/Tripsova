"use client";

import { DiscoverScreen } from "@/components/tripova/screens/discover-screen";
import { useApp } from "@/components/tripova/app-provider";
import { useAppNav } from "@/components/tripova/nav";

export default function TripPulsePage() {
  const { t } = useApp();
  const { openDest, openJourney } = useAppNav();
  return <DiscoverScreen t={t} openDest={openDest} openJourney={openJourney} />;
}

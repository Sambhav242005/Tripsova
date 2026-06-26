"use client";

import { OfflineMapsScreen } from "@/components/tripova/screens/offline-maps-screen";
import { useApp } from "@/components/tripova/app-provider";

export default function MapsPage() {
  const { t } = useApp();
  return <OfflineMapsScreen t={t} />;
}

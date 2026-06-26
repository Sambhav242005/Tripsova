"use client";

import { TransitScreen } from "@/components/tripova/screens/transit-screen";
import { useApp } from "@/components/tripova/app-provider";
import { useAppNav } from "@/components/tripova/nav";

export default function TransitPage() {
  const { t } = useApp();
  const { goSub } = useAppNav();
  return <TransitScreen t={t} onBack={() => goSub("route")} />;
}

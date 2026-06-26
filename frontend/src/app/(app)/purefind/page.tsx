"use client";

import { PureFindScreen } from "@/components/tripova/screens/purefind-screen";
import { useApp } from "@/components/tripova/app-provider";

export default function PureFindPage() {
  const { t } = useApp();
  return <PureFindScreen t={t} />;
}

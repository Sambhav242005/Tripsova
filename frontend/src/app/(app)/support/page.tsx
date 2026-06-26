"use client";

import { SupportScreen } from "@/components/tripova/screens/support-screen";
import { useApp } from "@/components/tripova/app-provider";

export default function SupportPage() {
  const { t } = useApp();
  return <SupportScreen t={t} />;
}

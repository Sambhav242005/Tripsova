"use client";

import { SettingsScreen } from "@/components/tripova/screens/settings-screen";
import { useApp } from "@/components/tripova/app-provider";

export default function SettingsPage() {
  const { t } = useApp();
  return <SettingsScreen t={t} />;
}

"use client";

import { AppProvider } from "@/components/tripova/app-provider";
import { AppShell } from "@/components/tripova/app-shell";

// The Tripsova application lives at /app. The public marketing site is at / .
export default function AppPage() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

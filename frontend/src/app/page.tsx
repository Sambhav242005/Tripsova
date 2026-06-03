"use client";

import { AppProvider } from "@/components/tripova/app-provider";
import { AppShell } from "@/components/tripova/app-shell";

export default function Home() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

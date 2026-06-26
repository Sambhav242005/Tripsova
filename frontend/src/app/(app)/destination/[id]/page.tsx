"use client";

import { use } from "react";
import { DestinationHub } from "@/components/tripova/screens/destination-hub";
import { useApp } from "@/components/tripova/app-provider";
import { useAppNav } from "@/components/tripova/nav";

export default function DestinationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { t } = useApp();
  const { goTab } = useAppNav();
  return (
    <DestinationHub
      t={t}
      destId={decodeURIComponent(id)}
      openPods={() => goTab("pods")}
      openPureFind={() => goTab("purefind")}
    />
  );
}

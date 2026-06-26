"use client";

import { HomeScreen } from "@/components/tripova/screens/home-screen";
import { useApp } from "@/components/tripova/app-provider";
import { useAppNav } from "@/components/tripova/nav";

export default function HomePage() {
  const { t, createdPosts } = useApp();
  const { openDest, goTab, goSub } = useAppNav();
  return <HomeScreen t={t} openDest={openDest} openTab={goTab} openPlan={() => goSub("plan")} createdPosts={createdPosts} />;
}

"use client";

import { ProfileScreen } from "@/components/tripova/screens/profile-screen";
import { useApp } from "@/components/tripova/app-provider";
import { useAppNav } from "@/components/tripova/nav";

export default function ProfilePage() {
  const { t, lang, setLang } = useApp();
  const { goSub, openJourney } = useAppNav();
  return <ProfileScreen t={t} lang={lang} setLang={setLang} go={goSub} openJourney={openJourney} />;
}

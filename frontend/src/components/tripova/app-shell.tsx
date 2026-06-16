"use client";

import React, { useRef, useState } from "react";
import { LANGUAGES as LANGS } from "@/data";
import type { Theme } from "@/data";
import { Icon } from "./icon";
import { Logo } from "./logo";
import { useApp } from "./app-provider";
import { SideDrawer } from "./layout/side-drawer";
import { HomeScreen } from "./screens/home-screen";
import { DiscoverScreen } from "./screens/discover-screen";
import { PureFindScreen } from "./screens/purefind-screen";
import { PodsScreen } from "./screens/pods-screen";
import { PlanScreen } from "./screens/plan-screen";
import { RouteScreen } from "./screens/route-screen";
import { JourneyScreen, type JourneySeed } from "./screens/journey-screen";
import { BudgetScreen } from "./screens/budget-screen";
import { OfflineMapsScreen } from "./screens/offline-maps-screen";
import { ProfileScreen } from "./screens/profile-screen";
import { SettingsScreen } from "./screens/settings-screen";
import { SupportScreen } from "./screens/support-screen";
import { DestinationHub } from "./screens/destination-hub";
import { CreateSheet } from "./overlays/create-sheet";
import { NotificationsSheet } from "./overlays/notifications-sheet";
import { EmergencySheet } from "./overlays/emergency-sheet";
import { LoginScreen } from "./auth/login-screen";
import { RegisterScreen } from "./auth/register-screen";
import type { FeedPostResponse, TripPodResponse } from "@/lib/types";

const styles = {
  phoneFrame: {
    maxWidth: 430,
    margin: "0 auto",
    minHeight: "100vh",
    position: "relative" as const,
    boxShadow: "0 0 60px rgba(0,0,0,0.08)",
  },
  header: (t: Theme) => ({
    zIndex: 50,
    background: t.bg + "F2",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: `1px solid ${t.border}`,
    padding: "calc(12px + env(safe-area-inset-top)) 12px 10px",
  }),
  headerRow: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
};

const TITLE_MAP: Record<string, string> = {
  home: "Home",
  discover: "Trip Pulse",
  purefind: "PureFind",
  pods: "TripPods",
  profile: "Profile",
  plan: "AI Trip Builder",
  journey: "Plan My Journey",
  route: "Route Planner",
  budget: "Budget Tracker",
  maps: "Offline Maps",
  settings: "Settings & Privacy",
  support: "Help & Support",
  dest: "Destination",
};

export function AppShell() {
  const { t, dark, setDark, tab, setTab, sub, setSub, dest, setDest, lang, setLang, setDrawerOpen, T, isAuth, loading } = useApp();
  const [langOpen, setLangOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [createdPosts, setCreatedPosts] = useState<FeedPostResponse[]>([]);
  const [, setCreatedPods] = useState<TripPodResponse[]>([]);
  const [journeySeed, setJourneySeed] = useState<JourneySeed | null>(null);
  const [authView, setAuthView] = useState<"login" | "register">("login");
  const mainScrollRef = useRef<HTMLDivElement>(null);
  const journeySeedSeq = useRef(0);

  const active = dest ? "dest" : (sub || tab);
  const isOverlay = !!dest || ["plan", "journey", "route", "budget", "maps", "settings", "support"].includes(active);
  const currentTitle = TITLE_MAP[active] || "Tripsova";

  const navItems = [
    { id: "home", icon: "House", label: "Home" },
    { id: "discover", icon: "Activity", label: "Trip Pulse" },
    { id: "purefind", icon: "Salad", label: "PureFind" },
    { id: "pods", icon: "Users", label: "TripPods" },
    { id: "profile", icon: "User", label: "Profile" },
  ];

  const LANG_CODE: Record<string, string> = { "English": "EN", "हिंदी": "हिं", "தமிழ்": "த", "বাংলা": "বাং" };

  const scrollToTop = () => {
    requestAnimationFrame(() => {
      mainScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };
  const openDest = (id: string) => { setJourneySeed(null); setDest(id); scrollToTop(); };
  const goTab = (id: string) => { setJourneySeed(null); setTab(id); setSub(null); setDest(null); scrollToTop(); };
  const goSub = (id: string) => { setJourneySeed(null); setSub(id); scrollToTop(); };
  const openJourney = (seed: Omit<JourneySeed, "key">) => {
    journeySeedSeq.current += 1;
    setJourneySeed({ ...seed, key: `journey-${journeySeedSeq.current}` });
    setDest(null);
    setSub("journey");
    scrollToTop();
  };

  const renderScreen = () => {
    if (dest) return <DestinationHub t={t} destId={dest} openPods={() => { setDest(null); setTab("pods"); scrollToTop(); }} openPureFind={() => { setDest(null); setTab("purefind"); scrollToTop(); }} />;
    switch (active) {
      case "home": return <HomeScreen t={t} openDest={openDest} openTab={goTab} createdPosts={createdPosts} />;
      case "discover": return <DiscoverScreen t={t} openDest={openDest} />;
      case "purefind": return <PureFindScreen t={t} />;
      case "pods": return <PodsScreen t={t} openJourney={openJourney} />;
      case "profile": return <ProfileScreen t={t} lang={lang} setLang={setLang} go={goSub} />;
      case "plan": return <PlanScreen t={t} />;
      case "journey": return <JourneyScreen key={journeySeed?.key || "journey-manual"} t={t} seed={journeySeed} />;
      case "route": return <RouteScreen t={t} />;
      case "budget": return <BudgetScreen t={t} />;
      case "maps": return <OfflineMapsScreen t={t} />;
      case "settings": return <SettingsScreen t={t} />;
      case "support": return <SupportScreen t={t} />;
      default: return null;
    }
  };

  // Right-hand controls (language + theme) shared by the mobile header and desktop top bar.
  const headerControls = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setLangOpen(o => !o)}
          aria-label="Change language"
          style={{
            height: 36, padding: "0 12px", borderRadius: 10,
            border: `1px solid ${t.border}`, background: t.card, color: t.text,
            cursor: "pointer", fontSize: 12, fontWeight: 600,
            display: "flex", alignItems: "center", gap: 5,
          }}
        >
          <Icon name="Globe" size={14} color={t.secondary} />
          {LANG_CODE[lang] || "EN"}
        </button>
        {langOpen && (
          <>
            <div onClick={() => setLangOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
            <div style={{
              position: "absolute", top: 42, right: 0, background: t.card,
              border: `1px solid ${t.border}`, borderRadius: 14,
              boxShadow: `0 8px 28px rgba(0,0,0,0.12)`, padding: 6, zIndex: 100, width: 160,
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "6px 10px 4px" }}>{T("Language")}</div>
              {LANGS.map(l => (
                <button
                  key={l}
                  onClick={() => { setLang(l); setLangOpen(false); }}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    width: "100%", padding: "9px 10px", borderRadius: 8, border: "none",
                    background: lang === l ? t.accent + "12" : "transparent",
                    color: lang === l ? t.accent : t.text, cursor: "pointer",
                    fontSize: 13.5, fontWeight: lang === l ? 700 : 500,
                  }}
                >
                  {l} {lang === l && <Icon name="Check" size={14} color={t.accent} />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <button
        onClick={() => setDark(d => !d)}
        aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        style={{
          width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`,
          background: t.card, cursor: "pointer", display: "flex", alignItems: "center",
          justifyContent: "center", transition: "background 0.2s, border-color 0.2s",
        }}
      >
        <Icon name={dark ? "Sun" : "Moon"} size={16} color={t.text} />
      </button>
    </div>
  );

  if (loading) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${t.border}`, borderTopColor: t.accent, animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (!isAuth) {
    const authForm =
      authView === "login" ? (
        <LoginScreen t={t} onSwitch={() => setAuthView("register")} onSuccess={() => {}} />
      ) : (
        <RegisterScreen t={t} onSwitch={() => setAuthView("login")} onSuccess={() => {}} />
      );

    const authHighlights: [string, string][] = [
      ["PureFind", "Diet-aware places ranked by trust and verification."],
      ["TrustScore", "Every update weighted by traveller credibility."],
      ["TripPods", "Find verified companions heading your way."],
      ["Offline packs", "Your trip keeps working with no signal."],
    ];

    return (
      <div
        className="md:grid md:grid-cols-[1.05fr_1fr]"
        style={{ minHeight: "100vh", background: t.bg, transition: "background 0.3s" }}
      >
        {/* Desktop brand panel — a fixed navy hero, hidden on mobile */}
        <aside
          className="hidden md:flex"
          style={{
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "56px 56px 40px",
            background: "linear-gradient(150deg, #1B263B 0%, #0F1722 100%)",
            color: "#fff",
          }}
        >
          <Logo size={40} showTagline color="#fff" taglineColor={t.goldFill} />
          <div style={{ maxWidth: 460 }}>
            <h2
              style={{
                fontFamily: "var(--font-dm-serif), Georgia, serif",
                fontSize: 38,
                lineHeight: 1.15,
                fontWeight: 400,
                margin: "0 0 22px",
              }}
            >
              Travel decisions, verified by real travellers.
            </h2>
            <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
              {authHighlights.map(([title, desc]) => (
                <li key={title} style={{ display: "flex", gap: 12, alignItems: "flex-start", fontSize: 15 }}>
                  <span style={{ marginTop: 1, flexShrink: 0 }}>
                    <Icon name="Check" size={18} color={t.goldFill} />
                  </span>
                  <span>
                    <strong style={{ fontWeight: 700 }}>{title}</strong>
                    <span style={{ opacity: 0.78 }}> — {desc}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", opacity: 0.55, margin: 0 }}>
            Powered by Travellers
          </p>
        </aside>

        {/* Form panel — full screen on mobile, right column on desktop */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "24px",
          }}
        >
          <div style={{ position: "absolute", top: 18, right: 18 }}>{headerControls}</div>
          <div style={{ width: "100%", maxWidth: 400 }}>{authForm}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="w-full md:grid md:grid-cols-[260px_1fr]"
      style={{ background: t.bg, minHeight: "100dvh", transition: "background 0.3s" }}
    >
      {/* Desktop sidebar (hidden on mobile) */}
      <aside
        className="hidden md:flex"
        style={{
          flexDirection: "column",
          gap: 4,
          width: 260,
          height: "100dvh",
          position: "sticky",
          top: 0,
          overflowY: "auto",
          background: t.card,
          borderRight: `1px solid ${t.border}`,
          padding: "20px 14px",
        }}
      >
        <div style={{ padding: "4px 8px 20px" }}>
          <Logo size={34} showTagline color={t.heading} taglineColor={t.gold} />
        </div>
        {navItems.map(item => {
          const isActive = tab === item.id && !sub && !dest;
          return (
            <button
              key={item.id}
              onClick={() => goTab(item.id)}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "11px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                background: isActive ? t.accent + "12" : "transparent",
                color: isActive ? t.accent : t.text,
                fontSize: 14.5, fontWeight: isActive ? 700 : 600, textAlign: "left",
                transition: "all 0.15s",
              }}
            >
              <Icon name={item.icon} size={20} color={isActive ? t.accent : t.muted} stroke={isActive ? 2.4 : 1.8} />
              {T(item.label)}
            </button>
          );
        })}
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "11px", borderRadius: 12, border: "none", cursor: "pointer",
            background: `linear-gradient(135deg,${t.accent},${t.secondary})`, color: "#fff",
            fontSize: 14, fontWeight: 700,
          }}
        >
          <Icon name="Plus" size={18} color="#fff" /> {T("Create")}
        </button>
        <div style={{ marginTop: "auto", fontSize: 11, color: t.muted, padding: "12px 10px" }}>
          Powered by Travellers
        </div>
      </aside>

      {/* Main column — flex column so header + content + bottom nav stack without scroll-container sticky issues */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, height: "100dvh", minHeight: 0 }}>
        <div className="md:hidden">
          <SideDrawer />
        </div>

        <div style={{ ...styles.header(t), flexShrink: 0 }}>
          <div style={styles.headerRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isOverlay ? (
                <button
                  onClick={() => { if (dest) setDest(null); else setSub(null); scrollToTop(); }}
                  aria-label="Back"
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`,
                    background: t.card, cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", color: t.accent, transition: "all 0.15s",
                  }}
                >
                  <Icon name="ChevronLeft" size={18} color={t.text} />
                </button>
              ) : (
                <button
                  className="flex md:hidden"
                  onClick={() => setDrawerOpen ? setDrawerOpen(true) : null}
                  aria-label="Menu"
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`,
                    background: t.card, cursor: "pointer", alignItems: "center",
                    justifyContent: "center", transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  <Icon name="Menu" size={18} color={t.text} />
                </button>
              )}
              <span className="md:hidden">
                <Logo size={34} showTagline color={t.heading} taglineColor={t.gold} />
              </span>
              <span
                className="hidden md:block"
                style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 19, color: t.heading }}
              >
                {T(currentTitle)}
              </span>
            </div>
            {headerControls}
          </div>
        </div>

        <div id="tripova-scroll" ref={mainScrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          <div
            className="md:max-w-[880px] md:mx-auto"
            style={{ paddingTop: active === "dest" ? 0 : 4, minHeight: "100%" }}
          >
            {renderScreen()}
          </div>
        </div>

        <div
          className="flex md:hidden"
          style={{
            flexShrink: 0, background: t.card + "F2",
            backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
            borderTop: `1px solid ${t.border}`,
            padding: "6px 0 calc(10px + env(safe-area-inset-bottom))", justifyContent: "space-around", zIndex: 60,
          }}
        >
          {navItems.map(item => {
            const isActive = tab === item.id && !sub && !dest;
            return (
              <button
                key={item.id}
                onClick={() => goTab(item.id)}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 2, padding: "4px 6px", minWidth: 58, transition: "color 0.2s ease, background 0.2s ease",
                }}
              >
                <div style={{
                  width: 40, height: 32, borderRadius: 8,
                  background: isActive ? t.accent + "10" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s",
                }}>
                  <Icon
                    name={item.icon}
                    size={20}
                    color={isActive ? t.accent : t.muted}
                    stroke={isActive ? 2.4 : 1.8}
                  />
                </div>
                <span style={{
                  fontSize: 10, color: isActive ? t.accent : t.muted,
                  fontWeight: isActive ? 700 : 500, letterSpacing: 0.3,
                  maxWidth: 64, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  {T(item.label)}
                </span>
              </button>
            );
          })}
        </div>

        {(active === "home" || active === "pods") && (
          <div
            className="md:hidden"
            style={{
              position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
              width: "100%", height: 0, pointerEvents: "none", zIndex: 65,
            }}
          >
            <button
              onClick={() => setCreateOpen(true)}
              aria-label="Create"
              style={{
                position: "absolute", right: 20, bottom: 90, width: 52, height: 52,
                borderRadius: "50%",
                background: `linear-gradient(135deg,${t.accent},${t.secondary})`,
                border: `2px solid ${t.card}`, cursor: "pointer",
                boxShadow: `0 4px 16px ${t.accent}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "auto", transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = `0 6px 24px ${t.accent}60`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 16px ${t.accent}50`; }}
            >
              <Icon name="Plus" size={22} color="#fff" />
            </button>
          </div>
        )}
      </div>

      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} t={t} onCreatePost={(post) => setCreatedPosts(p => [...p, post])} onCreatePod={(pod) => setCreatedPods(p => [...p, pod])} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} t={t} />
      <EmergencySheet open={emergencyOpen} onClose={() => setEmergencyOpen(false)} t={t} />
    </div>
  );
}

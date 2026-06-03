"use client";

import React, { useState } from "react";
import { LANGUAGES as LANGS, SCREEN_TITLES } from "@/data";
import { Icon } from "./icon";
import { useApp } from "./app-provider";
import { SideDrawer } from "./layout/side-drawer";
import { HomeScreen } from "./screens/home-screen";
import { DiscoverScreen } from "./screens/discover-screen";
import { PureFindScreen } from "./screens/purefind-screen";
import { PodsScreen } from "./screens/pods-screen";
import { PlanScreen } from "./screens/plan-screen";
import { GuidesScreen } from "./screens/guides-screen";
import { FamilyScreen } from "./screens/family-screen";
import { BudgetScreen } from "./screens/budget-screen";
import { OfflineMapsScreen } from "./screens/offline-maps-screen";
import { ProfileScreen } from "./screens/profile-screen";
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
  header: (t: any) => ({
    position: "sticky" as const,
    top: 0,
    zIndex: 50,
    background: t.bg + "F2",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: `1px solid ${t.border}`,
    padding: "12px 16px 10px",
  }),
  headerRow: {
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
  },
  logoBox: (t: any) => ({
    width: 32,
    height: 32,
    borderRadius: 10,
    background: t.accent,
    display: "flex",
    alignItems: "center" as const,
    justifyContent: "center" as const,
    flexShrink: 0,
  }),
  navIcon: (t: any, isActive: boolean) => ({
    background: "transparent",
    border: "none",
    cursor: "pointer" as const,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center" as const,
    gap: 2,
    padding: "4px 14px",
    transition: "all 0.2s ease",
    position: "relative" as const,
  }),
};

export function AppShell() {
  const { t, dark, setDark, tab, setTab, sub, setSub, dest, setDest, lang, setLang, setDrawerOpen, T, isAuth, loading } = useApp();
  const [langOpen, setLangOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [createdPosts, setCreatedPosts] = useState<FeedPostResponse[]>([]);
  const [createdPods, setCreatedPods] = useState<TripPodResponse[]>([]);
  const [authView, setAuthView] = useState<"login" | "register">("login");

  const active = dest ? "dest" : (sub || tab);
  const isOverlay = !!dest || ["plan", "guides", "family", "budget", "maps"].includes(active);

  const navItems = [
    { id: "home", icon: "House", label: "Home" },
    { id: "discover", icon: "Compass", label: "Discover" },
    { id: "purefind", icon: "Salad", label: "PureFind" },
    { id: "pods", icon: "Users", label: "Pods" },
    { id: "profile", icon: "User", label: "Profile" },
  ];

  const LANG_CODE: Record<string, string> = { "English": "EN", "हिंदी": "हिं", "தமிழ்": "த", "বাংলা": "বাং" };

  const openDest = (id: string) => { setDest(id); window.scrollTo(0, 0); };

  const renderScreen = () => {
    if (dest) return <DestinationHub t={t} destId={dest} openPods={() => { setDest(null); setTab("pods"); }} openPureFind={() => { setDest(null); setTab("purefind"); }} />;
    switch (active) {
      case "home": return <HomeScreen t={t} openDest={openDest} createdPosts={createdPosts} />;
      case "discover": return <DiscoverScreen t={t} openDest={openDest} />;
      case "purefind": return <PureFindScreen t={t} />;
      case "pods": return <PodsScreen t={t} />;
      case "profile": return <ProfileScreen t={t} lang={lang} setLang={setLang} go={(id) => { setSub(id); window.scrollTo(0, 0); }} />;
      case "plan": return <PlanScreen t={t} />;
      case "guides": return <GuidesScreen t={t} />;
      case "family": return <FamilyScreen t={t} />;
      case "budget": return <BudgetScreen t={t} />;
      case "maps": return <OfflineMapsScreen t={t} />;
      default: return null;
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: 430, margin: "0 auto", minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${t.border}`, borderTopColor: t.accent, animation: "spin 0.7s linear infinite" }} />
      </div>
    );
  }

  if (!isAuth) {
    return (
      <div style={{ ...styles.phoneFrame, background: t.bg, transition: "background 0.3s" }}>
        {authView === "login" ? (
          <LoginScreen t={t} onSwitch={() => setAuthView("register")} onSuccess={() => {}} />
        ) : (
          <RegisterScreen t={t} onSwitch={() => setAuthView("login")} onSuccess={() => {}} />
        )}
      </div>
    );
  }

  return (
    <div style={{ ...styles.phoneFrame, background: t.bg, transition: "background 0.3s" }}>
      <div style={{ height: "100vh", overflowY: "auto", overflowX: "hidden" }}>
        <SideDrawer />

        <div style={styles.header(t)}>
          <div style={styles.headerRow}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isOverlay ? (
                <button
                  onClick={() => { if (dest) setDest(null); else setSub(null); window.scrollTo(0, 0); }}
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
                  onClick={() => setDrawerOpen ? setDrawerOpen(true) : null}
                  aria-label="Menu"
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`,
                    background: t.card, cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "center", transition: "all 0.15s",
                  }}
                >
                  <Icon name="Menu" size={18} color={t.text} />
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={styles.logoBox(t)}>
                  <Icon name="Compass" size={17} color={t.goldFill} />
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: t.accent, letterSpacing: 2.2 }}>TRIPOVA</div>
                  <div style={{ fontSize: 9, color: t.gold, fontWeight: 700, letterSpacing: 0.7, marginTop: -1 }}>
                    POWERED BY TRAVELLERS
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ position: "relative" }}>
                <button
                  onClick={() => setLangOpen(o => !o)}
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
                style={{
                  width: 36, height: 36, borderRadius: 10, border: `1px solid ${t.border}`,
                  background: t.card, cursor: "pointer", display: "flex", alignItems: "center",
                  justifyContent: "center", transition: "all 0.2s",
                }}
              >
                <Icon name={dark ? "Sun" : "Moon"} size={16} color={t.text} />
              </button>
            </div>
          </div>
        </div>

        <div style={{ paddingTop: active === "dest" ? 0 : 4, minHeight: "calc(100vh - 140px)" }}>{renderScreen()}</div>

        <div style={{
          position: "sticky", bottom: 0, background: t.card + "F2",
          backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
          borderTop: `1px solid ${t.border}`,
          padding: "6px 0 10px", display: "flex", justifyContent: "space-around", zIndex: 60,
        }}>
          {navItems.map(item => {
            const isActive = tab === item.id && !sub && !dest;
            return (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); window.scrollTo(0, 0); }}
                style={{
                  background: "transparent", border: "none", cursor: "pointer",
                  display: "flex", flexDirection: "column", alignItems: "center",
                  gap: 2, padding: "4px 10px", transition: "all 0.2s ease",
                }}
              >
                <div style={{
                  width: 40, height: 32, borderRadius: 8,
                  background: isActive ? t.accent + "10" : "transparent",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.2s",
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
                }}>
                  {T(item.label)}
                </span>
              </button>
            );
          })}
        </div>

        {(active === "home" || active === "pods") && (
          <div style={{
            position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
            width: "100%", maxWidth: 430, height: 0, pointerEvents: "none", zIndex: 65,
          }}>
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

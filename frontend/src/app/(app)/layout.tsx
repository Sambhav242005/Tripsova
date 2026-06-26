"use client";

import React, { useRef, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LANGUAGES as LANGS } from "@/data";
import type { Theme } from "@/data";
import { Icon } from "@/components/tripova/icon";
import { Logo } from "@/components/tripova/logo";
import { getToken } from "@/lib/api";
import { AppProvider, useApp } from "@/components/tripova/app-provider";
import { useAppNav, parseRoute } from "@/components/tripova/nav";
import { SideDrawer } from "@/components/tripova/layout/side-drawer";
import { CreateSheet } from "@/components/tripova/overlays/create-sheet";
import { NotificationsSheet } from "@/components/tripova/overlays/notifications-sheet";
import { EmergencySheet } from "@/components/tripova/overlays/emergency-sheet";
import { ErrorBoundary } from "@/components/tripova/error-boundary";

const headerStyle = (t: Theme) => ({
  zIndex: 50,
  background: t.bg + "F2",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  borderBottom: `1px solid ${t.border}`,
  padding: "calc(12px + env(safe-area-inset-top)) 16px 10px",
});

const TITLE_MAP: Record<string, string> = {
  home: "Home",
  discover: "Trip Pulse",
  purefind: "PureFind",
  pods: "TripPods",
  profile: "Profile",
  plan: "Plan a trip",
  journey: "Plan My Journey",
  route: "Route Planner",
  budget: "Budget Tracker",
  transit: "BMTC Bus Tracker",
  maps: "Offline Maps",
  settings: "Settings & Privacy",
  support: "Help & Support",
  dest: "Destination",
};

const NAV_ITEMS = [
  { id: "home", icon: "House", label: "Home" },
  { id: "discover", icon: "Activity", label: "Trip Pulse" },
  { id: "purefind", icon: "Salad", label: "PureFind" },
  { id: "pods", icon: "Users", label: "TripPods" },
  { id: "profile", icon: "User", label: "Profile" },
];

// The four planning tools (AI builder, journey, route, budget) used to live here as
// separate nav items; they're now steps inside the single "Plan a trip" hub (/plan).
// These are the three steps, surfaced as deep-link shortcuts in the desktop right rail.
const PLAN_STEPS = [
  { step: "itinerary", icon: "Sparkles", label: "Itinerary", sub: "Day-by-day plan" },
  { step: "getting-there", icon: "Navigation", label: "Getting there", sub: "Transport & cost" },
  { step: "budget", icon: "Wallet", label: "Budget", sub: "Track & split" },
];

const UTILITY_ITEMS = [
  { id: "maps", icon: "MapPinned", label: "Offline Maps" },
  { id: "settings", icon: "Settings", label: "Settings & Privacy" },
  { id: "support", icon: "LifeBuoy", label: "Help & Support" },
];

const LANG_CODE: Record<string, string> = { English: "EN", "हिंदी": "हिं", "தமிழ்": "த", "বাংলা": "বাং" };

function Spinner({ t }: { t: Theme }) {
  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100dvh", background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", border: `3px solid ${t.border}`, borderTopColor: t.accent, animation: "spin 0.7s linear infinite" }} />
    </div>
  );
}

function AppChrome({ children }: { children: React.ReactNode }) {
  const { t, dark, setDark, lang, setLang, setDrawerOpen, T, isAuth, loading, addCreatedPost, addCreatedPod } = useApp();
  const { goTab, goSub, back } = useAppNav();
  const router = useRouter();
  const pathname = usePathname();

  const { active, isOverlay } = parseRoute(pathname);
  const currentTitle = TITLE_MAP[active] || "Tripsova";

  useEffect(() => {
    // Only bounce away when there's genuinely no session. While a token is
    // present but still being verified, the spinner below covers it — without the
    // getToken() guard the first render (loading=false, isAuth=false before /me
    // resolves) redirects, ping-ponging /→/login→/ and hammering /api/auth/me.
    // Logged-out visitors landing on the root see the marketing welcome page (not a
    // bare login wall); a deep app link (e.g. /purefind) sends them straight to login.
    if (!loading && !isAuth && !getToken()) {
      router.replace(pathname === "/" ? "/welcome" : "/login");
    }
  }, [isAuth, loading, router, pathname]);

  const [langOpen, setLangOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const mainScrollRef = useRef<HTMLDivElement>(null);

  // Each route swaps {children} inside the persistent scroll container, so reset
  // the scroll position on navigation (the old shell did this per screen change).
  useEffect(() => {
    mainScrollRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  // Right-hand controls (language + theme), shared by mobile header and desktop bar.
  const headerControls = (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ position: "relative" }}>
        <button
          onClick={() => setLangOpen(o => !o)}
          aria-label={`${LANG_CODE[lang] || "EN"} — change language`}
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

  if (loading || !isAuth) return <Spinner t={t} />;

  return (
    <div
      className="w-full md:grid md:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_300px]"
      style={{ background: "var(--background)", minHeight: "100dvh", transition: "background 0.3s" }}
    >
      <a href="#main-content" className="skip-link">{T("Skip to content")}</a>

      {/* Desktop sidebar (hidden on mobile) */}
      <aside
        className="hidden md:flex"
        style={{
          flexDirection: "column", gap: 4, width: 260, height: "100dvh",
          position: "sticky", top: 0, overflowY: "auto",
          background: t.card, borderRight: `1px solid ${t.border}`, padding: "20px 14px",
        }}
      >
        <div style={{ padding: "4px 8px 18px" }}>
          <Logo size={34} showTagline color={t.heading} taglineColor={t.gold} />
        </div>
        <nav aria-label="Primary" style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {NAV_ITEMS.map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTab(item.id)}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "11px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: isActive ? t.accent + "16" : "transparent",
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
        </nav>

        {/* Primary action. Planning a trip is the app's main job, so it's the one hero
            CTA — the four old planning tools now live as steps inside it (/plan). */}
        <button
          onClick={() => goSub("plan")}
          aria-current={active === "plan" ? "page" : undefined}
          style={{
            marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            padding: "13px", borderRadius: 13, cursor: "pointer",
            border: active === "plan" ? `1.5px solid ${t.onAccent}66` : "1.5px solid transparent",
            background: `linear-gradient(135deg,${t.accent},${t.secondary})`, color: t.onAccent,
            fontSize: 14.5, fontWeight: 800, boxShadow: `0 8px 22px ${t.accent}40`,
          }}
        >
          <Icon name="Compass" size={19} color={t.onAccent} /> {T("Plan a trip")}
        </button>

        {/* Secondary — share a post or open a TripPod (the community side). */}
        <button
          onClick={() => setCreateOpen(true)}
          style={{
            marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            padding: "11px", borderRadius: 12, border: `1.5px solid ${t.border}`, cursor: "pointer",
            background: t.card, color: t.text, fontSize: 13.5, fontWeight: 700,
          }}
        >
          <Icon name="Plus" size={17} color={t.accent} /> {T("Create")}
        </button>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 2, paddingTop: 12 }}>
          {UTILITY_ITEMS.map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goSub(item.id)}
                aria-current={isActive ? "page" : undefined}
                style={{
                  display: "flex", alignItems: "center", gap: 12, width: "100%",
                  padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: isActive ? t.accent + "16" : "transparent",
                  color: isActive ? t.accent : t.muted,
                  fontSize: 13, fontWeight: isActive ? 700 : 500, textAlign: "left",
                }}
              >
                <Icon name={item.icon} size={17} color={isActive ? t.accent : t.muted} stroke={1.8} />
                {T(item.label)}
              </button>
            );
          })}
          <div style={{ fontSize: 11, color: t.muted, padding: "10px 12px 2px" }}>Powered by Travellers</div>
        </div>
      </aside>

      {/* Main column */}
      <div style={{ display: "flex", flexDirection: "column", minWidth: 0, height: "100dvh", minHeight: 0 }}>
        <div className="md:hidden">
          <SideDrawer />
        </div>

        <div style={{ ...headerStyle(t), flexShrink: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {isOverlay ? (
                <button
                  onClick={back}
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
                  onClick={() => setDrawerOpen(true)}
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
                style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 20, color: t.heading }}
              >
                {T(currentTitle)}
              </span>
            </div>
            {headerControls}
          </div>
        </div>

        <div id="tripova-scroll" ref={mainScrollRef} style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "hidden" }}>
          <main
            id="main-content"
            tabIndex={-1}
            className="md:max-w-[1080px] md:mx-auto"
            style={{ paddingTop: active === "dest" ? 0 : 4, minHeight: "100%", outline: "none" }}
          >
            <h1 className="sr-only">{T(currentTitle)}</h1>
            <ErrorBoundary t={t}>{children}</ErrorBoundary>
          </main>
        </div>

        {/* Bottom nav (mobile) */}
        <nav
          aria-label="Primary"
          className="flex md:hidden"
          style={{
            flexShrink: 0, background: t.card + "F2",
            backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)",
            borderTop: `1px solid ${t.border}`,
            padding: "6px 0 calc(10px + env(safe-area-inset-bottom))", justifyContent: "space-around", zIndex: 60,
          }}
        >
          {NAV_ITEMS.map(item => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTab(item.id)}
                aria-current={isActive ? "page" : undefined}
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
                  <Icon name={item.icon} size={20} color={isActive ? t.accent : t.muted} stroke={isActive ? 2.4 : 1.8} />
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
        </nav>

        {(active === "home" || active === "pods") && (
          <div
            className="md:hidden"
            style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", height: 0, pointerEvents: "none", zIndex: 65 }}
          >
            <button
              onClick={() => setCreateOpen(true)}
              aria-label="Create"
              style={{
                position: "absolute", right: 20, bottom: 90, width: 52, height: 52, borderRadius: "50%",
                background: `linear-gradient(135deg,${t.accent},${t.secondary})`,
                border: `2px solid ${t.card}`, cursor: "pointer",
                boxShadow: `0 4px 16px ${t.accent}50`,
                display: "flex", alignItems: "center", justifyContent: "center",
                pointerEvents: "auto", transition: "transform 0.15s, box-shadow 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "scale(1.05)"; e.currentTarget.style.boxShadow = `0 6px 24px ${t.accent}60`; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.boxShadow = `0 4px 16px ${t.accent}50`; }}
            >
              <Icon name="Plus" size={22} color={t.onAccent} />
            </button>
          </div>
        )}
      </div>

      {/* Desktop right rail (≥ xl) — promotes the one planning flow and its steps, plus a
          couple of utilities. It no longer mirrors the left nav (that was the duplicate
          CTA noise); every entry here goes somewhere the left sidebar doesn't. */}
      <aside
        className="hidden xl:flex"
        style={{
          flexDirection: "column", gap: 16, width: 300, height: "100dvh",
          position: "sticky", top: 0, overflowY: "auto",
          borderLeft: `1px solid ${t.border}`, padding: "22px 18px",
        }}
      >
        <div style={{
          background: `linear-gradient(150deg,${t.accent}14,${t.secondary}08)`,
          border: `1px solid ${t.accent}26`, borderRadius: 18, padding: 18,
        }}>
          <div style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 19, color: t.heading, marginBottom: 4 }}>
            {T("Plan your trip")}
          </div>
          <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.5, marginBottom: 14 }}>
            {T("Itinerary, route and budget — one guided flow.")}
          </div>
          <button
            onClick={() => goSub("plan")}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%",
              padding: "11px", borderRadius: 11, border: "none", cursor: "pointer",
              background: t.accent, color: t.onAccent, fontSize: 13.5, fontWeight: 800,
            }}
          >
            <Icon name="Compass" size={16} color={t.onAccent} /> {T("Start planning")}
          </button>
        </div>

        {/* The three steps, as deep-link shortcuts into the hub (jump straight to budget, etc.) */}
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <div style={{ padding: "0 12px 6px", fontSize: 10.5, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: t.muted }}>
            {T("Planning steps")}
          </div>
          {PLAN_STEPS.map(item => (
            <button
              key={item.step}
              onClick={() => router.push(`/plan?step=${item.step}`)}
              style={{
                display: "flex", alignItems: "center", gap: 12, width: "100%",
                padding: "10px 12px", borderRadius: 12, border: `1px solid ${t.border}`,
                cursor: "pointer", marginBottom: 2, background: t.card,
                color: t.text, fontSize: 13.5, fontWeight: 600, textAlign: "left",
                transition: "border-color 0.15s, background 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = t.accent + "55"; e.currentTarget.style.background = t.accent + "08"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = t.border; e.currentTarget.style.background = t.card; }}
            >
              <span style={{ width: 30, height: 30, borderRadius: 8, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name={item.icon} size={16} color={t.secondary} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 700 }}>{T(item.label)}</span>
                <span style={{ display: "block", fontSize: 11.5, color: t.muted, marginTop: 1 }}>{T(item.sub)}</span>
              </span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: "auto", fontSize: 11, color: t.muted, lineHeight: 1.6 }}>
          <div style={{ fontWeight: 700, color: t.text, marginBottom: 2 }}>Tripsova</div>
          Powered by Travellers — verified, time-sensitive, community-first.
        </div>
      </aside>

      <CreateSheet open={createOpen} onClose={() => setCreateOpen(false)} t={t} onCreatePost={addCreatedPost} onCreatePod={addCreatedPod} />
      <NotificationsSheet open={notifOpen} onClose={() => setNotifOpen(false)} t={t} />
      <EmergencySheet open={emergencyOpen} onClose={() => setEmergencyOpen(false)} t={t} />
    </div>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProvider>
      <AppChrome>{children}</AppChrome>
    </AppProvider>
  );
}

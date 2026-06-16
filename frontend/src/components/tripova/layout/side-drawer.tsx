"use client";

import React, { useEffect } from "react";
import type { Theme } from "@/data";
import { Icon } from "../icon";
import { useApp } from "../app-provider";
import { useAuth } from "../auth/auth-context";
import { useDestinations } from "@/lib/destinations";

const Eyebrow = ({ children, t }: { children: React.ReactNode; t: Theme }) => (
  <div style={{ fontSize: 10, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", padding: "4px 12px", marginTop: 6 }}>{children}</div>
);

function getInitials(name?: string): string {
  if (!name) return "TR";
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

export function SideDrawer() {
  const { t, dark, setDark, tab, setTab, sub, setSub, drawerOpen, setDrawerOpen, dest, setDest, T } = useApp();
  const { user } = useAuth();
  const { destinations } = useDestinations(10);

  const primary = [
    { id: "home", icon: "House", label: "Home" },
    { id: "discover", icon: "Activity", label: "Trip Pulse" },
    { id: "purefind", icon: "Salad", label: "PureFind" },
    { id: "pods", icon: "Users", label: "TripPods" },
    { id: "profile", icon: "User", label: "Profile" },
  ];
  const manage = [
    { id: "journey", icon: "Navigation", label: "Plan My Journey" },
    { id: "plan", icon: "Sparkles", label: "AI Trip Builder" },
    { id: "route", icon: "Route", label: "Route Planner" },
    { id: "budget", icon: "Wallet", label: "Budget Tracker" },
    { id: "maps", icon: "MapPinned", label: "Offline Maps" },
  ];
  const saved = (destinations ?? []).slice(0, 3);

  const active = dest ? "dest" : (sub || tab);
  useEffect(() => {
    setDrawerOpen(false);
  }, [active, setDrawerOpen]);
  const scrollToTop = () => {
    requestAnimationFrame(() => {
      document.getElementById("tripova-scroll")?.scrollTo({ top: 0, behavior: "smooth" });
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  };

  const Row = ({ icon, label, on, sel }: { icon: string; label: string; on: () => void; sel: boolean }) => (
    <button
      onClick={on}
      style={{
        display: "flex", alignItems: "center", gap: 13, width: "100%",
        padding: "11px 12px", borderRadius: 11, border: "none",
        background: sel ? t.accent + "14" : "transparent",
        color: sel ? t.accent : t.text, cursor: "pointer",
        fontSize: 14.5, fontWeight: sel ? 700 : 500,
        textAlign: "left", transition: "background 0.15s",
      }}
    >
      <Icon name={icon} size={19} color={sel ? t.accent : t.muted} stroke={sel ? 2.3 : 2} /> {T(label)}
    </button>
  );

  if (!drawerOpen) return null;

  return (
    <div style={{ position: "fixed", top: 0, bottom: 0, left: 0, width: "100%", zIndex: 200, pointerEvents: "auto" }}>
      <div onClick={() => setDrawerOpen(false)} style={{ position: "absolute", inset: 0, background: "rgba(13,19,32,0.5)", backdropFilter: "blur(2px)", opacity: 1, transition: "opacity 0.28s" }} />
      <div style={{
        position: "absolute", top: 0, left: 0, bottom: 0, width: 300, maxWidth: "82%",
        background: t.bg, borderRight: `1px solid ${t.border}`,
        boxShadow: "8px 0 40px rgba(13,19,32,0.28)",
        transform: "translateX(0)",
        transition: "transform 0.32s cubic-bezier(0.4,0,0.2,1)",
        display: "flex", flexDirection: "column", overflowY: "auto",
      }}>
        <div style={{ padding: "22px 18px 18px", background: `linear-gradient(135deg,${t.accent},${t.secondary})`, position: "relative" }}>
          <button onClick={() => setDrawerOpen(false)} aria-label="Close menu" style={{ position: "absolute", top: 14, right: 14, width: 44, height: 44, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.18)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="X" size={17} color="#fff" />
          </button>
          <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(255,255,255,0.92)", display: "flex", alignItems: "center", justifyContent: "center", color: t.accent, fontSize: 19, fontWeight: 800, marginBottom: 11 }}>{getInitials(user?.name)}</div>
          <div style={{ fontSize: 20, color: "#fff" }}>{user?.name || "Traveller"}</div>
          {user?.email && <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", marginBottom: 11 }}>{user.email}</div>}
          {user && (
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.92)", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 800, color: t.accent }}>
                <Icon name="ShieldCheck" size={12} color={t.success} /> TrustScore {user.trust_score}
              </span>
              {user.verification_status === "verified" && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(255,255,255,0.2)", borderRadius: 6, padding: "3px 9px", fontSize: 11, fontWeight: 700, color: "#fff" }}>
                  <Icon name="BadgeCheck" size={12} color="#fff" /> Verified
                </span>
              )}
            </div>
          )}
        </div>

        <div style={{ padding: "10px 8px 6px", flex: 1 }}>
          {primary.map(p => (
            <Row key={p.id} icon={p.icon} label={p.label} sel={active === p.id} on={() => { setTab(p.id); setDrawerOpen(false); scrollToTop(); }} />
          ))}
          <div style={{ height: 1, background: t.border, margin: "8px 12px" }} />
          <Eyebrow t={t}>Travel Management</Eyebrow>
          {manage.map(m => (
            <Row key={m.id} icon={m.icon} label={m.label} sel={active === m.id} on={() => { setSub(m.id); setDrawerOpen(false); scrollToTop(); }} />
          ))}
          {saved.length > 0 && <div style={{ height: 1, background: t.border, margin: "8px 12px" }} />}
          {saved.length > 0 && <Eyebrow t={t}>Saved Destinations</Eyebrow>}
          {saved.map((d, i) => (
            <button key={d.id + "-" + i} onClick={() => { setDest(d.id); setDrawerOpen(false); scrollToTop(); }} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "9px 12px", borderRadius: 11, border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: d.gradient, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: t.text, fontWeight: 600 }}>{d.name}</div>
                <div style={{ fontSize: 11, color: t.muted }}>{d.country}</div>
              </div>
              <Icon name="ChevronRight" size={16} color={t.muted} />
            </button>
          ))}
        </div>

        <div style={{ padding: "10px 16px 18px", borderTop: `1px solid ${t.border}` }}>
          <button onClick={() => setDark(v => !v)} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 12px", borderRadius: 11, border: "none", background: "transparent", color: t.text, cursor: "pointer", fontSize: 14, fontWeight: 500 }}>
            <Icon name={dark ? "Sun" : "Moon"} size={18} color={t.muted} /> {dark ? "Light mode" : "Dark mode"}
          </button>
          <button onClick={() => { setSub("settings"); setDrawerOpen(false); scrollToTop(); }} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 12px", borderRadius: 11, border: "none", background: sub === "settings" ? t.accent + "14" : "transparent", color: sub === "settings" ? t.accent : t.text, cursor: "pointer", fontSize: 14, fontWeight: sub === "settings" ? 700 : 500 }}>
            <Icon name="Settings" size={18} color={sub === "settings" ? t.accent : t.muted} /> {T("Settings & Privacy")}
          </button>
          <button onClick={() => { setSub("support"); setDrawerOpen(false); scrollToTop(); }} style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 12px", borderRadius: 11, border: "none", background: sub === "support" ? t.accent + "14" : "transparent", color: sub === "support" ? t.accent : t.text, cursor: "pointer", fontSize: 14, fontWeight: sub === "support" ? 700 : 500 }}>
            <Icon name="LifeBuoy" size={18} color={sub === "support" ? t.accent : t.muted} /> {T("Help & Support")}
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect, startTransition } from "react";
import type { Theme } from "@/data";
import { LANGUAGES } from "@/data/feed";
import { Card, Btn } from "../primitives/index";
import { Icon } from "../icon";
import { TrustBadge, MultiSelectFood } from "../badges/index";
import { api, isAuthenticated, ApiError } from "@/lib/api";
import { useAuth } from "../auth/auth-context";
import type { UserResponse, TrustScoreResponse } from "@/lib/types";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function deriveHandle(name: string): string {
  return "@" + name.toLowerCase().replace(/\s+/g, ".");
}

interface TrustBar {
  label: string;
  score: number;
  max: number;
  color: string;
}

function parseTrustComponents(components: Record<string, unknown>, t: Theme): TrustBar[] {
  const palette = [t.success, t.accent, t.secondary, t.warning];
  const labels: Record<string, string> = {
    identity_verified: "Identity Verified",
    reviews_from_trips: "Reviews from Trips",
    response_rate: "Response Rate",
    community_standing: "Community Standing",
    verification: "Identity Verified",
    review_activity: "Reviews from Trips",
    responsiveness: "Response Rate",
    reputation: "Community Standing",
  };
  const bars: TrustBar[] = [];
  let i = 0;
  for (const [key, val] of Object.entries(components)) {
    if (val && typeof val === "object" && "score" in (val as Record<string, unknown>) && "max" in (val as Record<string, unknown>)) {
      const v = val as { score: number; max: number };
      bars.push({
        label: labels[key] || key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
        score: v.score,
        max: v.max,
        color: palette[i % palette.length],
      });
      i++;
    }
  }
  return bars;
}

export function ProfileScreen({ t, lang, setLang, go }: { t: Theme; lang: string; setLang: (l: string) => void; go: (id: string) => void }) {
  const { logout } = useAuth();
  const [myFoods, setMyFoods] = useState(["jain", "pure_veg"]);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!isAuthenticated()) {
      startTransition(() => {
        setLoading(false);
        setError("not_authenticated");
      });
      return;
    }
    startTransition(() => {
      setLoading(true);
      setError(null);
    });
    api.get<UserResponse>("/api/users/me")
      .then((data) => {
        startTransition(() => {
          setUser(data);
          if (data.diet_preference && typeof data.diet_preference === "object") {
            const extracted = Object.keys(data.diet_preference).filter((k) => data.diet_preference![k]);
            if (extracted.length > 0) setMyFoods(extracted);
          }
          setLoading(false);
        });
      })
      .catch((err) => {
        startTransition(() => {
          if (err instanceof ApiError && err.status === 401) {
            setError("not_authenticated");
          } else {
            setError(err?.detail || "Failed to load profile");
          }
          setLoading(false);
        });
      });
  }, [retryCount]);

  useEffect(() => {
    if (!user) return;
    api.get<TrustScoreResponse>(`/api/trust/user/${user.id}`)
      .then(setTrustScore)
      .catch(() => {});
  }, [user]);

  const displayName = user?.name || "Traveller";
  const displayHandle = user?.name ? deriveHandle(user.name) : "";
  const displayAvatar = user?.name ? getInitials(user.name) : "TR";
  const displayTrust = user?.trust_score ?? 0;
  const stats = [
    { label: "Trips", value: "—" },
    { label: "Countries", value: "—" },
    { label: "Pods", value: "—" },
    { label: "Reviews", value: "—" },
  ];
  const trustBars: TrustBar[] = trustScore?.components
    ? parseTrustComponents(trustScore.components as Record<string, unknown>, t)
    : [];
  const manage = [
    { id: "journey", icon: "Navigation", label: "Plan My Journey" },
    { id: "plan", icon: "Sparkles", label: "AI Trip Builder" },
    { id: "route", icon: "Route", label: "Route Planner" },
    { id: "guides", icon: "Map", label: "Local Guides" },
    { id: "family", icon: "Users", label: "Family Circle" },
    { id: "budget", icon: "Wallet", label: "Budget Tracker" },
    { id: "maps", icon: "MapPinned", label: "Offline Maps" },
  ];

  if (loading) {
    return (
      <div style={{ padding: "0 16px 110px" }}>
        <Card t={t} style={{ overflow: "hidden", padding: 0 }}>
          <div style={{ height: 78, background: t.border }} />
          <div style={{ padding: "0 16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, marginTop: -28 }}>
              <div style={{ width: 66, height: 66, borderRadius: "50%", background: t.border, flexShrink: 0 }} />
              <div style={{ width: 90, height: 30, borderRadius: 6, background: t.border }} />
            </div>
            <div style={{ width: "60%", height: 22, borderRadius: 4, background: t.border, marginBottom: 6 }} />
            <div style={{ width: "40%", height: 14, borderRadius: 4, background: t.border, marginBottom: 12 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} style={{ height: 52, borderRadius: 8, background: t.border }} />
              ))}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error === "not_authenticated") {
    return (
      <div style={{ padding: "0 16px 110px" }}>
        <Card t={t} style={{ textAlign: "center", padding: "40px 20px" }}>
          <Icon name="UserRound" size={40} color={t.muted} />
          <div style={{ fontSize: 18, fontWeight: 700, color: t.text, marginTop: 16, marginBottom: 8 }}>Sign in to view your profile</div>
          <div style={{ fontSize: 13, color: t.muted, marginBottom: 20, lineHeight: 1.5 }}>Log in or create an account to manage your trips, preferences, and TrustScore.</div>
          <Btn t={t}>Sign In</Btn>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "0 16px 110px" }}>
        <Card t={t} style={{ textAlign: "center", padding: "40px 20px" }}>
          <Icon name="AlertTriangle" size={40} color={t.warning} />
          <div style={{ fontSize: 16, fontWeight: 700, color: t.text, marginTop: 16, marginBottom: 8 }}>Could not load profile</div>
          <div style={{ fontSize: 13, color: t.muted, marginBottom: 20 }}>{error}</div>
          <Btn t={t} onClick={() => setRetryCount((c) => c + 1)}>Retry</Btn>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <Card t={t} style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ height: 78, background: `linear-gradient(135deg,${t.accent},${t.secondary})` }} />
        <div style={{ padding: "0 16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, marginTop: -28 }}>
            <div style={{ width: 66, height: 66, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},${t.secondary})`, border: `3px solid ${t.card}`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 700, flexShrink: 0 }}>{displayAvatar}</div>
            <Btn outline t={t} small>Edit Profile</Btn>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: t.text }}>{displayName}</div>
          <div style={{ fontSize: 12, color: t.muted, marginBottom: 12, fontStyle: "italic" }}>{displayHandle}</div>
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 16 }}>
            <TrustBadge score={displayTrust} t={t} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {stats.map(s => <div key={s.label} style={{ textAlign: "center", padding: "10px 0", background: t.bg, borderRadius: 8 }}><div style={{ fontSize: 20, fontWeight: 700, color: t.accent }}>{s.value}</div><div style={{ fontSize: 9, color: t.muted, textTransform: "uppercase", letterSpacing: 1.5 }}>{s.label}</div></div>)}
          </div>
        </div>
      </Card>

      <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", margin: "4px 2px 12px" }}>Travel Management</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {manage.map(m => (
          <button key={m.id} onClick={() => go && go(m.id)} style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: "14px 13px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: "0 1px 3px rgba(13,19,32,0.04)", textAlign: "left" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={m.icon} size={18} color={t.accent} /></div>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{m.label}</span>
          </button>
        ))}
      </div>

      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>🌿 My Food Preferences</div>
        <MultiSelectFood selected={myFoods} onChange={setMyFoods} t={t} hint="Auto-applied in PureFind and Trip Builder" />
      </Card>

      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 14 }}>✦ TrustScore Breakdown</div>
        {trustBars.length === 0 ? (
          <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.5 }}>No TrustScore activity yet. Complete trips and verifications to build your score.</div>
        ) : trustBars.map(item => (
          <div key={item.label} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 13, color: t.text }}>{item.label}</span>
              <span style={{ fontSize: 11, color: t.muted }}>{item.score}/{item.max}</span>
            </div>
            <div style={{ height: 5, background: t.border, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(item.score / item.max) * 100}%`, background: item.color, borderRadius: 3 }} />
            </div>
          </div>
        ))}
      </Card>

      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>🌐 Language</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {LANGUAGES.map(l => <button key={l} onClick={() => setLang(l)} style={{ padding: "6px 14px", borderRadius: 6, border: `1.5px solid ${lang === l ? t.accent : t.border}`, background: lang === l ? t.accent + "12" : t.tag, color: lang === l ? t.accent : t.muted, fontSize: 13, fontWeight: lang === l ? 700 : 400, cursor: "pointer" }}>{l}</button>)}
        </div>
      </Card>

      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>🌍 Coming Soon — Global</div>
        {["Multi-currency & Stripe payments", "Nepal, Sri Lanka, Thailand, Dubai", "Kosher & Buddhist Veg expanded", "Offline maps v2 — Southeast Asia", "Arabic, Swahili, Thai localisation"].map(item => (
          <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 13, color: t.muted, fontStyle: "italic" }}>{item}</span>
            <button style={{ padding: "4px 12px", borderRadius: 5, border: `1px solid ${t.border}`, background: "transparent", color: t.muted, fontSize: 11, cursor: "pointer", flexShrink: 0, marginLeft: 8 }}>Notify Me</button>
          </div>
        ))}
      </Card>

      <button
        onClick={logout}
        style={{
          width: "100%", marginTop: 16, padding: "13px", borderRadius: 12,
          border: `1px solid ${t.danger}40`, background: t.danger + "10", color: t.danger,
          fontSize: 15, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
      >
        <Icon name="LogOut" size={17} color={t.danger} /> Log out
      </button>
    </div>
  );
}

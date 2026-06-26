"use client";

import React, { useState, useEffect, startTransition } from "react";
import type { Theme } from "@/data";
import { LANGUAGES } from "@/data/feed";
import { Card, Btn, InputF } from "../primitives/index";
import { Icon } from "../icon";
import { TrustBadge, MultiSelectFood } from "../badges/index";
import { api, isAuthenticated, ApiError } from "@/lib/api";
import { useAuth } from "../auth/auth-context";
import type { UserResponse, TrustScoreResponse, TripResponse, TripPodResponse, PaginatedList, JourneyListItem, TransportKey } from "@/lib/types";

// Compact mode glyphs for a journey's chosen transports (mirrors the journey screen).
const TRANSPORT_ICON: Record<TransportKey, string> = {
  CAR: "🚗", MOTORCYCLE: "🏍️", TRAIN: "🚆", BUS: "🚌",
  METRO: "🚇", BICYCLE: "🚲", WALK: "🚶", FLIGHT: "✈️",
};

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;

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

export function ProfileScreen({ t, lang, setLang, go, openJourney }: { t: Theme; lang: string; setLang: (l: string) => void; go: (id: string) => void; openJourney?: (seed: { origin: string; destination: string; openJourneyId?: string }) => void }) {
  const { logout, refreshUser } = useAuth();
  // Diet tags reflect only what the user has actually saved (populated from
  // /api/users/me below) — never pre-select fabricated preferences.
  const [myFoods, setMyFoods] = useState<string[]>([]);
  const [user, setUser] = useState<UserResponse | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScoreResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAvatarUrl, setEditAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [podCount, setPodCount] = useState<number | null>(null);
  // AI Trip Builder results (the `trips` table) — both counted and listed.
  const [trips, setTrips] = useState<TripResponse[] | null>(null);
  // Saved "Plan My Journey" results — counted as a stat and listed below so they're
  // reachable from the profile, not buried only inside the journey screen's history.
  const [journeys, setJourneys] = useState<JourneyListItem[] | null>(null);
  // Persisted-on-change status for the food preferences (they used to never save).
  const [foodSaveState, setFoodSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

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
            const extracted = Object.keys(data.diet_preference)
              .filter((k) => data.diet_preference![k])
              .map((k) => k.toLowerCase());
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

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([
      api.get<TripResponse[]>("/api/trips/my").catch(() => [] as TripResponse[]),
      api.get<PaginatedList<TripPodResponse>>("/api/trippods?page=1&per_page=100").catch(() => null),
      api.get<JourneyListItem[]>("/api/trips/journeys").catch(() => [] as JourneyListItem[]),
    ]).then(([tripList, pods, journeyList]) => {
      if (cancelled) return;
      setTrips(tripList);
      setPodCount((pods?.items || []).filter(pod => pod.creator_id === user.id).length);
      setJourneys(journeyList);
    });
    return () => { cancelled = true; };
  }, [user]);

  // Persist diet preferences the moment they change — previously this section only
  // updated local state, so a refresh lost the selection ("not being saved"). The
  // backend stores diet_preference as a {tag: true} map.
  const updateFoods = async (foods: string[]) => {
    setMyFoods(foods);
    setFoodSaveState("saving");
    try {
      await api.put<UserResponse>("/api/users/me", {
        diet_preference: Object.fromEntries(foods.map(f => [f, true])),
      });
      setFoodSaveState("saved");
    } catch {
      setFoodSaveState("error");
    }
  };

  const displayName = user?.name || "Traveller";
  const displayHandle = user?.name ? deriveHandle(user.name) : "";
  const displayAvatar = user?.name ? getInitials(user.name) : "TR";
  const displayTrust = user?.trust_score ?? 0;
  const stats = [
    { label: "Trips", value: trips === null ? "..." : String(trips.length) },
    { label: "Journeys", value: journeys === null ? "..." : String(journeys.length) },
    { label: "TripPods", value: podCount === null ? "..." : String(podCount) },
    { label: "Reviews", value: "—" },
  ];
  const trustBars: TrustBar[] = trustScore?.components
    ? parseTrustComponents(trustScore.components as Record<string, unknown>, t)
    : [];
  const manage = [
    { id: "journey", icon: "Navigation", label: "Plan My Journey" },
    { id: "plan", icon: "Sparkles", label: "AI Trip Builder" },
    { id: "route", icon: "Route", label: "Route Planner" },
    { id: "budget", icon: "Wallet", label: "Budget Tracker" },
    { id: "maps", icon: "MapPinned", label: "Offline Maps" },
  ];

  const openEdit = () => {
    setEditName(user?.name || "");
    setEditPhone(user?.phone || "");
    setEditAvatarUrl(user?.avatar_url || "");
    setSaveError(null);
    setEditing(true);
  };

  const saveProfile = async () => {
    const name = editName.trim();
    if (!name) {
      setSaveError("Name is required.");
      return;
    }

    setSaving(true);
    setSaveError(null);
    try {
      const updated = await api.put<UserResponse>("/api/users/me", {
        name,
        phone: editPhone.trim() || undefined,
        avatar_url: editAvatarUrl.trim() || undefined,
      });
      startTransition(() => {
        setUser(updated);
        setEditing(false);
      });
      await refreshUser();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "0 12px 16px" }}>
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
      <div style={{ padding: "0 12px 16px" }}>
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
      <div style={{ padding: "0 12px 16px" }}>
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
    <div style={{ padding: "0 12px 16px" }}>
      <Card t={t} style={{ overflow: "hidden", padding: 0 }}>
        <div style={{ height: 78, background: `linear-gradient(135deg,${t.accent},${t.secondary})` }} />
        <div style={{ padding: "0 16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 12, marginTop: -28 }}>
            <div style={{ width: 66, height: 66, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},${t.secondary})`, border: `3px solid ${t.card}`, display: "flex", alignItems: "center", justifyContent: "center", color: t.onAccent, fontSize: 20, fontWeight: 700, flexShrink: 0 }}>{displayAvatar}</div>
            <Btn outline t={t} small onClick={openEdit}>Edit Profile</Btn>
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

      {editing && (
        <Card t={t}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: t.text }}>Edit Profile</div>
            <button onClick={() => setEditing(false)} style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${t.border}`, background: t.tag, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name="X" size={14} color={t.muted} />
            </button>
          </div>
          <InputF label="Name" value={editName} onChange={e => setEditName(e.target.value)} t={t} />
          <InputF label="Phone" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="+91..." t={t} />
          <InputF label="Avatar URL" value={editAvatarUrl} onChange={e => setEditAvatarUrl(e.target.value)} placeholder="https://..." t={t} />
          {saveError && <div style={{ background: t.danger + "12", border: `1px solid ${t.danger}25`, borderRadius: 8, padding: "9px 12px", color: t.danger, fontSize: 12.5, marginBottom: 12 }}>{saveError}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Btn t={t} disabled={saving} onClick={saveProfile}>{saving ? "Saving..." : "Save Profile"}</Btn>
            <Btn t={t} outline disabled={saving} onClick={() => setEditing(false)}>Cancel</Btn>
          </div>
        </Card>
      )}

      <div style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase", margin: "4px 2px 12px" }}>Travel Management</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {manage.map(m => (
          <button key={m.id} onClick={() => go && go(m.id)} style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: "14px 13px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: "0 1px 3px rgba(13,19,32,0.04)", textAlign: "left" }}>
            <div style={{ width: 38, height: 38, borderRadius: 11, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name={m.icon} size={18} color={t.accent} /></div>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.text }}>{m.label}</span>
          </button>
        ))}
      </div>

      {journeys && journeys.length > 0 && (
        <Card t={t}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 700, color: t.text }}>
              <Icon name="Navigation" size={16} color={t.accent} /> My Journeys
            </div>
            <button onClick={() => go && go("journey")} style={{ background: "transparent", border: "none", color: t.accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Plan new →</button>
          </div>
          {journeys.slice(0, 5).map(j => {
            const modes = (j.chosenModes || []).map(m => TRANSPORT_ICON[m] || "").filter(Boolean).join(" ");
            const when = (() => { const d = new Date(j.createdAt); return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" }); })();
            return (
              <button
                key={j.id}
                onClick={() => openJourney?.({ origin: j.origin, destination: j.destination, openJourneyId: j.id })}
                disabled={!openJourney}
                style={{ width: "100%", display: "flex", alignItems: "center", gap: 11, padding: "11px 4px", borderBottom: `1px solid ${t.border}`, background: "transparent", border: "none", cursor: openJourney ? "pointer" : "default", textAlign: "left" }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {j.origin} → {j.destination}{j.roundTrip ? " ↩" : ""}
                  </div>
                  <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 7 }}>
                    {modes && <span>{modes}</span>}
                    <span>{j.peopleCount} {j.peopleCount === 1 ? "traveller" : "travellers"}</span>
                    {when && <span>· {when}</span>}
                  </div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {j.status === "ready" ? (
                    typeof j.total === "number" ? <span style={{ fontSize: 13, fontWeight: 800, color: t.accent }}>{inr(j.total)}</span> : null
                  ) : (
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: "3px 8px", borderRadius: 999, background: t.tag, color: t.muted }}>
                      {j.status === "pending" ? "Planning…" : "Failed"}
                    </span>
                  )}
                  <div style={{ marginTop: 3 }}><Icon name="ChevronRight" size={14} color={t.muted} /></div>
                </div>
              </button>
            );
          })}
        </Card>
      )}

      {trips && trips.length > 0 && (
        <Card t={t}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 700, color: t.text }}>
              <Icon name="Sparkles" size={16} color={t.accent} /> My Trips
            </div>
            <button onClick={() => go && go("plan")} style={{ background: "transparent", border: "none", color: t.accent, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>Build new →</button>
          </div>
          {trips.slice(0, 6).map(tr => {
            const when = (() => { const d = new Date(tr.created_at); return isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" }); })();
            return (
              <div key={tr.id} style={{ display: "flex", alignItems: "center", gap: 11, padding: "11px 4px", borderBottom: `1px solid ${t.border}` }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: t.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {tr.title || "Trip plan"}
                  </div>
                  <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    {tr.trip_type && <span>{tr.trip_type}</span>}
                    {tr.days != null && <span>· {tr.days} {tr.days === 1 ? "day" : "days"}</span>}
                    {when && <span>· {when}</span>}
                  </div>
                </div>
                {tr.budget != null && <span style={{ fontSize: 13, fontWeight: 800, color: t.accent, flexShrink: 0 }}>₹{Math.round(tr.budget).toLocaleString("en-IN")}</span>}
              </div>
            );
          })}
        </Card>
      )}

      <Card t={t}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: t.text }}>🌿 My Food Preferences</div>
          {foodSaveState === "saving" && <span style={{ fontSize: 11, color: t.muted }}>Saving…</span>}
          {foodSaveState === "saved" && <span style={{ fontSize: 11, color: t.success, fontWeight: 700 }}>✓ Saved</span>}
          {foodSaveState === "error" && <span style={{ fontSize: 11, color: t.danger, fontWeight: 700 }}>Couldn’t save</span>}
        </div>
        <MultiSelectFood selected={myFoods} onChange={updateFoods} t={t} hint="Auto-applied in PureFind and Trip Builder" />
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
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 14, fontWeight: 700, color: t.text, marginBottom: 12 }}>
          <Icon name="Globe2" size={16} color={t.secondary} /> Coming Soon — Global
        </div>
        {["Multi-currency & Stripe payments", "Nepal, Sri Lanka, Thailand, Dubai", "Kosher & Buddhist Veg expanded", "Offline maps v2 — Southeast Asia", "Arabic, Swahili, Thai localisation"].map(item => (
          <div key={item} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 13, color: t.text, lineHeight: 1.35 }}>{item}</span>
            <span style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${t.border}`, background: t.tag, color: t.muted, fontSize: 11, fontWeight: 700, flexShrink: 0 }}>Planned</span>
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

"use client";

import React, { useState, useEffect, startTransition } from "react";
import type { Theme, FeedPost } from "@/data";
import type { Destination } from "@/data/destinations";
import { getDest, FEED_POSTS, RESTAURANTS, PODS, GUIDES } from "@/data";
import type { DestinationResponse } from "@/lib/types";
import { api } from "@/lib/api";
import { Avatar } from "../primitives/avatar";
import { Icon } from "../icon";
import { TrustBadge, CommBadge, PoweredBy, CommunityVerified, CompatBadge } from "../badges/index";

function HubSection({ title, t, action, onAction, children }: { title: string; t: Theme; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</span>
        {action && <button onClick={onAction} style={{ background: "transparent", border: "none", color: t.secondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{action} ›</button>}
      </div>
      {children}
    </div>
  );
}

function PostCard({ post, t }: { post: FeedPost; t: Theme }) {
  const [helped, setHelped] = useState(false);
  return (
    <div style={{ background: t.card, borderRadius: 16, padding: 16, marginBottom: 12, border: `1px solid ${t.border}`, boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 11 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Avatar initials={post.avatar} size={38} t={t} />
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700, color: t.heading }}>{post.user}</span>
              {post.verified && <Icon name="BadgeCheck" size={14} color={t.secondary} />}
            </div>
            <div style={{ fontSize: 11.5, color: t.muted, display: "flex", alignItems: "center", gap: 4 }}><Icon name="MapPin" size={11} color={t.muted} /> {post.location} · {post.time}</div>
          </div>
        </div>
        <TrustBadge score={post.score} t={t} />
      </div>
      <p style={{ fontSize: 13.5, color: t.text, lineHeight: 1.6, margin: "0 0 13px" }}>{post.content}</p>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button onClick={() => setHelped(h => !h)} style={{ display: "flex", alignItems: "center", gap: 6, background: helped ? t.accent + "15" : t.tag, border: `1px solid ${helped ? t.accent : t.border}`, borderRadius: 6, padding: "6px 13px", cursor: "pointer", color: helped ? t.accent : t.muted, fontSize: 12, fontWeight: 600 }}>
          <Icon name="ThumbsUp" size={13} color={helped ? t.accent : t.muted} /> {post.helpful + (helped ? 1 : 0)} Helpful
        </button>
      </div>
    </div>
  );
}

const GRADIENT_POOL = [
  "linear-gradient(150deg,#1B3A47,#5E97A8)",
  "linear-gradient(150deg,#1E2740,#5A6B96)",
  "linear-gradient(150deg,#5A4F3E,#C2A878)",
  "linear-gradient(150deg,#243A33,#6E8C7E)",
  "linear-gradient(150deg,#6B5A38,#D4B483)",
  "linear-gradient(150deg,#2D3A4A,#7A8FA6)",
  "linear-gradient(150deg,#3D2C4A,#8A6FA6)",
  "linear-gradient(150deg,#2A4A3F,#7A9A86)",
];

function toUIDest(d: DestinationResponse): Destination {
  const h = (d.slug || d.id).length * 7 + d.name.length * 13;
  return {
    id: d.slug || d.id,
    name: d.name,
    country: d.country,
    gradient: GRADIENT_POOL[Math.abs(h) % GRADIENT_POOL.length],
    trust: 75 + Math.abs(h * 7) % 20,
    exploring: 5 + Math.abs(h * 13) % 80,
    updates: 20 + Math.abs(h * 17) % 200,
    guides: 2 + Math.abs(h * 11) % 18,
    save: false,
    follow: false,
    safety: d.safety_summary || "Safe",
    safetyLevel: "good" as const,
    tagline: d.description
      ? d.description.slice(0, 80) + (d.description.length > 80 ? "..." : "")
      : d.best_time_to_visit || "",
    badges: (d.tags || []).slice(0, 3),
  };
}

export function DestinationHub({ t, destId, openPods, openPureFind }: { t: Theme; destId: string; openPods?: () => void; openPureFind?: () => void }) {
  const fallback = getDest(destId);
  const [d, setD] = useState<Destination>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(fallback.save);
  const [following, setFollowing] = useState(fallback.follow);
  const [ai, setAi] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      setLoading(true);
      setError(null);
    });
    api.get<DestinationResponse>(`/api/destinations/${destId}`)
      .then(res => {
        if (!cancelled) startTransition(() => setD(toUIDest(res)));
      })
      .catch(() => {
        if (!cancelled) startTransition(() => setError("Could not load live destination data"));
      })
      .finally(() => {
        if (!cancelled) startTransition(() => setLoading(false));
      });
    return () => { cancelled = true; };
  }, [destId]);

  const posts = FEED_POSTS.filter(p => p.destId === d.id).slice(0, 3);
  const rests = RESTAURANTS.filter(r => r.destId === d.id).slice(0, 3);
  const pods = PODS.filter(p => p.destId === d.id).slice(0, 2);
  const guides = GUIDES.filter(g => g.destId === d.id).slice(0, 2);
  const safetyColor = d.safetyLevel === "good" ? t.success : t.warning;

  const aiQs = [`Is ${d.name} safe this week?`, `Best vegetarian food in ${d.name}?`, `5-day ${d.name} itinerary?`];
  const aiAns: Record<string, string> = {
    [aiQs[0]]: `Community reports rate ${d.name} as "${d.safety}". ${d.exploring} travellers are exploring right now.`,
    [aiQs[1]]: `Travellers most-verify ${rests[0]?.name || "local kitchens"} here. Open PureFind for the full list.`,
    [aiQs[2]]: `A relaxed 5-day plan blends highlights with hidden gems. Open Plan to generate a day-by-day itinerary.`,
  };

  const loadingBar = loading ? (
    <div style={{ height: 3, background: `linear-gradient(90deg,${t.accent},${t.secondary})`, animation: "none", transition: "opacity 0.3s" }} />
  ) : null;

  const errorBar = error ? (
    <div style={{ background: t.card, borderRadius: 12, margin: "12px 16px 0", padding: "10px 14px", border: `1px solid ${t.warning}40`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: 12, color: t.muted }}>{error}</span>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: t.warning, flexShrink: 0 }} />
    </div>
  ) : null;

  return (
    <div style={{ padding: "0 0 110px" }}>
      {loadingBar}
      {errorBar}
      <div style={{ height: 280, background: d.gradient, position: "relative" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(transparent 35%,rgba(0,0,0,0.82))" }} />
        <div style={{ position: "absolute", top: 14, right: 16, display: "flex", gap: 8 }}>
          <button onClick={() => setSaved(s => !s)} style={{ width: 38, height: 38, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.92)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name={saved ? "Bookmark" : "Bookmark"} size={17} color={saved ? "#B58F4F" : "#1B263B"} stroke={saved ? 2.6 : 2} />
          </button>
        </div>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "0 16px 18px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "rgba(255,255,255,0.94)", borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 800, color: "#1B263B" }}>
              <Icon name="ShieldCheck" size={13} color="#3E7D5A" /> TrustScore {d.trust}
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: safetyColor, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
              <Icon name="ShieldAlert" size={12} color="#fff" /> {d.safety}
            </span>
          </div>
          <div style={{ color: "#fff", fontSize: 38, lineHeight: 1 }}>{d.name}</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13.5, marginTop: 4 }}>{d.country} · {d.tagline}</div>
          <div style={{ display: "flex", gap: 9, marginTop: 14 }}>
            <button onClick={() => setFollowing(f => !f)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", background: following ? "rgba(255,255,255,0.92)" : "#fff", color: "#1B263B", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name={following ? "Check" : "Plus"} size={16} color="#1B263B" /> {following ? "Following" : "Follow"}
            </button>
            <button onClick={() => setSaved(s => !s)} style={{ flex: 1, padding: "11px", borderRadius: 10, border: "1.5px solid rgba(255,255,255,0.7)", background: "transparent", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
              <Icon name="Bookmark" size={16} color="#fff" /> {saved ? "Saved" : "Save"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ padding: "18px 16px 0" }}>
        <div style={{ display: "flex", background: t.card, borderRadius: 16, border: `1px solid ${t.border}`, padding: "14px 0", marginBottom: 18, boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
          {[["Users", d.exploring, "exploring"], ["Activity", d.updates, "this week"], ["Compass", d.guides, "guides"]].map(([ic, n, l], i) => (
            <div key={l} style={{ flex: 1, textAlign: "center", borderRight: i < 2 ? `1px solid ${t.border}` : "none" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}><Icon name={ic as string} size={15} color={t.secondary} /><span style={{ fontSize: 20, color: t.heading }}>{n as number}</span></div>
              <div style={{ fontSize: 10.5, color: t.muted, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 }}>{l as string}</div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
          {d.badges.map((b: string) => <CommBadge key={b} label={b} t={t} />)}
        </div>
        <PoweredBy t={t} style={{ marginBottom: 22 }} />

        <HubSection title={`Ask about ${d.name}`} t={t}>
          <div style={{ background: `linear-gradient(135deg,${t.accent}12,${t.secondary}08)`, borderRadius: 16, border: `1px solid ${t.accent}20`, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: t.accent, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon name="Sparkles" size={16} color={t.goldFill} /></div>
              <div style={{ fontSize: 14 }}>Tripova AI · trained on traveller posts</div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {aiQs.map(q => <button key={q} onClick={() => setAi(q)} style={{ padding: "7px 13px", borderRadius: 20, border: `1px solid ${ai === q ? t.accent : t.border}`, background: ai === q ? t.accent + "15" : t.card, color: ai === q ? t.accent : t.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all 0.18s" }}>{q}</button>)}
            </div>
            {ai && <div style={{ marginTop: 12, background: t.card, borderRadius: 12, padding: "12px 14px", border: `1px solid ${t.border}`, fontSize: 13.5, color: t.text, lineHeight: 1.6 }}>{aiAns[ai]}</div>}
          </div>
        </HubSection>

        <HubSection title="Live Traveller Feed" t={t} action="See all">
          {posts.map((p, i) => <PostCard key={p.id + "-" + i} post={p} t={t} />)}
        </HubSection>

        <HubSection title="PureFind · Verified Eats" t={t} action="Open PureFind" onAction={openPureFind}>
          {rests.map((r, i) => (
            <div key={r.id + "-" + i} onClick={openPureFind} style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: 12, marginBottom: 10, display: "flex", gap: 12, cursor: "pointer", boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ width: 54, height: 54, borderRadius: 12, background: r.gradient, flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ fontSize: 14.5, color: t.heading }}>{r.name}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: t.warning, display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}><Icon name="Star" size={11} color={t.warning} /> {r.rating}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                  {Object.entries(r.verifiedBy).slice(0, 2).map(([fid, c]) => <CommunityVerified key={fid} foodId={fid} count={c as number} t={t} />)}
                </div>
              </div>
            </div>
          ))}
        </HubSection>

        <HubSection title="TripPods Here" t={t} action="See all" onAction={openPods}>
          {pods.map((p, i) => (
            <div key={p.id + "-" + i} onClick={openPods} style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: 14, marginBottom: 10, cursor: "pointer", boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 15, color: t.heading }}>{p.destination}</div>
                  <div style={{ fontSize: 12, color: t.muted }}>{p.dates} · {p.budget}/person</div>
                </div>
                <CompatBadge pct={p.compatibility} t={t} />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Avatar initials={p.hostAvatar} size={26} t={t} />
                <span style={{ fontSize: 12.5, color: t.text, fontWeight: 600 }}>{p.host}</span>
                <TrustBadge score={p.score} t={t} />
                <span style={{ marginLeft: "auto", fontSize: 11.5, color: p.spots <= 1 ? t.danger : t.success, fontWeight: 700 }}>{p.spots} spot{p.spots > 1 ? "s" : ""} left</span>
              </div>
            </div>
          ))}
        </HubSection>

        <HubSection title="Trusted Local Guides" t={t}>
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, scrollbarWidth: "none" }}>
            {guides.map((g, i) => (
              <div key={g.id + "-" + i} style={{ flexShrink: 0, width: 170, background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, overflow: "hidden", boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
                <div style={{ height: 74, background: g.gradient }} />
                <div style={{ padding: 12 }}>
                  <div style={{ fontSize: 14.5, color: t.heading }}>{g.name}</div>
                  <div style={{ fontSize: 11.5, color: t.muted, marginBottom: 8 }}>{g.speciality}</div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <TrustBadge score={g.score} t={t} />
                    <span style={{ fontSize: 12.5, fontWeight: 700, color: t.accent }}>{g.price}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </HubSection>
      </div>
    </div>
  );
}

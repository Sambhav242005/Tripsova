"use client";

import React, { useState, useEffect, startTransition } from "react";
import type { Theme, FeedPost } from "@/data";
import type { Destination } from "@/data/destinations";
import type { DestinationResponse, FeedPostResponse, FoodPlaceResponse, PaginatedList } from "@/lib/types";
import { api } from "@/lib/api";
import { Avatar } from "../primitives/avatar";
import { Icon } from "../icon";
import { TrustBadge, CommBadge, PoweredBy, CommunityVerified } from "../badges/index";

function HubSection({ title, t, action, onAction, children }: { title: string; t: Theme; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 13 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>{title}</span>
        {action && onAction && <button onClick={onAction} style={{ background: "transparent", border: "none", color: t.secondary, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>{action} ›</button>}
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

// Neutral placeholder shown while the real destination loads — no fabricated data.
function emptyDest(destId: string): Destination {
  return {
    id: destId,
    name: destId.split("-").map(w => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" "),
    country: "",
    gradient: GRADIENT_POOL[0],
    trust: 0,
    exploring: 0,
    updates: 0,
    guides: 0,
    save: false,
    follow: false,
    safety: "",
    safetyLevel: "good" as const,
    tagline: "",
    badges: [],
  };
}

function toUIDest(d: DestinationResponse): Destination {
  const h = (d.slug || d.id).length * 7 + d.name.length * 13;
  return {
    id: d.slug || d.id,
    name: d.name,
    country: d.country,
    gradient: GRADIENT_POOL[Math.abs(h) % GRADIENT_POOL.length],
    trust: 0,
    exploring: 0,
    updates: 0,
    guides: 0,
    save: false,
    follow: false,
    safety: d.safety_summary || "",
    safetyLevel: "good" as const,
    tagline: d.description
      ? d.description.slice(0, 80) + (d.description.length > 80 ? "..." : "")
      : d.best_time_to_visit || "",
    badges: (d.tags || []).slice(0, 3),
  };
}

function transformPost(p: FeedPostResponse): FeedPost {
  const created = new Date(p.created_at + "Z");
  const diffMs = Date.now() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const time = diffMins < 1 ? "just now" : diffHrs < 1 ? `${diffMins}m ago` : diffDays < 1 ? `${diffHrs}h ago` : `${diffDays}d ago`;
  // API returns verification_score on a 0–1 scale; present it as a 0–100 TrustScore.
  const score = p.verification_score <= 1 ? Math.round(p.verification_score * 100) : Math.round(p.verification_score);
  return {
    id: Number(p.id) || 0,
    user: p.user_name || "Traveller",
    avatar: p.user_avatar || "TR",
    score,
    destId: p.destination_id || "",
    location: p.destination_name || "",
    category: "General",
    time,
    expiry: null,
    content: p.content,
    helpful: p.helpful_count,
    comments: 0,
    verified: score >= 60,
    _apiId: p.id,
  };
}

interface RestUI { id: string; name: string; rating: number; verifiedBy: Record<string, number>; gradient: string; }

function transformFood(p: FoodPlaceResponse, idx: number): RestUI {
  const dietTags = p.diet_tags || [];
  const verifiedBy: Record<string, number> = {};
  if (p.verified_count > 0) {
    if (dietTags.length > 0) {
      const per = Math.max(1, Math.round(p.verified_count / dietTags.length));
      for (const tag of dietTags) verifiedBy[tag] = per;
    } else {
      verifiedBy.community = p.verified_count;
    }
  }
  return {
    id: p.id,
    name: p.name,
    rating: Math.round(p.food_score * 10) / 10,
    verifiedBy,
    gradient: GRADIENT_POOL[idx % GRADIENT_POOL.length],
  };
}

export function DestinationHub({ t, destId, openPureFind }: { t: Theme; destId: string; openPods?: () => void; openPureFind?: () => void }) {
  const [d, setD] = useState<Destination>(() => emptyDest(destId));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [rests, setRests] = useState<RestUI[]>([]);
  const [restsLoading, setRestsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    startTransition(() => {
      setLoading(true);
      setError(null);
      setD(emptyDest(destId));
      setPosts([]);
      setRests([]);
      setPostsLoading(true);
      setRestsLoading(true);
    });
    api.get<DestinationResponse>(`/api/destinations/${destId}`)
      .then(res => {
        if (cancelled) return;
        startTransition(() => setD(toUIDest(res)));
        api.get<PaginatedList<FeedPostResponse>>(`/api/feed?destination_id=${res.id}&per_page=3`)
          .then(feed => { if (!cancelled) startTransition(() => { setPosts(feed.items.map(transformPost)); setPostsLoading(false); }); })
          .catch(() => { if (!cancelled) startTransition(() => setPostsLoading(false)); });
        api.get<FoodPlaceResponse[]>(`/api/food?destination_id=${res.id}`)
          .then(food => { if (!cancelled) startTransition(() => { setRests(food.slice(0, 3).map(transformFood)); setRestsLoading(false); }); })
          .catch(() => { if (!cancelled) startTransition(() => setRestsLoading(false)); });
      })
      .catch(() => {
        if (!cancelled) startTransition(() => { setError("Could not load destination data from the server."); setPostsLoading(false); setRestsLoading(false); });
      })
      .finally(() => {
        if (!cancelled) startTransition(() => setLoading(false));
      });
    return () => { cancelled = true; };
  }, [destId]);

  const safetyColor = d.safetyLevel === "good" ? t.success : t.warning;

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
    <div style={{ padding: "0 0 16px" }}>
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
          {d.safety && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: safetyColor, borderRadius: 8, padding: "4px 10px", fontSize: 12, fontWeight: 700, color: "#fff" }}>
                <Icon name="ShieldAlert" size={12} color="#fff" /> {d.safety}
              </span>
            </div>
          )}
          <div style={{ color: "#fff", fontSize: 38, lineHeight: 1 }}>{d.name}</div>
          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13.5, marginTop: 4 }}>{d.country}{d.country && d.tagline ? " · " : ""}{d.tagline}</div>
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
        {d.badges.length > 0 && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 8 }}>
            {d.badges.map((b: string) => <CommBadge key={b} label={b} t={t} />)}
          </div>
        )}
        <PoweredBy t={t} style={{ marginBottom: 22 }} />

        <HubSection title="Live Traveller Feed" t={t}>
          {postsLoading ? (
            <div style={{ height: 12, borderRadius: 6, background: t.tag, animation: "shimmer 1.5s ease-in-out infinite", backgroundImage: `linear-gradient(90deg,${t.tag},${t.bg2},${t.tag})`, backgroundSize: "200% 100%", marginBottom: 12 }} />
          ) : posts.length > 0 ? (
            posts.map((p, i) => <PostCard key={p._apiId ?? p.id + "-" + i} post={p} t={t} />)
          ) : (
            <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: "20px 16px", textAlign: "center", fontSize: 13, color: t.muted }}>
              {error ? "Server unavailable — connect later for live traveller updates." : "No traveller updates here yet."}
            </div>
          )}
        </HubSection>

        <HubSection title="PureFind · Verified Eats" t={t} action={rests.length > 0 ? "Open PureFind" : undefined} onAction={openPureFind}>
          {rests.length > 0 ? (
            rests.map((r, i) => (
              <div key={r.id + "-" + i} onClick={openPureFind} style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: 12, marginBottom: 10, display: "flex", gap: 12, cursor: "pointer", boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
                <div style={{ width: 54, height: 54, borderRadius: 12, background: r.gradient, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ fontSize: 14.5, color: t.heading }}>{r.name}</div>
                    {r.rating > 0 && <div style={{ fontSize: 12.5, fontWeight: 700, color: t.warning, display: "flex", alignItems: "center", gap: 3, flexShrink: 0 }}><Icon name="Star" size={11} color={t.warning} /> {r.rating}</div>}
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
                    {Object.entries(r.verifiedBy).slice(0, 2).map(([fid, c]) => <CommunityVerified key={fid} foodId={fid} count={c as number} t={t} />)}
                  </div>
                </div>
              </div>
            ))
          ) : restsLoading ? (
            <div style={{ height: 12, borderRadius: 6, background: t.tag, animation: "shimmer 1.5s ease-in-out infinite", backgroundImage: `linear-gradient(90deg,${t.tag},${t.bg2},${t.tag})`, backgroundSize: "200% 100%" }} />
          ) : (
            <div style={{ background: t.card, borderRadius: 14, border: `1px solid ${t.border}`, padding: "20px 16px", textAlign: "center", fontSize: 13, color: t.muted }}>
              {error ? "Server unavailable — connect later for verified food spots." : "No verified food spots here yet."}
            </div>
          )}
        </HubSection>
      </div>
    </div>
  );
}

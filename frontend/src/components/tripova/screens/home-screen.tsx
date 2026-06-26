"use client";

import React, { useState, useEffect, useCallback, startTransition } from "react";
import type { Theme, FeedPost, Destination } from "@/data";
import type { FeedPostResponse, FoodPlaceResponse, TripPodResponse, PaginatedList } from "@/lib/types";
import { CAT_COLORS } from "@/data";
import { Icon } from "../icon";
import { Avatar } from "../primitives/avatar";
import { TrustBadge, PoweredBy } from "../badges/index";
import { api } from "@/lib/api";
import { useDestinations } from "@/lib/destinations";

const PREVIEW_GRADIENTS = [
  "linear-gradient(150deg,#1E2740,#5A6B96)",
  "linear-gradient(150deg,#5A4F3E,#C2A878)",
  "linear-gradient(150deg,#1B3A47,#5E97A8)",
  "linear-gradient(150deg,#243A33,#6E8C7E)",
];

// ── Branded section header: serif title + gold eyebrow, optional "see all" ──
function SectionHeader({
  t, eyebrow, title, subtitle, action,
}: {
  t: Theme; eyebrow: string; title: string; subtitle?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
          <span style={{ width: 16, height: 2, borderRadius: 2, background: t.goldFill }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: t.gold }}>{eyebrow}</span>
        </div>
        <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 23, fontWeight: 400, color: t.heading, lineHeight: 1.1, margin: 0 }}>{title}</h2>
        {subtitle && <div style={{ fontSize: 12.5, color: t.muted, marginTop: 4, lineHeight: 1.4 }}>{subtitle}</div>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            flexShrink: 0, display: "flex", alignItems: "center", gap: 3,
            background: "transparent", border: "none", cursor: "pointer",
            color: t.accent, fontSize: 12.5, fontWeight: 700, padding: "4px 0",
          }}
        >
          {action.label} <Icon name="ChevronRight" size={15} color={t.accent} />
        </button>
      )}
    </div>
  );
}

function DestTile({ d, t, openDest, w = 150, h = 190 }: { d: Destination; t: Theme; openDest: (id: string) => void; w?: number; h?: number }) {
  return (
    <div
      onClick={() => openDest(d.id)}
      style={{
        flexShrink: 0, width: w, height: h, borderRadius: 20, background: d.gradient,
        position: "relative", cursor: "pointer", overflow: "hidden",
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        boxShadow: `0 2px 8px ${t.overlay}, 0 4px 20px ${t.overlay}`,
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "none"; }}
    >
      {d.trust > 0 && (
        <div style={{
          position: "absolute", top: 10, right: 10,
          background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
          borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 800,
          color: "#1F1D1A", display: "flex", alignItems: "center", gap: 3,
        }}>
          <Icon name="ShieldCheck" size={11} color="#4A8A5E" /> {d.trust}
        </div>
      )}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "28px 12px 12px",
        background: "linear-gradient(transparent,rgba(0,0,0,0.7))",
      }}>
        <div style={{ color: "#fff", fontSize: 17, fontWeight: 600, letterSpacing: 0.2 }}>{d.name}</div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
          {d.exploring > 0 ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6BBF7C", display: "inline-block" }} /> {d.exploring} exploring now
            </>
          ) : (
            d.country
          )}
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, t, openDest }: { post: FeedPost; t: Theme; openDest?: (id: string) => void }) {
  const [helped, setHelped] = useState(false);
  const catColor = CAT_COLORS[post.category] || t.secondary;
  const apiId = post._apiId;

  const handleHelpful = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (helped) return;
    setHelped(true);
    if (apiId) {
      try {
        await api.post(`/api/feed/${apiId}/helpful`);
      } catch {
        setHelped(false);
      }
    }
  };

  return (
    <div
      onClick={() => post.destId && openDest && openDest(post.destId)}
      style={{
        background: t.card, borderRadius: 18, padding: 16, marginBottom: 12,
        border: `1px solid ${t.border}`,
        boxShadow: `0 1px 3px ${t.overlay}, 0 4px 12px ${t.overlay}`,
        cursor: openDest ? "pointer" : "default",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
          <Avatar initials={post.avatar} size={40} t={t} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.heading }}>{post.user}</span>
              {post.verified && <Icon name="BadgeCheck" size={14} color={t.teal} />}
            </div>
            <div style={{ fontSize: 12, color: t.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              {post.location ? <><Icon name="MapPin" size={11} color={t.muted} /> {post.location} · </> : null}{post.time}
            </div>
          </div>
        </div>
        <span style={{ flexShrink: 0 }}><TrustBadge score={post.score} t={t} /></span>
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: catColor,
          background: catColor + "14", border: `1px solid ${catColor}25`,
          padding: "3px 11px", borderRadius: 8,
        }}>
          {post.category}
        </span>
        {post.expiry ? (
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, fontWeight: 600, color: t.muted,
          background: t.tag, padding: "3px 11px", borderRadius: 8,
        }}>
          <Icon name="Clock" size={11} color={t.muted} /> Expires in {post.expiry}
        </span>
        ) : null}
      </div>
      <p style={{ fontSize: 14, color: t.text, lineHeight: 1.65, margin: "0 0 14px" }}>{post.content}</p>
      <div style={{ height: 1, background: `linear-gradient(90deg,${t.border},transparent)`, margin: "0 0 12px" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={handleHelpful}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: helped ? t.accent + "12" : t.tag,
            border: `1px solid ${helped ? t.accent + "30" : t.border}`,
            borderRadius: 8, padding: "7px 14px",
            cursor: "pointer", color: helped ? t.accent : t.muted,
            fontSize: 12, fontWeight: 600,
            transition: "all 0.18s",
          }}
        >
          <Icon name="ThumbsUp" size={13} color={helped ? t.accent : t.muted} />
          {post.helpful + (helped ? 1 : 0)} Helpful
        </button>
        <button
          onClick={e => e.stopPropagation()}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "transparent", border: "none", color: t.muted,
            fontSize: 12, fontWeight: 600, cursor: "pointer",
          }}
        >
          <Icon name="MessageCircle" size={13} color={t.muted} />
          {post.comments != null ? post.comments + " " : ""}Reply
        </button>
      </div>
    </div>
  );
}

// ── TripPod preview card (compact) ──
function PodPreview({ pod, t, idx, onClick }: { pod: TripPodResponse; t: Theme; idx: number; onClick: () => void }) {
  const fmt = (d: string) => new Date(d).toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  const dates = pod.start_date && pod.end_date ? `${fmt(pod.start_date)}–${fmt(pod.end_date)}` : pod.start_date ? `${fmt(pod.start_date)} onwards` : "Flexible";
  const spots = Math.max(0, (pod.max_members || 5) - (pod.member_count || 0));
  return (
    <div
      onClick={onClick}
      style={{
        flexShrink: 0, width: 230, background: t.card, borderRadius: 18, overflow: "hidden",
        border: `1px solid ${t.border}`, cursor: "pointer", boxShadow: `0 1px 3px ${t.overlay}`,
      }}
    >
      <div style={{ height: 64, background: PREVIEW_GRADIENTS[idx % PREVIEW_GRADIENTS.length], position: "relative" }}>
        {pod.verification_required && (
          <span style={{ position: "absolute", top: 9, right: 9, display: "inline-flex", alignItems: "center", gap: 3, background: "rgba(255,255,255,0.92)", borderRadius: 6, padding: "3px 7px", fontSize: 10, fontWeight: 700, color: t.accent }}>
            <Icon name="BadgeCheck" size={10} color={t.secondary} /> Verified
          </span>
        )}
      </div>
      <div style={{ padding: 13 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{pod.title || "Untitled Pod"}</div>
        <div style={{ fontSize: 11.5, color: t.muted, marginTop: 3, display: "flex", alignItems: "center", gap: 4 }}>
          <Icon name="Calendar" size={11} color={t.muted} /> {dates}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 11 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: t.accent }}>{pod.budget ? `₹${pod.budget.toLocaleString("en-IN")}` : "₹—"}</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: spots <= 1 ? t.danger : t.success }}>{spots} spots left</span>
        </div>
      </div>
    </div>
  );
}

// ── PureFind preview row (compact) ──
function FoodPreview({ place, t, idx, onClick }: { place: FoodPlaceResponse; t: Theme; idx: number; onClick: () => void }) {
  const tags = (place.diet_tags || []).slice(0, 3);
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", gap: 12, alignItems: "center", background: t.card, borderRadius: 16,
        padding: 12, marginBottom: 10, border: `1px solid ${t.border}`, cursor: "pointer",
        boxShadow: `0 1px 3px ${t.overlay}`,
      }}
    >
      <div style={{ width: 54, height: 54, borderRadius: 12, background: PREVIEW_GRADIENTS[idx % PREVIEW_GRADIENTS.length], flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Icon name="Salad" size={22} color="rgba(255,255,255,0.92)" />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: t.heading, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{place.name}</div>
        {place.address && (
          <div style={{ fontSize: 11.5, color: t.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            <Icon name="MapPin" size={11} color={t.muted} /> {place.address}
          </div>
        )}
        {tags.length > 0 && (
          <div style={{ display: "flex", gap: 5, marginTop: 7, flexWrap: "wrap" }}>
            {tags.map(tag => <span key={tag} style={{ fontSize: 10.5, color: t.muted, background: t.tag, padding: "2px 8px", borderRadius: 6 }}>{tag}</span>)}
          </div>
        )}
      </div>
      <div style={{ textAlign: "right", flexShrink: 0 }}>
        {place.food_score > 0 && (
          <div style={{ fontSize: 13.5, fontWeight: 700, color: t.warning, display: "flex", alignItems: "center", gap: 3, justifyContent: "flex-end" }}>
            <Icon name="Star" size={12} color={t.warning} /> {Math.round(place.food_score * 10) / 10}
          </div>
        )}
        {place.verified_count > 0 && <div style={{ fontSize: 10.5, color: t.success, marginTop: 2 }}>{place.verified_count} verified</div>}
      </div>
    </div>
  );
}

function transformPost(p: FeedPostResponse) {
  const created = new Date(p.created_at + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const timeStr = diffMins < 1 ? 'just now' : diffHrs < 1 ? `${diffMins}m ago` : diffDays < 1 ? `${diffHrs}h ago` : `${diffDays}d ago`;

  let expiryStr: string | null = null;
  if (p.expires_at) {
    const expDate = new Date(p.expires_at + 'Z');
    const expDays = Math.floor((expDate.getTime() - now.getTime()) / 86400000);
    expiryStr = expDays > 0 ? `${expDays} days` : 'Expiring';
  }

  // The API returns verification_score on a 0–1 scale; present it as a 0–100 TrustScore.
  const score = p.verification_score <= 1 ? Math.round(p.verification_score * 100) : Math.round(p.verification_score);

  return {
    id: Number(p.id),
    user: p.user_name || 'Traveller',
    avatar: p.user_avatar || 'TR',
    score,
    destId: p.destination_id || '',
    location: p.destination_name || '',
    category: 'General',
    time: timeStr,
    expiry: expiryStr,
    content: p.content,
    helpful: p.helpful_count,
    comments: 0,
    verified: score >= 60,
    _apiId: p.id,
  };
}

export function HomeScreen({ t, openDest, openTab, openPlan, createdPosts = [] }: { t: Theme; openDest: (id: string) => void; openTab?: (id: string) => void; openPlan?: () => void; createdPosts?: FeedPostResponse[] }) {
  const [apiPosts, setApiPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pods, setPods] = useState<TripPodResponse[]>([]);
  const [foods, setFoods] = useState<FoodPlaceResponse[]>([]);
  const { destinations, loading: destLoading } = useDestinations(10);

  const fetchFeed = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get<PaginatedList<FeedPostResponse>>("/api/feed");
      setApiPosts(data.items.map(transformPost));
    } catch {
      setError("Couldn't load feed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    startTransition(() => { fetchFeed(); });
    // TripPod + PureFind previews — best-effort, fail silently into hidden sections
    api.get<PaginatedList<TripPodResponse>>("/api/trippods")
      .then(d => setPods(d.items.slice(0, 4)))
      .catch(() => setPods([]));
    api.get<FoodPlaceResponse[]>("/api/food")
      .then(d => setFoods(d.slice(0, 3)))
      .catch(() => setFoods([]));
  }, [fetchFeed]);

  const allCreated = createdPosts.map(transformPost);
  const feedItems: FeedPost[] = loading ? [] : [...allCreated, ...apiPosts];

  return (
    <div style={{ padding: "12px 12px 16px" }}>
      {/* ── Primary action — answers "what do I do first?" before the feed ── */}
      {openPlan && (
        <button
          onClick={openPlan}
          aria-label="Plan a trip"
          style={{
            position: "relative", overflow: "hidden", width: "100%", textAlign: "left",
            display: "flex", alignItems: "center", gap: 14, cursor: "pointer",
            border: `1px solid ${t.accent}33`, borderRadius: 22, padding: 18, marginBottom: 22,
            background: `linear-gradient(135deg,${t.accent},${t.secondary})`,
            boxShadow: `0 10px 30px ${t.accent}38`,
          }}
        >
          {/* dashed orbit + soft disc echo the logo's flight-path mark */}
          <span aria-hidden style={{ position: "absolute", right: -34, top: -34, width: 150, height: 150, borderRadius: "50%", border: "1.5px dashed rgba(255,255,255,0.22)" }} />
          <span aria-hidden style={{ position: "absolute", right: 22, bottom: -22, width: 96, height: 96, borderRadius: "50%", background: "rgba(255,255,255,0.08)" }} />
          <span style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="Compass" size={24} color={t.onAccent} />
          </span>
          <span style={{ flex: 1, minWidth: 0, position: "relative" }}>
            <span style={{ display: "block", fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 21, lineHeight: 1.15, color: t.onAccent }}>Where to next?</span>
            <span style={{ display: "block", fontSize: 12.5, color: t.onAccent, opacity: 0.88, marginTop: 3, lineHeight: 1.4 }}>Itinerary, route &amp; budget — planned in one place.</span>
          </span>
          <span style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 5, background: t.onAccent, color: t.accent, borderRadius: 11, padding: "9px 14px", fontSize: 13, fontWeight: 800, position: "relative" }}>
            Start <Icon name="ArrowRight" size={15} color={t.accent} />
          </span>
        </button>
      )}

      {/* ───────────────────────── 1 · CityFeed ───────────────────────── */}
      <SectionHeader t={t} eyebrow="Your city · Live" title="CityFeed" subtitle="Fresh, time-sensitive updates from travellers around you." />
      <div style={{ marginBottom: 14, display: "flex", justifyContent: "flex-end" }}>
        <PoweredBy t={t} />
      </div>

      {!loading && !error && feedItems.length > 0 && (
        <div style={{
          display: "flex", gap: 12, alignItems: "center",
          background: `linear-gradient(135deg,${t.accent}12,${t.secondary}0A)`,
          border: `1px solid ${t.accent}20`,
          borderRadius: 16,
          padding: "13px 14px",
          marginBottom: 12,
        }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: t.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="Radio" size={20} color={t.accent} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: t.heading }}>
              {`${feedItems.length} live traveller update${feedItems.length === 1 ? "" : "s"}`}
            </div>
            <div style={{ fontSize: 12.5, color: t.muted, lineHeight: 1.45, marginTop: 2 }}>
              Sorted by fresh, traveller-powered context.
            </div>
          </div>
          {openTab && (
            <button onClick={() => openTab("discover")} style={{ flexShrink: 0, border: `1px solid ${t.border}`, background: t.card, color: t.accent, borderRadius: 10, padding: "8px 10px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>
              Trip Pulse
            </button>
          )}
        </div>
      )}

      {error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          padding: "10px 14px", background: t.danger + "08",
          borderRadius: 12, border: `1px solid ${t.danger}20`,
        }}>
          <Icon name="AlertTriangle" size={14} color={t.danger} />
          <span style={{ fontSize: 12, color: t.muted, flex: 1 }}>{error}</span>
          <button
            onClick={fetchFeed}
            style={{
              fontSize: 12, fontWeight: 700, color: t.accent,
              background: "none", border: "none", cursor: "pointer",
              padding: "4px 10px", borderRadius: 6,
            }}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        [...Array(3)].map((_, i) => (
          <div key={i} style={{ background: t.card, borderRadius: 20, padding: 18, marginBottom: 14, border: `1px solid ${t.border}` }}>
            <div style={{ display: "flex", gap: 11, alignItems: "center", marginBottom: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: "50%", background: t.tag }} />
              <div>
                <div style={{ width: 90, height: 14, background: t.tag, borderRadius: 6, marginBottom: 5 }} />
                <div style={{ width: 130, height: 11, background: t.tag, borderRadius: 6 }} />
              </div>
            </div>
            <div style={{ width: "100%", height: 12, background: t.tag, borderRadius: 6, marginBottom: 7 }} />
            <div style={{ width: "80%", height: 12, background: t.tag, borderRadius: 6, marginBottom: 7 }} />
            <div style={{ width: "60%", height: 12, background: t.tag, borderRadius: 6 }} />
          </div>
        ))
      ) : !error && feedItems.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "30px 22px", maxWidth: 560, margin: "0 auto",
          background: t.card, borderRadius: 20, border: `1px solid ${t.border}`,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: t.tag, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 14px",
          }}>
            <Icon name="MessageCircle" size={28} color={t.muted} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 800, color: t.heading }}>No city posts yet</div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 6, lineHeight: 1.5 }}>CityFeed will fill with recent traveller updates. Until then, Trip Pulse still shows active destinations from live data.</div>
          {openTab && (
            <button onClick={() => openTab("discover")} style={{ marginTop: 16, padding: "10px 14px", borderRadius: 10, border: "none", background: t.accent, color: t.onAccent, fontSize: 13, fontWeight: 800, cursor: "pointer" }}>
              Open Trip Pulse
            </button>
          )}
        </div>
      ) : (
        feedItems.map(post => <PostCard key={post._apiId ?? post.id} post={post} t={t} openDest={openDest} />)
      )}

      {/* ───────────────────────── 2 · Trip Pulse ───────────────────────── */}
      {(destLoading || (destinations && destinations.length > 0)) && (
        <div style={{ marginTop: 30 }}>
          <SectionHeader t={t} eyebrow="Trending now" title="Trip Pulse" subtitle="Where the community is heading this week." />
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
            {destLoading
              ? [...Array(3)].map((_, i) => (
                  <div key={i} style={{ flexShrink: 0, width: 150, height: 190, borderRadius: 20, background: t.tag }} />
                ))
              : destinations!.slice(0, 6).map(d => <DestTile key={d.id} d={d} t={t} openDest={openDest} />)}
          </div>
        </div>
      )}

      {/* ───────────────────────── 3 · TripPod ───────────────────────── */}
      {pods.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <SectionHeader t={t} eyebrow="Travel together" title="TripPod" subtitle="Verified companions for your next trip." action={openTab ? { label: "See all", onClick: () => openTab("pods") } : undefined} />
          <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
            {pods.map((pod, i) => <PodPreview key={pod.id} pod={pod} t={t} idx={i} onClick={() => openTab && openTab("pods")} />)}
          </div>
        </div>
      )}

      {/* ───────────────────────── 4 · PureFind ───────────────────────── */}
      {foods.length > 0 && (
        <div style={{ marginTop: 30 }}>
          <SectionHeader t={t} eyebrow="Eat with confidence" title="PureFind" subtitle="Diet-aware places, verified by travellers." action={openTab ? { label: "Open PureFind", onClick: () => openTab("purefind") } : undefined} />
          {foods.map((place, i) => <FoodPreview key={place.id} place={place} t={t} idx={i} onClick={() => openTab && openTab("purefind")} />)}
        </div>
      )}
    </div>
  );
}

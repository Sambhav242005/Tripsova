"use client";

import React, { useState, useEffect, useCallback, startTransition } from "react";
import type { Theme, FeedPost, Destination } from "@/data";
import type { FeedPostResponse, PaginatedList } from "@/lib/types";
import { FEED_POSTS, STORIES, COMMUNITY_ACTIVITY, COMMUNITY_COUNTER, STORY_FEED, DESTINATIONS, CAT_COLORS } from "@/data";
import { Icon } from "../icon";
import { Avatar } from "../primitives/avatar";
import { SectionTitle } from "../primitives/index";
import { TrustBadge, PoweredBy } from "../badges/index";
import { api } from "@/lib/api";

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
      <div style={{
        position: "absolute", top: 10, right: 10,
        background: "rgba(255,255,255,0.9)", backdropFilter: "blur(4px)",
        borderRadius: 8, padding: "3px 9px", fontSize: 11, fontWeight: 800,
        color: "#1F1D1A", display: "flex", alignItems: "center", gap: 3,
      }}>
        <Icon name="ShieldCheck" size={11} color="#4A8A5E" /> {d.trust}
      </div>
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "28px 12px 12px",
        background: "linear-gradient(transparent,rgba(0,0,0,0.7))",
      }}>
        <div style={{ color: "#fff", fontSize: 17, fontWeight: 600, letterSpacing: 0.2 }}>{d.name}</div>
        <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#6BBF7C", display: "inline-block" }} /> {d.exploring} exploring now
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, t, openDest, idx = 0 }: { post: FeedPost; t: Theme; openDest?: (id: string) => void; idx?: number }) {
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
        background: t.card, borderRadius: 20, padding: 18, marginBottom: 14,
        border: `1px solid ${t.border}`,
        boxShadow: `0 1px 3px ${t.overlay}, 0 4px 12px ${t.overlay}`,
        cursor: openDest ? "pointer" : "default",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 11, alignItems: "center", minWidth: 0 }}>
          <Avatar initials={post.avatar} size={40} t={t} />
          <div style={{ minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: t.heading }}>{post.user}</span>
              {post.verified && <Icon name="BadgeCheck" size={14} color={t.teal} />}
            </div>
            <div style={{ fontSize: 12, color: t.muted, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
              <Icon name="MapPin" size={11} color={t.muted} /> {post.location} · {post.time}
            </div>
          </div>
        </div>
        <TrustBadge score={post.score} t={t} />
      </div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 11, fontWeight: 700, color: catColor,
          background: catColor + "14", border: `1px solid ${catColor}25`,
          padding: "3px 11px", borderRadius: 8,
        }}>
          {post.category}
        </span>
        <span style={{
          display: "inline-flex", alignItems: "center", gap: 4,
          fontSize: 11, fontWeight: 600, color: t.muted,
          background: t.tag, padding: "3px 11px", borderRadius: 8,
        }}>
          <Icon name="Clock" size={11} color={t.muted} /> Expires in {post.expiry}
        </span>
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

function transformPost(p: FeedPostResponse) {
  const created = new Date(p.created_at + 'Z');
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  const timeStr = diffMins < 1 ? 'just now' : diffHrs < 1 ? `${diffMins}m ago` : diffDays < 1 ? `${diffHrs}h ago` : `${diffDays}d ago`;

  let expiryStr = 'N/A';
  if (p.expires_at) {
    const expDate = new Date(p.expires_at + 'Z');
    const expDays = Math.floor((expDate.getTime() - now.getTime()) / 86400000);
    expiryStr = expDays > 0 ? `${expDays} days` : 'Expiring';
  }

  return {
    id: Number(p.id),
    user: p.user_name || 'Traveller',
    avatar: p.user_avatar || 'TR',
    score: p.verification_score,
    destId: p.destination_id || '',
    location: p.destination_id || 'Unknown',
    category: 'General',
    time: timeStr,
    expiry: expiryStr,
    content: p.content,
    helpful: p.helpful_count,
    comments: 0,
    verified: p.verification_score >= 60,
    _apiId: p.id,
  };
}

export function HomeScreen({ t, openDest, createdPosts = [] }: { t: Theme; openDest: (id: string) => void; createdPosts?: FeedPostResponse[] }) {
  const [apiPosts, setApiPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, [fetchFeed]);

  const allCreated = createdPosts.map(transformPost);

  let feedItems: FeedPost[];
  let showFallback = false;
  if (loading) {
    feedItems = [];
  } else if (error) {
    feedItems = [...allCreated, ...FEED_POSTS];
    showFallback = true;
  } else if (apiPosts.length === 0) {
    feedItems = allCreated.length > 0 ? allCreated : [];
  } else {
    feedItems = [...allCreated, ...apiPosts];
  }

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 8, marginBottom: 20, scrollbarWidth: "none" }}>
        {COMMUNITY_COUNTER.map((c, i) => (
          <div
            key={i}
            style={{
              flexShrink: 0, minWidth: 140,
              background: i === 0 ? `linear-gradient(135deg,${t.accent},${t.teal})` : t.card,
              border: i === 0 ? "none" : `1px solid ${t.border}`,
              borderRadius: 18, padding: "14px 16px",
              boxShadow: `0 1px 3px ${t.overlay}, 0 4px 12px ${t.overlay}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: i === 0 ? "rgba(255,255,255,0.15)" : t.tag,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Icon name={c.icon} size={14} color={i === 0 ? t.goldFill : t.secondary} />
              </div>
              {i === 0 && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#6BBF7C", display: "inline-block" }} />}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: i === 0 ? "#fff" : t.heading, lineHeight: 1, letterSpacing: -0.5 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: i === 0 ? "rgba(255,255,255,0.8)" : t.muted, marginTop: 4, lineHeight: 1.3 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 16, overflowX: "auto", paddingBottom: 8, marginBottom: 24, scrollbarWidth: "none" }}>
        {STORIES.map(s => (
          <button
            key={s.id}
            onClick={() => !s.own && s.destId && openDest(s.destId)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 6, flexShrink: 0, padding: 0,
            }}
          >
            <div style={{
              width: 64, height: 64, borderRadius: "50%", padding: s.own ? 0 : 3,
              background: s.own ? "transparent" : (s.seen ? t.border : `linear-gradient(135deg,${t.gold},${t.teal})`),
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: "100%", height: "100%", borderRadius: "50%",
                border: `2px solid ${t.bg}`, position: "relative",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Avatar initials={s.avatar} size={s.own ? 64 : 56} t={t} />
                {s.own && (
                  <div style={{
                    position: "absolute", bottom: -1, right: -1,
                    width: 22, height: 22, borderRadius: "50%",
                    background: t.accent, border: `2px solid ${t.bg}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Icon name="Plus" size={12} color="#fff" />
                  </div>
                )}
              </div>
            </div>
            <span style={{ fontSize: 11, color: t.text, fontWeight: 500, maxWidth: 64, overflow: "hidden", textOverflow: "ellipsis" }}>
              {s.own ? "Your story" : s.user}
            </span>
          </button>
        ))}
      </div>

      <SectionTitle t={t}>Community Activity</SectionTitle>
      <div style={{
        background: t.card, borderRadius: 20, border: `1px solid ${t.border}`,
        padding: "2px 16px", marginBottom: 24,
        boxShadow: `0 1px 3px ${t.overlay}`,
      }}>
        {COMMUNITY_ACTIVITY.map((a, i) => (
          <div
            key={a.id}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "12px 0",
              borderBottom: i < COMMUNITY_ACTIVITY.length - 1 ? `1px solid ${t.border}` : "none",
            }}
          >
            <div style={{
              width: 34, height: 34, borderRadius: 10,
              background: t[a.color as keyof Theme] + "15",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <Icon name={a.icon} size={16} color={t[a.color as keyof Theme]} />
            </div>
            <div style={{ flex: 1, fontSize: 13, color: t.text, lineHeight: 1.45 }}>{a.text}</div>
            <span style={{ fontSize: 11, color: t.muted, flexShrink: 0 }}>{a.time}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: t.muted, letterSpacing: 1.2, textTransform: "uppercase" }}>Nearby Traveller Updates</span>
        <PoweredBy t={t} />
      </div>

      {showFallback && error && (
        <div style={{
          display: "flex", alignItems: "center", gap: 8, marginBottom: 12,
          padding: "10px 14px", background: t.danger + "08",
          borderRadius: 12, border: `1px solid ${t.danger}20`,
        }}>
          <Icon name="AlertTriangle" size={14} color={t.danger} />
          <span style={{ fontSize: 12, color: t.muted, flex: 1 }}>{error} — showing cached posts</span>
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
      ) : !showFallback && apiPosts.length === 0 && allCreated.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "48px 24px",
          background: t.card, borderRadius: 20, border: `1px solid ${t.border}`,
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: t.tag, display: "flex", alignItems: "center",
            justifyContent: "center", margin: "0 auto 14px",
          }}>
            <Icon name="MessageCircle" size={28} color={t.muted} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: t.heading }}>No posts yet</div>
          <div style={{ fontSize: 13, color: t.muted, marginTop: 6, lineHeight: 1.5 }}>Be the first to share a travel update from your trip!</div>
        </div>
      ) : (
        feedItems.map((post, idx) => <PostCard key={post._apiId ?? post.id} post={post} t={t} openDest={openDest} idx={idx} />)
      )}

      <div style={{ marginTop: 4, marginBottom: 24 }}>
        <SectionTitle t={t}>Traveller Stories</SectionTitle>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
          {STORY_FEED.map(s => (
            <div
              key={s.id}
              onClick={() => openDest(s.destId)}
              style={{
                flexShrink: 0, width: 260,
                background: t.card, borderRadius: 20,
                border: `1px solid ${t.border}`,
                overflow: "hidden", cursor: "pointer",
                boxShadow: `0 1px 3px ${t.overlay}`,
              }}
            >
              <div style={{
                height: 130, background: s.gradient, position: "relative",
              }}>
                <div style={{
                  position: "absolute", bottom: 10, left: 14,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <Avatar initials={s.avatar} size={28} t={t} />
                  <span style={{ color: "#fff", fontSize: 12.5, fontWeight: 700 }}>{s.user}</span>
                </div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{
                  fontSize: 11, color: t.teal, fontWeight: 700, marginBottom: 5,
                  display: "flex", alignItems: "center", gap: 4,
                }}>
                  <Icon name="MapPin" size={11} color={t.teal} /> {s.place}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, color: t.heading, lineHeight: 1.2, marginBottom: 6 }}>
                  {s.title}
                </div>
                <div style={{ fontSize: 13, color: t.muted, lineHeight: 1.5, marginBottom: 10 }}>
                  {s.excerpt}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: t.danger, fontWeight: 600 }}>
                  <Icon name="Heart" size={13} color={t.danger} /> {s.likes}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionTitle t={t}>Recommended For You</SectionTitle>
        <div style={{ display: "flex", gap: 14, overflowX: "auto", paddingBottom: 8, scrollbarWidth: "none" }}>
          {DESTINATIONS.slice(0, 5).map(d => <DestTile key={d.id} d={d} t={t} openDest={openDest} w={140} h={175} />)}
        </div>
      </div>
    </div>
  );
}

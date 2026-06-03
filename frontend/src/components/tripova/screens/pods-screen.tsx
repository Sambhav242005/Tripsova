"use client";

import React, { useState, useEffect, useCallback, startTransition } from "react";
import type { Theme } from "@/data";
import { PODS, CURRENT_USER } from "@/data";
import { Avatar } from "../primitives/avatar";
import { Btn } from "../primitives/index";
import { Icon } from "../icon";
import { CompatBadge, TrustBadge, InterestChip, FoodBadge } from "../badges/index";
import { api, ApiError } from "@/lib/api";
import type { TripPodResponse, PaginatedList } from "@/lib/types";

const GRADIENTS = [
  "linear-gradient(150deg,#1E2740,#5A6B96)",
  "linear-gradient(150deg,#5A4F3E,#C2A878)",
  "linear-gradient(150deg,#1B3A47,#5E97A8)",
  "linear-gradient(150deg,#3A2E3A,#9A7E8E)",
  "linear-gradient(150deg,#243A33,#6E8C7E)",
  "linear-gradient(150deg,#2E2C44,#6E6E96)",
];

const STYLES = ["Adventure", "Friends", "Cultural", "Relaxed", "Food", "Solo"];

function transformPod(p: TripPodResponse, idx: number) {
  const start = p.start_date ? new Date(p.start_date) : null;
  const end = p.end_date ? new Date(p.end_date) : null;
  const fmt = (d: Date) => d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
  let dates = "Flexible";
  if (start && end) dates = `${fmt(start)}–${fmt(end)}`;
  else if (start) dates = `${fmt(start)} onwards`;
  const duration = start && end ? `${Math.ceil((end.getTime() - start.getTime()) / 86400000)} days` : "—";
  const travelStyle = Array.isArray(p.travel_style) ? p.travel_style[0] : typeof p.travel_style === "string" ? p.travel_style : null;
  const spots = Math.max(0, (p.max_members || 5) - (p.member_count || 0));
  return {
    id: p.id,
    destination: p.title || "Untitled Pod",
    dates,
    duration,
    budget: p.budget ? `₹${p.budget.toLocaleString("en-IN")}` : "₹—",
    spots,
    size: p.max_members || 5,
    host: CURRENT_USER.name,
    hostAvatar: CURRENT_USER.avatar,
    score: CURRENT_USER.trust,
    podRating: 4.0,
    pastPods: 0,
    style: travelStyle || STYLES[idx % STYLES.length],
    verified: false,
    compatibility: 50,
    intro: "Join this trip and explore together with fellow travellers!",
    voice: "Say hi to the group",
    interests: CURRENT_USER.foods?.length ? ["Food Exploration"] : [],
    description: p.title || "",
    gradient: GRADIENTS[idx % GRADIENTS.length],
    groupFoods: CURRENT_USER.foods || [],
  };
}

function SkeletonCard({ t }: { t: Theme }) {
  return (
    <div style={{ background: t.card, borderRadius: 18, overflow: "hidden", marginBottom: 16, border: `1px solid ${t.border}`, opacity: 0.6 }}>
      <div style={{ height: 90, background: t.tag }} />
      <div style={{ padding: 15 }}>
        <div style={{ display: "flex", gap: 11, marginBottom: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: t.tag }} />
          <div style={{ flex: 1 }}>
            <div style={{ width: "40%", height: 14, borderRadius: 6, background: t.tag, marginBottom: 6 }} />
            <div style={{ width: "60%", height: 11, borderRadius: 6, background: t.tag }} />
          </div>
        </div>
        <div style={{ width: "80%", height: 11, borderRadius: 6, background: t.tag, marginBottom: 8 }} />
        <div style={{ width: "50%", height: 11, borderRadius: 6, background: t.tag, marginBottom: 13 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 13 }}>{[1, 2, 3, 4].map(i => <div key={i} style={{ width: 56, height: 22, borderRadius: 8, background: t.tag }} />)}</div>
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 13, borderTop: `1px solid ${t.border}` }}>
          <div style={{ width: 80, height: 16, borderRadius: 6, background: t.tag }} />
          <div style={{ width: 110, height: 36, borderRadius: 9, background: t.tag }} />
        </div>
      </div>
    </div>
  );
}

export function PodsScreen({ t }: { t: Theme }) {
  const [tab, setTab] = useState("find");
  const [joined, setJoined] = useState<Record<string, boolean>>({});
  const [apiItems, setApiItems] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const myInterests = ["Photography", "Food Exploration", "Hiking"];

  const fetchPods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<PaginatedList<TripPodResponse>>("/api/trippods");
      setApiItems(res.items.map((p, i) => transformPod(p, i)));
    } catch (e) {
      setApiItems(null);
      setError(e instanceof ApiError ? "Couldn't load live pods. Showing sample data." : "Failed to load pods");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { startTransition(() => { fetchPods(); }); }, [fetchPods]);

  const displayPods = apiItems ?? PODS;

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ display: "flex", background: t.tag, borderRadius: 12, padding: 3, marginBottom: 20 }}>
        {["find", "mine"].map(tb => (
          <button
            key={tb}
            onClick={() => setTab(tb)}
            style={{
              flex: 1, padding: "10px", borderRadius: 9, border: "none",
              background: tab === tb ? t.card : "transparent",
              color: tab === tb ? t.accent : t.muted,
              fontWeight: tab === tb ? 700 : 500, cursor: "pointer", fontSize: 13,
              transition: "all 0.2s",
              boxShadow: tab === tb ? "0 1px 3px rgba(13,19,32,0.08)" : "none",
            }}
          >
            {tb === "find" ? "Find a Pod" : "My Pods"}
          </button>
        ))}
      </div>

      {error && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, background: t.danger + "12", color: t.danger, fontSize: 12.5, marginBottom: 14 }}>
          <Icon name="AlertCircle" size={16} />
          <span style={{ flex: 1 }}>{error}</span>
          <button
            onClick={fetchPods}
            style={{ padding: "5px 12px", borderRadius: 6, border: "none", background: t.danger + "20", color: t.danger, cursor: "pointer", fontWeight: 600, fontSize: 12 }}
          >
            Retry
          </button>
        </div>
      )}

      {tab === "find" && loading && [1, 2, 3].map(i => <SkeletonCard key={i} t={t} />)}

      {tab === "find" && !loading && apiItems && apiItems.length === 0 && (
        <div style={{ textAlign: "center", padding: "60px 28px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
            <Icon name="Search" size={30} color={t.muted} />
          </div>
          <div style={{ fontSize: 20, color: t.heading, marginBottom: 8, lineHeight: 1.25 }}>No pods matching your criteria</div>
          <div style={{ fontSize: 14, color: t.muted, marginBottom: 24, lineHeight: 1.5 }}>Try different filters or create your own pod to attract companions.</div>
          <Btn onClick={() => setTab("find")} t={t}>Browse All</Btn>
        </div>
      )}

      {tab === "find" && !loading && displayPods.map((rawPod, idx) => {
        const pod = rawPod as Record<string, unknown>;
        return (
        <div key={String(pod.id ?? idx)} style={{ background: t.card, borderRadius: 18, overflow: "hidden", marginBottom: 16, border: `1px solid ${t.border}`, boxShadow: "0 1px 3px rgba(13,19,32,0.04)" }}>
          <div style={{ height: 90, background: pod.gradient as string, position: "relative" }}>
            <div style={{ position: "absolute", top: 11, left: 12, background: "rgba(0,0,0,0.42)", backdropFilter: "blur(4px)", borderRadius: 7, padding: "4px 10px", fontSize: 11, color: "#fff", fontWeight: 600 }}>{pod.style as string}</div>
            <div style={{ position: "absolute", top: 11, right: 12 }}><CompatBadge pct={pod.compatibility as number} t={t} /></div>
            <div style={{ position: "absolute", bottom: 11, left: 12, color: "#fff" }}>
              <div style={{ fontSize: 19 }}>{pod.destination as string}</div>
              <div style={{ fontSize: 11.5, opacity: 0.9 }}>{(pod.dates as string)} · {pod.duration as string}</div>
            </div>
          </div>
          <div style={{ padding: 15 }}>
            <div style={{ display: "flex", gap: 11, marginBottom: 12 }}>
              <Avatar initials={pod.hostAvatar as string} size={42} t={t} />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 14, color: t.heading }}>{pod.host as string}</span>
                  {(pod.verified as boolean) && <Icon name="BadgeCheck" size={14} color={t.secondary} />}
                  <TrustBadge score={pod.score as number} t={t} />
                </div>
                <div style={{ fontSize: 11.5, color: t.muted, marginTop: 1, display: "flex", alignItems: "center", gap: 5 }}>
                  <Icon name="Star" size={11} color={t.warning} /> {pod.podRating as number} pod rating · {pod.pastPods as number} trips hosted
                </div>
              </div>
            </div>
            <p style={{ fontSize: 13.5, color: t.text, lineHeight: 1.55, margin: "0 0 11px" }}>&quot;{pod.intro as string}&quot;</p>
            <button style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 13px", borderRadius: 20, border: `1px solid ${t.border}`, background: t.tag, color: t.text, fontSize: 12, fontWeight: 600, cursor: "pointer", marginBottom: 13 }}>
              <Icon name="Play" size={12} color={t.accent} /> {pod.voice as string}
            </button>

            <div style={{ marginBottom: 13 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 7 }}>Shared Interests</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(pod.interests as string[] || []).map((i: string) => <InterestChip key={i} label={i} t={t} shared={myInterests.includes(i)} />)}</div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: t.muted, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 7 }}>Group Eats</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{(pod.groupFoods as string[] || []).map((id: string) => <FoodBadge key={id} id={id} small t={t} />)}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 13, borderTop: `1px solid ${t.border}` }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.accent }}>{pod.budget as string}<span style={{ fontSize: 11, color: t.muted, fontWeight: 400 }}>/person</span></div>
                <div style={{ fontSize: 11.5, color: (pod.spots as number) <= 1 ? t.danger : t.success, fontWeight: 700 }}>{(pod.spots as number)} of {pod.size as number} spots left</div>
              </div>
              <button
                onClick={() => setJoined(j => ({ ...j, [pod.id as string]: !j[pod.id as string] }))}
                style={{
                  padding: "10px 20px", borderRadius: 9, border: "none",
                  background: joined[pod.id as string] ? t.success : `linear-gradient(135deg,${t.accent},${t.secondary})`,
                  color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer",
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                {joined[pod.id as string] ? <><Icon name="Check" size={15} color="#fff" /> Requested</> : "Request to Join"}
              </button>
            </div>
          </div>
        </div>
        );
      })}

      {tab === "mine" && (
        <div style={{ textAlign: "center", padding: "60px 28px" }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}><Icon name="Users" size={30} color={t.secondary} /></div>
          <div style={{ fontSize: 20, color: t.heading, marginBottom: 8, lineHeight: 1.25 }}>Every great trip starts with one traveller saying hello.</div>
          <div style={{ fontSize: 14, color: t.muted, marginBottom: 24, lineHeight: 1.5 }}>Join a pod above, or create your own and let companions come to you.</div>
          <Btn onClick={() => setTab("find")} t={t}>Browse Pods</Btn>
        </div>
      )}
    </div>
  );
}

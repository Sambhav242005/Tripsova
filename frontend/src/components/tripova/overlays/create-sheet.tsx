"use client";

import React, { useState, useRef } from "react";
import type { Theme } from "@/data";
import { CURRENT_USER, CAT_COLORS, DESTINATIONS } from "@/data";
import { Icon } from "../icon";
import { Avatar } from "../primitives/avatar";
import { Btn } from "../primitives/index";
import { Sheet } from "./sheet";
import { api, ApiError } from "@/lib/api";
import type { FeedPostResponse, FeedPostCreate, TripPodCreate, TripPodResponse } from "@/lib/types";

interface CreateSheetProps {
  open: boolean;
  onClose: () => void;
  t: Theme;
  onCreatePost: (post: FeedPostResponse) => void;
  onCreatePod: (pod: TripPodResponse) => void;
}

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: "inherit", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 7 }}>
      {label}
    </div>
    {children}
  </div>
);

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1px solid var(--border, #E7E8EB)", background: "var(--tag, #F1F3F5)",
  color: "var(--text, #262B33)", fontSize: 14, outline: "none", boxSizing: "border-box",
};

const Opt = ({ icon, label, desc, on, t }: { icon: string; label: string; desc: string; on: () => void; t: Theme }) => (
  <button
    onClick={on}
    style={{
      display: "flex", alignItems: "center", gap: 13, width: "100%",
      padding: "15px 16px", borderRadius: 14, border: `1px solid ${t.border}`,
      background: t.card, cursor: "pointer", textAlign: "left", marginBottom: 11,
    }}
  >
    <div style={{ width: 44, height: 44, borderRadius: 12, background: t.accent + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <Icon name={icon} size={21} color={t.accent} />
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: t.text }}>{label}</div>
      <div style={{ fontSize: 12.5, color: t.muted }}>{desc}</div>
    </div>
    <Icon name="ChevronRight" size={18} color={t.muted} />
  </button>
);

export function CreateSheet({ open, onClose, t, onCreatePost, onCreatePod }: CreateSheetProps) {
  const [mode, setMode] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [place, setPlace] = useState("");
  const [cat, setCat] = useState("Food");
  const [photos, setPhotos] = useState<string[]>([]);
  const [podDest, setPodDest] = useState("");
  const [podDates, setPodDates] = useState("");
  const [podBudget, setPodBudget] = useState("");
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => { setMode(null); setText(""); setPlace(""); setCat("Food"); setPhotos([]); setPodDest(""); setPodDates(""); setPodBudget(""); setDone(false); setSubmitError(null); };
  const close = () => { reset(); onClose(); };

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = [...(e.target.files || [])].slice(0, 4);
    Promise.all(files.map(f => new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(r.result as string); r.readAsDataURL(f); }))).then(urls => setPhotos(p => [...p, ...urls].slice(0, 4)));
  };

  const submitPost = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const body: FeedPostCreate = { content: text.trim() };
      if (photos.length > 0) body.media = photos;
      const result = await api.post<FeedPostResponse>("/api/feed", body);
      onCreatePost(result);
      setDone(true);
      setTimeout(close, 1300);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? (typeof e.detail === 'string' ? e.detail : "Failed to create post") : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const submitPod = async () => {
    if (!podDest.trim()) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const destMatch = DESTINATIONS.find(d => podDest.toLowerCase().includes(d.name.toLowerCase()));
      const body: TripPodCreate = {
        destination_id: destMatch?.id || "",
        title: podDest,
        start_date: new Date().toISOString().split("T")[0],
        budget: podBudget ? parseInt(podBudget) : undefined,
        max_members: 5,
      };
      const result = await api.post<TripPodResponse>("/api/trippods", body);
      onCreatePod(result);
      setDone(true);
      setTimeout(close, 1300);
    } catch (e) {
      setSubmitError(e instanceof ApiError ? (typeof e.detail === 'string' ? e.detail : "Failed to create pod") : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const titles: Record<string, string> = { post: "Create Post", photos: "Upload Photos", trip: "Start a Trip", pod: "Create TripPod" };

  return (
    <Sheet open={open} onClose={close} t={t} title={done ? undefined : (mode ? titles[mode] : "Create")}>
      <div style={{ padding: "0 18px" }}>
        {done ? (
          <div style={{ textAlign: "center", padding: "30px 10px 20px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: t.success + "18", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
              <Icon name="Check" size={32} color={t.success} />
            </div>
            <div style={{ fontSize: 20, fontWeight: 700, color: t.heading, marginBottom: 6 }}>Shared with the community</div>
            <div style={{ fontSize: 13.5, color: t.muted }}>Your contribution is now live on Tripsova.</div>
          </div>
        ) : !mode ? (
          <>
            <Opt icon="PenLine" label="Create Post" desc="Share a tip, update or discovery" on={() => setMode("post")} t={t} />
            <Opt icon="ImagePlus" label="Upload Photos" desc="Add photos from your travels" on={() => setMode("photos")} t={t} />
            <Opt icon="Map" label="Start a Trip" desc="Log a new journey on your profile" on={() => setMode("trip")} t={t} />
            <Opt icon="Users" label="Create TripPod" desc="Find companions for your next trip" on={() => setMode("pod")} t={t} />
          </>
        ) : mode === "post" || mode === "photos" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <Avatar initials={CURRENT_USER.avatar} size={40} t={t} />
              <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{CURRENT_USER.name}</div>
            </div>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Share something useful for fellow travellers…"
              rows={4}
              style={{ ...inputStyle, resize: "none", marginBottom: 14, lineHeight: 1.5 }}
            />
            <input type="file" accept="image/*" multiple ref={fileRef} onChange={onFiles} style={{ display: "none" }} />
            {photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {photos.map((p, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={p} alt="" style={{ width: 72, height: 72, borderRadius: 10, objectFit: "cover" }} />
                    <button
                      onClick={() => setPhotos(ph => ph.filter((_, x) => x !== i))}
                      style={{
                        position: "absolute", top: -6, right: -6, width: 20, height: 20,
                        borderRadius: "50%", border: "none", background: t.danger,
                        color: "#fff", cursor: "pointer", fontSize: 11,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "11px", borderRadius: 10, border: `1px dashed ${t.border}`,
                background: "transparent", color: t.muted, fontSize: 13,
                cursor: "pointer", marginBottom: 14, justifyContent: "center",
              }}
            >
              <Icon name="ImagePlus" size={16} color={t.secondary} /> {photos.length ? "Add more photos" : "Add photos"}
            </button>
            <Field label="Location">
              <input value={place} onChange={e => setPlace(e.target.value)} placeholder="e.g. Kaza, Spiti" style={inputStyle} />
            </Field>
            <Field label="Category">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                {Object.keys(CAT_COLORS).map(c => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    style={{
                      padding: "6px 13px", borderRadius: 8,
                      border: `1.5px solid ${cat === c ? CAT_COLORS[c] : t.border}`,
                      background: cat === c ? CAT_COLORS[c] + "15" : t.tag,
                      color: cat === c ? CAT_COLORS[c] : t.muted,
                      fontSize: 12.5, fontWeight: cat === c ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>
            {submitError && (
              <div style={{ fontSize: 12.5, color: t.danger, marginBottom: 10, padding: "8px 10px", background: t.danger + "10", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="AlertTriangle" size={14} color={t.danger} /> {submitError}
              </div>
            )}
            <Btn onClick={submitPost} full t={t} disabled={!text.trim() || submitting}>{submitting ? "Posting…" : "Share with community"}</Btn>
          </>
        ) : mode === "trip" ? (
          <>
            <Field label="Destination">
              <input value={podDest} onChange={e => setPodDest(e.target.value)} placeholder="Where are you going?" style={inputStyle} />
            </Field>
            <Field label="Dates">
              <input value={podDates} onChange={e => setPodDates(e.target.value)} placeholder="e.g. 12–18 July" style={inputStyle} />
            </Field>
            <Field label="A note (optional)">
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="What's the plan?" style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
            </Field>
            {submitError && (
              <div style={{ fontSize: 12.5, color: t.danger, marginBottom: 10, padding: "8px 10px", background: t.danger + "10", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="AlertTriangle" size={14} color={t.danger} /> {submitError}
              </div>
            )}
            <Btn onClick={submitPod} full t={t} disabled={!podDest.trim() || submitting}>{submitting ? "Creating…" : "Start trip & open a pod"}</Btn>
          </>
        ) : (
          <>
            <Field label="Destination">
              <input value={podDest} onChange={e => setPodDest(e.target.value)} placeholder="e.g. Spiti Valley" style={inputStyle} />
            </Field>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Dates">
                <input value={podDates} onChange={e => setPodDates(e.target.value)} placeholder="Oct 10–17" style={inputStyle} />
              </Field>
              <Field label="Budget ₹">
                <input value={podBudget} onChange={e => setPodBudget(e.target.value)} type="number" placeholder="12000" style={inputStyle} />
              </Field>
            </div>
            <Field label="Intro to companions">
              <textarea value={text} onChange={e => setText(e.target.value)} rows={3} placeholder="Tell potential companions about the trip..." style={{ ...inputStyle, resize: "none", lineHeight: 1.5 }} />
            </Field>
            {submitError && (
              <div style={{ fontSize: 12.5, color: t.danger, marginBottom: 10, padding: "8px 10px", background: t.danger + "10", borderRadius: 8, display: "flex", alignItems: "center", gap: 6 }}>
                <Icon name="AlertTriangle" size={14} color={t.danger} /> {submitError}
              </div>
            )}
            <Btn onClick={submitPod} full t={t} disabled={!podDest.trim() || submitting}>{submitting ? "Creating…" : "Create TripPod"}</Btn>
          </>
        )}
      </div>
    </Sheet>
  );
}

"use client";

import React from "react";
import type { Theme } from "@/data";
import { getFI, VERIFY_LEVELS, USER_PREMIUM, getVerify, ALL_FOOD_TYPES } from "@/data/index";
import { Icon } from "../icon";

export function FoodBadge({ id, small, t }: { id: string; small?: boolean; t: Theme }) {
  const f = getFI(id);
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: f.color + "16", border: `1px solid ${f.color}30`,
        borderRadius: 6, padding: small ? "2px 8px" : "3px 11px",
        fontSize: small ? 10 : 11, fontWeight: 600, color: f.color,
        whiteSpace: "nowrap", letterSpacing: 0.2,
      }}
    >
      {f.emoji} {f.label}
    </span>
  );
}

export function TrustBadge({ score, t }: { score: number; t: Theme }) {
  const color = score >= 80 ? t.accent : score >= 60 ? t.secondary : t.gold;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        background: color + "14", border: `1px solid ${color}30`,
        borderRadius: 6, padding: "2px 8px 2px 6px",
        fontSize: 11, fontWeight: 700, color,
      }}
    >
      <Icon name="ShieldCheck" size={12} color={color} /> {score}
    </span>
  );
}

export function Hallmark({ label, t, light }: { label: string; t: Theme; light?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: light ? "rgba(255,255,255,0.92)" : t.goldFill + "24",
        border: `1px solid ${light ? "transparent" : t.gold + "55"}`,
        borderRadius: 7, padding: "4px 10px 4px 8px",
        fontSize: 11, fontWeight: 700, color: light ? "#1B263B" : t.gold,
        letterSpacing: 0.2, whiteSpace: "nowrap",
      }}
    >
      <Icon name="BadgeCheck" size={13} color={light ? "#B58F4F" : t.gold} /> {label}
    </span>
  );
}

export function CommunityVerified({ foodId, count, t }: { foodId: string; count: number; t: Theme }) {
  const f = getFI(foodId);
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: f.color + "14", border: `1px solid ${f.color}30`,
        borderRadius: 7, padding: "4px 10px",
        fontSize: 11, fontWeight: 700, color: f.color, whiteSpace: "nowrap",
      }}
    >
      <Icon name="BadgeCheck" size={13} color={f.color} /> {f.label} Verified · {count}
    </span>
  );
}

export function CommBadge({ label, t }: { label: string; t: Theme }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: t.tag, border: `1px solid ${t.border}`,
        borderRadius: 7, padding: "5px 11px",
        fontSize: 11.5, fontWeight: 600, color: t.text, whiteSpace: "nowrap",
      }}
    >
      <Icon name="Users" size={12} color={t.secondary} /> {label}
    </span>
  );
}

export function PoweredBy({ t, style = {} }: { t: Theme; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        fontSize: 10.5, fontWeight: 700, letterSpacing: 1,
        textTransform: "uppercase", color: t.muted, ...style,
      }}
    >
      <Icon name="Users" size={12} color={t.gold} /> Powered by Travellers
    </div>
  );
}

export function CompatBadge({ pct, t }: { pct: number; t: Theme }) {
  const color = pct >= 85 ? t.success : pct >= 70 ? t.secondary : t.gold;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: color + "16", border: `1px solid ${color}35`,
        borderRadius: 20, padding: "4px 11px 4px 9px",
        fontSize: 11.5, fontWeight: 800, color,
      }}
    >
      <Icon name="Sparkles" size={12} color={color} /> {pct}% match
    </span>
  );
}

export function InterestChip({ label, t, shared }: { label: string; t: Theme; shared?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: shared ? t.secondary + "16" : t.tag,
        border: `1px solid ${shared ? t.secondary + "40" : t.border}`,
        borderRadius: 20, padding: "4px 11px",
        fontSize: 11.5, fontWeight: 600, color: shared ? t.secondary : t.muted,
      }}
    >
      {shared && <Icon name="Check" size={11} color={t.secondary} />}{label}
    </span>
  );
}

export function VerifyMarks({ levels = [], t, size = 13, max = 3 }: { levels: string[]; t: Theme; size?: number; max?: number }) {
  const show = levels.filter(l => l !== "email" && l !== "phone").slice(0, max);
  const list = show.length ? show : levels.slice(0, max);
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
      {list.map(l => {
        const v = VERIFY_LEVELS[l];
        if (!v) return null;
        const c = t[v.color] || t.muted;
        return <Icon key={l} name={v.icon} size={size} color={c} />;
      })}
    </span>
  );
}

export function PremiumBadge({ t, small }: { t: Theme; small?: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        background: `linear-gradient(135deg,${t.gold},${t.goldFill})`,
        borderRadius: 6, padding: small ? "1px 6px" : "2px 9px 2px 7px",
        fontSize: small ? 9.5 : 10.5, fontWeight: 800, color: "#fff",
        letterSpacing: 0.4, textTransform: "uppercase", whiteSpace: "nowrap",
      }}
    >
      <Icon name="Crown" size={small ? 10 : 12} color="#fff" /> Premium
    </span>
  );
}

export function AuthorLine({ name, t, premium, size = 14.5 }: { name: string; t: Theme; premium?: boolean; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
      <span style={{ fontSize: size, fontWeight: 700, color: t.text }}>{name}</span>
      <VerifyMarks levels={getVerify(name)} t={t} />
      {(premium ?? USER_PREMIUM.includes(name)) && <PremiumBadge t={t} small />}
    </span>
  );
}

export function VisionTag({ t, label = "Vision" }: { t: Theme; label?: string }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 3,
        background: t.gold + "1A", border: `1px solid ${t.gold}45`,
        borderRadius: 5, padding: "1px 7px",
        fontSize: 9.5, fontWeight: 800, color: t.gold,
        letterSpacing: 0.5, textTransform: "uppercase", whiteSpace: "nowrap",
      }}
    >
      <Icon name="Sparkles" size={10} color={t.gold} /> {label}
    </span>
  );
}

export function MultiSelectFood({
  selected, onChange, t, hint,
}: {
  selected: string[]; onChange: (v: string[]) => void; t: Theme; hint?: string;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {hint && <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginBottom: 10 }}>{hint}</div>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {ALL_FOOD_TYPES.map(f => {
          const active = selected.includes(f.id);
          return (
            <button
              key={f.id}
              onClick={() => onChange(active ? selected.filter(x => x !== f.id) : [...selected, f.id])}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "6px 13px", borderRadius: 6,
                border: `1.5px solid ${active ? f.color : t.border}`,
                background: active ? f.color + "15" : t.tag,
                color: active ? f.color : t.muted,
                fontSize: 12, fontWeight: active ? 700 : 400,
                cursor: "pointer", transition: "all 0.18s",
              }}
            >
              {f.emoji} {f.label} {active && "✓"}
            </button>
          );
        })}
      </div>
      {selected.length > 0 && (
        <div style={{ marginTop: 10, padding: "9px 13px", background: t.tag, borderRadius: 10, fontSize: 12, color: t.accent, fontWeight: 600 }}>
          Filtering for: {selected.map(id => getFI(id).label).join(" + ")}
        </div>
      )}
    </div>
  );
}

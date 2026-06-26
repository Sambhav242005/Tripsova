"use client";

import React, { useId, useState } from "react";
import type { Theme } from "@/data";
import { Icon } from "../icon";

export function Divider({ t }: { t: Theme }) {
  return <div style={{ height: 1, background: `linear-gradient(90deg,${t.border},transparent)`, margin: "4px 0" }} />;
}

export function Fleuron({ t }: { t: Theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "20px 4px" }}>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,transparent,${t.border})` }} />
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: t.gold, flexShrink: 0 }} />
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg,${t.border},transparent)` }} />
    </div>
  );
}

export function SectionTitle({
  children, t, action, onAction,
}: {
  children: React.ReactNode; t: Theme; action?: string; onAction?: () => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 3, height: 18, borderRadius: 2, background: t.gold, flexShrink: 0 }} />
        <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 18, fontWeight: 400, color: t.heading, letterSpacing: 0.2, margin: 0 }}>
          {children}
        </h2>
      </div>
      {action && (
        <button
          onClick={onAction}
          style={{
            background: "transparent", border: "none", color: t.accent,
            fontSize: 12, fontWeight: 600, cursor: "pointer", letterSpacing: 0.3,
            padding: "4px 8px", borderRadius: 6,
          }}
        >
          {action}
        </button>
      )}
    </div>
  );
}

// Branded screen-level header: gold eyebrow + serif title + subtitle.
// Used at the top of feature screens for a consistent editorial identity.
export function ScreenHeader({
  t, eyebrow, title, subtitle, children,
}: {
  t: Theme; eyebrow?: string; title: React.ReactNode; subtitle?: string; children?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      {eyebrow && (
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 7 }}>
          <span style={{ width: 16, height: 2, borderRadius: 2, background: t.goldFill }} />
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: t.gold }}>{eyebrow}</span>
        </div>
      )}
      <h2 style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 26, fontWeight: 400, color: t.heading, lineHeight: 1.12, margin: 0 }}>{title}</h2>
      {subtitle && <div style={{ fontSize: 13, color: t.muted, marginTop: 6, lineHeight: 1.45 }}>{subtitle}</div>}
      {children}
    </div>
  );
}

// Themed segmented control / step-tabs. Used for the trip-planner hub's steps
// (Itinerary · Getting there · Budget) and its inner Auto/Manual sub-toggle, so one
// pill component carries both. Generic over the option id so callers stay type-safe.
export function SegmentedTabs<T extends string>({
  t, value, onChange, options, size = "md", ariaLabel,
}: {
  t: Theme;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string; icon?: string }[];
  size?: "sm" | "md";
  ariaLabel?: string;
}) {
  const pad = size === "sm" ? "8px 10px" : "11px 12px";
  const fs = size === "sm" ? 12.5 : 13.5;
  const iconSize = size === "sm" ? 14 : 16;
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      style={{
        display: "flex", gap: 4, padding: 4, marginBottom: size === "sm" ? 16 : 18,
        background: t.tag, border: `1px solid ${t.border}`, borderRadius: 14,
      }}
    >
      {options.map(o => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.id)}
            style={{
              flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              minWidth: 0, padding: pad, borderRadius: 10, border: "none", cursor: "pointer",
              background: active ? t.card : "transparent",
              color: active ? t.accent : t.muted,
              fontSize: fs, fontWeight: active ? 800 : 600, letterSpacing: 0.2,
              boxShadow: active ? `0 1px 2px ${t.overlay}, 0 2px 8px ${t.overlay}` : "none",
              transition: "background 0.18s, color 0.18s, box-shadow 0.18s",
            }}
          >
            {o.icon && <Icon name={o.icon} size={iconSize} color={active ? t.accent : t.muted} stroke={active ? 2.4 : 2} />}
            <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export function Card({ children, t, style = {} }: { children: React.ReactNode; t: Theme; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: t.card, borderRadius: 20, padding: 18,
        border: `1px solid ${t.border}`,
        boxShadow: `0 1px 3px ${t.overlay}, 0 4px 12px ${t.overlay}`,
        marginBottom: 14, ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Btn({
  children, onClick, full, outline, color, t, disabled, small,
}: {
  children: React.ReactNode; onClick?: () => void; full?: boolean; outline?: boolean;
  color?: string; t: Theme; disabled?: boolean; small?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const bg = outline ? "transparent" : (color || t.accent);
  // On a default accent fill use the theme's on-accent colour (dark text on the light
  // dark-mode accent clears WCAG AA); custom-coloured fills keep white text.
  const fg = outline ? (color || t.accent) : (color ? "#fff" : t.onAccent);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: full ? "100%" : "auto",
        padding: small ? "9px 18px" : "13px 24px",
        borderRadius: 12,
        border: `1.5px solid ${outline ? (color || t.accent + "40") : "transparent"}`,
        background: disabled ? t.muted + "80" : bg,
        color: disabled ? "#fff" : fg,
        fontSize: small ? 13 : 14.5,
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        letterSpacing: 0.3,
        transition: "background 0.2s ease, border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
        opacity: disabled ? 0.6 : 1,
        transform: hovered && !disabled ? "translateY(-1px)" : "none",
        boxShadow: hovered && !disabled ? `0 4px 12px ${bg}40` : "none",
      }}
    >
      {children}
    </button>
  );
}

export function InputF({
  label, value, onChange, placeholder, type = "text", t,
}: {
  label: string; value: string; onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string; type?: string; t: Theme;
}) {
  const [focused, setFocused] = useState(false);
  const id = useId();
  return (
    <div style={{ marginBottom: 16 }}>
      <label htmlFor={id} style={{ display: "block", fontSize: 11, fontWeight: 700, color: t.muted, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 7 }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "12px 16px", borderRadius: 12,
          border: `1.5px solid ${focused ? t.accent : t.border}`,
          background: t.card, color: t.text,
          fontSize: 14,
          outline: `2px solid ${focused ? t.accent + "40" : "transparent"}`,
          outlineOffset: 2,
          boxSizing: "border-box",
          transition: "border-color 0.2s, box-shadow 0.2s",
          boxShadow: focused ? `0 0 0 3px ${t.accent}15` : "none",
        }}
      />
    </div>
  );
}

export function SkeletonCard({ t }: { t: Theme }) {
  return (
    <div style={{ background: t.card, borderRadius: 20, padding: 18, marginBottom: 12, border: `1px solid ${t.border}` }}>
      {[75, 100, 55, 80].map((w, i) => (
        <div
          key={i}
          style={{
            height: 12, background: `linear-gradient(90deg,${t.tag},${t.bg2},${t.tag})`,
            backgroundSize: "200% 100%",
            borderRadius: 6, width: `${w}%`, marginBottom: 10,
            animation: "shimmer 1.5s ease-in-out infinite",
          }}
        />
      ))}
    </div>
  );
}

// A content-shaped loading placeholder for the planner result panels. Instead of a
// bare spinner, it previews the SHAPE of the output — a hero summary block followed by
// a few cards — so the wait reads as "your result is assembling right here", not "did
// anything happen?". role="status" + an sr-only label keep it announced to screen
// readers while aria-busy signals work is in flight.
export function PlannerSkeleton({ t, label = "Loading…", rows = 3 }: {
  t: Theme; label?: string; rows?: number;
}) {
  const bar = (w: number | string, h = 12, mb = 10): React.CSSProperties => ({
    height: h, width: typeof w === "number" ? `${w}%` : w, marginBottom: mb,
    borderRadius: 6, background: `linear-gradient(90deg,${t.tag},${t.bg2},${t.tag})`,
    backgroundSize: "200% 100%", animation: "shimmer 1.5s ease-in-out infinite",
  });
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      <div style={{ background: `linear-gradient(135deg,${t.accent}15,${t.secondary}10)`, borderRadius: 16, padding: 18, marginBottom: 14, border: `1px solid ${t.accent}20` }}>
        <div style={bar(55, 18, 10)} />
        <div style={bar(35, 12, 0)} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ background: t.card, borderRadius: 20, padding: 18, marginBottom: 12, border: `1px solid ${t.border}` }}>
          <div style={bar(40, 12, 14)} />
          <div style={bar(90)} />
          <div style={bar(75)} />
          <div style={bar(60, 12, 0)} />
        </div>
      ))}
    </div>
  );
}

// A form that collapses into a compact "dropdown" bar once there's a result, so the
// output sits at the top of the screen instead of below the fold. Collapsed, it shows
// a one-line summary + an Edit button that re-opens the form. Expanded, it shows the
// form with a Collapse control (only once there's a result to collapse back to).
export function CollapsibleForm({
  t, title, summary, open, onToggle, canCollapse = false, editLabel = "Edit", children,
}: {
  t: Theme;
  title: React.ReactNode;
  summary?: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  canCollapse?: boolean;
  editLabel?: string;
  children: React.ReactNode;
}) {
  if (!open) {
    return (
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={false}
        aria-label={`Edit — ${typeof title === "string" ? title : "your details"}`}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 12,
          padding: "13px 16px", marginBottom: 14, borderRadius: 16,
          border: `1px solid ${t.border}`, background: t.card,
          boxShadow: `0 1px 3px ${t.overlay}, 0 4px 12px ${t.overlay}`,
          cursor: "pointer", textAlign: "left",
        }}
      >
        <span style={{ width: 38, height: 38, borderRadius: 10, background: t.accent + "15", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon name="SlidersHorizontal" size={18} color={t.accent} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: t.text }}>{title}</span>
          {summary != null && summary !== "" && (
            <span style={{ display: "block", fontSize: 12, color: t.muted, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{summary}</span>
          )}
        </span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 13px", borderRadius: 10, border: `1.5px solid ${t.accent}`, background: t.accent + "12", color: t.accent, fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
          <Icon name="Pencil" size={13} color={t.accent} /> {editLabel}
        </span>
      </button>
    );
  }
  return (
    <Card t={t}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: t.text }}>{title}</div>
        {canCollapse && (
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={true}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: t.muted, fontSize: 12, fontWeight: 700, cursor: "pointer", padding: "4px 6px", borderRadius: 6 }}
          >
            <Icon name="ChevronUp" size={15} color={t.muted} /> Collapse
          </button>
        )}
      </div>
      {children}
    </Card>
  );
}

"use client";

import React, { useId, useState } from "react";
import type { Theme } from "@/data";

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
        <span style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 18, fontWeight: 400, color: t.heading, letterSpacing: 0.2 }}>
          {children}
        </span>
      </div>
      {action && (
        <button
          onClick={onAction}
          style={{
            background: "transparent", border: "none", color: t.secondary,
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
          <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.4, textTransform: "uppercase", color: t.secondary }}>{eyebrow}</span>
        </div>
      )}
      <div style={{ fontFamily: "var(--font-dm-serif), Georgia, serif", fontSize: 26, color: t.heading, lineHeight: 1.12 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: t.muted, marginTop: 6, lineHeight: 1.45 }}>{subtitle}</div>}
      {children}
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
  const fg = outline ? (color || t.accent) : "#fff";
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

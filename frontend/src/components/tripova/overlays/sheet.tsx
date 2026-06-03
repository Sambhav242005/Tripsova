"use client";

import React from "react";
import type { Theme } from "@/data";
import { Icon } from "../icon";

export function Sheet({
  open, onClose, t, children, title,
}: {
  open: boolean; onClose: () => void; t: Theme; children: React.ReactNode; title?: string;
}) {
  return (
    <div
      style={{
        position: "fixed", top: 0, bottom: 0, left: "50%",
        transform: "translateX(-50%)", width: "100%", maxWidth: 430,
        zIndex: 300, pointerEvents: open ? "auto" : "none",
      }}
    >
      <div
        onClick={onClose}
        style={{
          position: "absolute", inset: 0,
          background: "rgba(13,19,32,0.55)",
          opacity: open ? 1 : 0,
          transition: "opacity 0.28s",
        }}
      />
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0,
          background: t.bg, borderRadius: "22px 22px 0 0",
          borderTop: `1px solid ${t.border}`,
          boxShadow: "0 -8px 40px rgba(13,19,32,0.3)",
          transform: open ? "translateY(0)" : "translateY(110%)",
          transition: "transform 0.34s cubic-bezier(0.4,0,0.2,1)",
          maxHeight: "90%", overflowY: "auto", paddingBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: 38, height: 4, borderRadius: 2, background: t.border }} />
        </div>
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 18px 12px" }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>{title}</span>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: "50%",
                border: "none", background: t.tag, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icon name="X" size={17} color={t.muted} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

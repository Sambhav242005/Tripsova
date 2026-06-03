"use client";

import React, { useState } from "react";
import type { Theme } from "@/data";
import { Icon } from "../icon";
import { Sheet } from "./sheet";

export function EmergencySheet({ open, onClose, t }: { open: boolean; onClose: () => void; t: Theme }) {
  const [sharing, setSharing] = useState(false);
  const items = [
    { icon: "Hospital", label: "Nearby Hospitals", sub: "Apollo, 1.2 km · 3 more within 5 km" },
    { icon: "Phone", label: "Emergency Numbers", sub: "Police 100 · Ambulance 102 · Tourist 1363" },
    { icon: "Landmark", label: "Embassy Information", sub: "Your registered embassy & consulate" },
  ];
  return (
    <Sheet open={open} onClose={onClose} t={t} title="Emergency">
      <div style={{ padding: "0 18px" }}>
        <button
          style={{
            width: "100%", padding: "18px", borderRadius: 16, border: "none",
            background: `linear-gradient(135deg,${t.danger},#7E2A22)`, color: "#fff",
            fontSize: 18, fontWeight: 800, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, marginBottom: 14, boxShadow: `0 6px 20px ${t.danger}55`,
          }}
        >
          <Icon name="Siren" size={24} color="#fff" /> Emergency SOS
        </button>
        <button
          onClick={() => setSharing(s => !s)}
          style={{
            width: "100%", padding: "13px", borderRadius: 12,
            border: `1.5px solid ${sharing ? t.success : t.border}`,
            background: sharing ? t.success + "15" : t.card,
            color: sharing ? t.success : t.text,
            fontSize: 14, fontWeight: 700, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, marginBottom: 18,
          }}
        >
          <Icon name="MapPin" size={17} color={sharing ? t.success : t.secondary} />
          {sharing ? "Live location sharing ON" : "One-Tap Location Sharing"}
        </button>
        {items.map(i => (
          <div key={i.label} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 14px", borderRadius: 14, border: `1px solid ${t.border}`, background: t.card, marginBottom: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: t.danger + "12", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={i.icon} size={19} color={t.danger} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: t.text }}>{i.label}</div>
              <div style={{ fontSize: 12, color: t.muted }}>{i.sub}</div>
            </div>
            <Icon name="ChevronRight" size={17} color={t.muted} />
          </div>
        ))}
      </div>
    </Sheet>
  );
}

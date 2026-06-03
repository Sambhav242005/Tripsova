"use client";

import React from "react";
import type { Theme, Notification } from "@/data";
import { NOTIFICATIONS } from "@/data";
import { Icon } from "../icon";
import { Sheet } from "./sheet";

export function NotificationsSheet({ open, onClose, t }: { open: boolean; onClose: () => void; t: Theme }) {
  return (
    <Sheet open={open} onClose={onClose} t={t} title="Notifications">
      <div style={{ padding: "0 14px" }}>
        {NOTIFICATIONS.map((n: Notification) => (
          <div
            key={n.id}
            style={{
              display: "flex", alignItems: "center", gap: 12,
              padding: "13px 8px", borderBottom: `1px solid ${t.border}`,
              background: n.unread ? t.accent + "08" : "transparent",
              borderRadius: 10,
            }}
          >
            <div style={{ width: 38, height: 38, borderRadius: 11, background: t[n.color as keyof Theme] + "18", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={n.icon} size={18} color={t[n.color as keyof Theme]} />
            </div>
            <div style={{ flex: 1, fontSize: 13.5, color: t.text, lineHeight: 1.4 }}>{n.text}</div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
              <span style={{ fontSize: 11, color: t.muted }}>{n.time}</span>
              {n.unread && <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.secondary }} />}
            </div>
          </div>
        ))}
      </div>
    </Sheet>
  );
}

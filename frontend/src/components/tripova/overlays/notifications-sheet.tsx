"use client";

import React from "react";
import type { Theme } from "@/data";
import { Icon } from "../icon";
import { Sheet } from "./sheet";

export function NotificationsSheet({ open, onClose, t }: { open: boolean; onClose: () => void; t: Theme }) {
  return (
    <Sheet open={open} onClose={onClose} t={t} title="Notifications">
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
          <Icon name="Bell" size={26} color={t.muted} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: t.heading }}>No notifications yet</div>
        <div style={{ fontSize: 13, color: t.muted, marginTop: 6, lineHeight: 1.5 }}>Updates about your pods, trips, and verifications will show up here.</div>
      </div>
    </Sheet>
  );
}

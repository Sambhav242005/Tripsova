"use client";

import React from "react";
import type { Theme } from "@/data";

export function Avatar({ initials, size = 38, t }: { initials: string; size?: number; t: Theme }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `linear-gradient(135deg,${t.accent},${t.secondary})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontSize: size * 0.34,
        fontWeight: 800,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  );
}

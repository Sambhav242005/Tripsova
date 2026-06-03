"use client";

import React, { useState, useEffect } from "react";
import type { Theme } from "@/data";
import { FAMILY_MEMBERS } from "@/data";
import type { FamilyMember } from "@/data";
import { Card, Btn, SectionTitle } from "../primitives/index";
import { api } from "@/lib/api";
import type { UserResponse } from "@/lib/types";

export function FamilyScreen({ t }: { t: Theme }) {
  const [checkin, setCheckin] = useState(false);
  const [members, setMembers] = useState<FamilyMember[]>(FAMILY_MEMBERS);

  useEffect(() => {
    (async () => {
      try {
        const user = await api.get<UserResponse>("/api/users/me");
        const self: FamilyMember = {
          id: 0,
          name: user.name,
          relation: "You (Your Profile)",
          avatar: user.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase(),
          location: "Current trip",
          lastSeen: "Just now",
          status: "active",
          trip: null,
          checkins: 0,
        };
        setMembers([self, ...FAMILY_MEMBERS]);
      } catch {
        // fall back to hardcoded family members
      }
    })();
  }, []);

  return (
    <div style={{ padding: "0 16px 110px" }}>
      <div style={{ background: `linear-gradient(135deg,${t.success}10,${t.teal}08)`, borderRadius: 12, padding: "13px 16px", marginBottom: 20, border: `1px solid ${t.success}15` }}>
        <div style={{ fontSize: 14, color: t.success, fontWeight: 700 }}>👨‍👩‍👧 Family Circle</div>
        <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginTop: 2 }}>Share your journey. Keep loved ones at ease.</div>
      </div>

      <SectionTitle t={t}>Your Check-In</SectionTitle>
      <Card t={t}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 12 }}>Share your current status</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
          {["I've arrived safely", "All is well", "On the move", "Need to be reached"].map(status => (
            <button key={status} style={{ padding: "7px 14px", borderRadius: 6, border: `1px solid ${t.border}`, background: t.tag, color: t.muted, fontSize: 12, cursor: "pointer" }}>{status}</button>
          ))}
        </div>
        <button onClick={() => setCheckin(true)} style={{ width: "100%", padding: "12px", borderRadius: 8, border: "none", background: `linear-gradient(135deg,${t.success},${t.teal})`, color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
          {checkin ? "✓ Checked In — Family Notified" : "Send Check-In to Family"}
        </button>
        {checkin && <div style={{ marginTop: 10, fontSize: 12, color: t.success, fontStyle: "italic", textAlign: "center" }}>Your family has been notified ✓</div>}
      </Card>

      <SectionTitle t={t}>Family Members</SectionTitle>
      {members.map(m => (
        <Card key={m.id} t={t}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: `linear-gradient(135deg,${t.accent},${t.secondary})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{m.avatar}</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: t.text }}>{m.name}</div>
                <div style={{ fontSize: 12, color: t.muted }}>{m.relation}</div>
                <div style={{ fontSize: 11, color: m.status === "active" ? t.success : t.muted, marginTop: 2 }}>
                  {m.status === "active" ? `📍 ${m.location} · ${m.lastSeen}` : `🏠 At home · ${m.lastSeen}`}
                </div>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              {m.trip && <div style={{ fontSize: 11, color: t.accent, fontWeight: 600 }}>{m.trip}</div>}
              {m.checkins > 0 && <div style={{ fontSize: 11, color: t.muted }}>{m.checkins} check-ins</div>}
            </div>
          </div>
          {m.status === "active" && <div style={{ marginTop: 12, padding: "8px 12px", background: t.success + "10", borderRadius: 8, fontSize: 12, color: t.success, borderLeft: `3px solid ${t.success}` }}>Live trip updates being shared ✓</div>}
        </Card>
      ))}

      <Card t={t}>
        <div style={{ fontSize: 13, fontWeight: 700, color: t.text, marginBottom: 4 }}>+ Invite Family Member</div>
        <div style={{ fontSize: 12, color: t.muted, fontStyle: "italic", marginBottom: 12 }}>They&apos;ll receive a link to view your trips passively</div>
        <Btn outline t={t} full>Send Invite Link</Btn>
      </Card>
    </div>
  );
}

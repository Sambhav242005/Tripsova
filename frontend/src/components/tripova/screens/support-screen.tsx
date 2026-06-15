"use client";

import type { Theme } from "@/data";
import { Icon } from "../icon";
import { Card, ScreenHeader } from "../primitives/index";

const SUPPORT_EMAIL = "tripsova.app@gmail.com";

const SUPPORT_TOPICS = [
  ["Account or login", "Tell us the email on your Tripsova account and what you were trying to do."],
  ["Trip planning issue", "Share your destination, dates, budget, and the step where the app got stuck."],
  ["Food verification", "Send the place name, city, diet tag, and what needs correction."],
  ["Safety or TrustScore", "Include the destination, post, or profile name so the team can review it."],
];

export function SupportScreen({ t }: { t: Theme }) {
  return (
    <div style={{ padding: "12px 12px 16px" }}>
      <ScreenHeader
        t={t}
        eyebrow="Tripsova care"
        title="Help & Support"
        subtitle="Reach the Tripsova team for account, trip, food, safety, or partner help."
      />

      <Card t={t} style={{ background: `linear-gradient(135deg,${t.accent}14,${t.secondary}0A)` }}>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: t.card, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon name="LifeBuoy" size={20} color={t.accent} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: t.heading }}>Email support</div>
            <div style={{ fontSize: 13, color: t.muted, marginTop: 4, lineHeight: 1.5 }}>
              General, support, privacy, and partnership messages all go to the same inbox.
            </div>
            <a
              href={`mailto:${SUPPORT_EMAIL}?subject=Tripsova%20Support`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                marginTop: 14,
                padding: "10px 14px",
                borderRadius: 10,
                background: t.accent,
                color: "#fff",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <Icon name="Mail" size={15} color="#fff" /> {SUPPORT_EMAIL}
            </a>
          </div>
        </div>
      </Card>

      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 12 }}>What to include</div>
        <div style={{ display: "grid", gap: 12 }}>
          {SUPPORT_TOPICS.map(([title, desc]) => (
            <div key={title} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Icon name="Check" size={15} color={t.success} />
              </span>
              <span>
                <span style={{ display: "block", fontSize: 13.5, fontWeight: 800, color: t.text }}>{title}</span>
                <span style={{ display: "block", fontSize: 12.5, color: t.muted, lineHeight: 1.45, marginTop: 2 }}>{desc}</span>
              </span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

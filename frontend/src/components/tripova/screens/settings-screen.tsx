"use client";

import type { Theme } from "@/data";
import { LANGUAGES } from "@/data";
import { useApp } from "../app-provider";
import { Icon } from "../icon";
import { Card, ScreenHeader } from "../primitives/index";

const SUPPORT_EMAIL = "tripsova.app@gmail.com";

function LinkRow({
  t,
  icon,
  label,
  href,
  hint,
}: {
  t: Theme;
  icon: string;
  label: string;
  href: string;
  hint: string;
}) {
  return (
    <a
      href={href}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 0",
        color: t.text,
        textDecoration: "none",
        borderBottom: `1px solid ${t.border}`,
      }}
    >
      <span style={{ width: 36, height: 36, borderRadius: 10, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon name={icon} size={17} color={t.accent} />
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 14, fontWeight: 700, color: t.text }}>{label}</span>
        <span style={{ display: "block", fontSize: 12, color: t.muted, marginTop: 2 }}>{hint}</span>
      </span>
      <Icon name="ChevronRight" size={16} color={t.muted} />
    </a>
  );
}

export function SettingsScreen({ t }: { t: Theme }) {
  const { dark, setDark, lang, setLang, T } = useApp();

  return (
    <div style={{ padding: "12px 12px 16px" }}>
      <ScreenHeader
        t={t}
        eyebrow="Account controls"
        title={T("Settings & Privacy")}
        subtitle="Manage display, language, privacy links, and Tripsova contact channels."
      />

      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 12 }}>{T("Language")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {LANGUAGES.map((l) => {
            const active = lang === l;
            return (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1.5px solid ${active ? t.accent : t.border}`,
                  background: active ? t.accent + "12" : t.tag,
                  color: active ? t.accent : t.text,
                  fontSize: 13,
                  fontWeight: active ? 800 : 600,
                  cursor: "pointer",
                }}
              >
                {l}
              </button>
            );
          })}
        </div>
      </Card>

      <Card t={t}>
        <button
          onClick={() => setDark((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: 0,
            border: "none",
            background: "transparent",
            color: t.text,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, background: t.tag, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Icon name={dark ? "Sun" : "Moon"} size={17} color={t.accent} />
            </span>
            <span>
              <span style={{ display: "block", fontSize: 14, fontWeight: 800 }}>{dark ? "Light mode" : "Dark mode"}</span>
              <span style={{ display: "block", fontSize: 12, color: t.muted, marginTop: 2 }}>Switch the Tripsova app theme.</span>
            </span>
          </span>
          <span style={{ width: 44, height: 24, borderRadius: 999, background: dark ? t.accent : t.border, padding: 3, boxSizing: "border-box" }}>
            <span style={{ display: "block", width: 18, height: 18, borderRadius: "50%", background: "#fff", marginLeft: dark ? 20 : 0, transition: "margin 0.18s" }} />
          </span>
        </button>
      </Card>

      <Card t={t}>
        <div style={{ fontSize: 14, fontWeight: 800, color: t.text, marginBottom: 4 }}>Privacy & support</div>
        <LinkRow t={t} icon="ShieldCheck" label="Privacy Policy" href="/privacy" hint="How Tripsova handles account and trip data." />
        <LinkRow t={t} icon="FileText" label="Terms of Service" href="/terms" hint="Community and product usage terms." />
        <LinkRow t={t} icon="Mail" label="Contact Tripsova" href={`mailto:${SUPPORT_EMAIL}`} hint={SUPPORT_EMAIL} />
      </Card>
    </div>
  );
}

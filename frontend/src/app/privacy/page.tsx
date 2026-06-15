import type { Metadata } from "next";
import { SiteHeader, SiteFooter, C } from "@/components/marketing/site-chrome";

const serif = "var(--font-dm-serif), Georgia, serif";
const UPDATED = "June 9, 2026";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Tripsova collects, uses, and protects your data — account information, trip preferences, and traveller contributions.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Information we collect",
    p: [
      "Account information you give us when you register — your name, email address and password (stored only as a secure hash).",
      "Trip information you create — destinations, dates, budget, group type, interests and diet preferences used to build your itineraries.",
      "Contributions you make — reviews, verifications, safety updates and other posts you share with the traveller community.",
      "Usage and device data — how you interact with the app, plus approximate location only when you explicitly grant permission (used for nearby search).",
    ],
  },
  {
    h: "2. How we use your information",
    p: [
      "To provide the core service: generating itineraries, ranking diet-aware places (PureFind), matching companions (TripPods) and building offline packs.",
      "To personalise recommendations to your budget, diet and travel style.",
      "To compute TrustScores and keep the community safe and authentic.",
      "To improve Tripsova, fix problems and communicate important service updates.",
    ],
  },
  {
    h: "3. How we share information",
    p: [
      "We do not sell your personal data. Ever.",
      "Content you choose to post publicly (e.g. a safety update or place verification) is visible to other travellers, attributed to your display name.",
      "We share limited data with service providers who host and operate Tripsova on our behalf, under confidentiality obligations.",
      "We may disclose information where required by law, or to protect the rights, safety and security of users and the public.",
    ],
  },
  {
    h: "4. Your choices and rights",
    p: [
      "You can access, update or correct your account information at any time from your profile.",
      "You can request deletion of your account and associated personal data.",
      "You can control location and notification permissions through your device settings.",
      "To exercise any of these rights, contact us at the address below.",
    ],
  },
  {
    h: "5. Data security",
    p: [
      "We use industry-standard safeguards including encrypted transport (HTTPS), hashed passwords and access controls.",
      "No system is perfectly secure, so we encourage strong, unique passwords and prompt reporting of any suspected issue.",
    ],
  },
  {
    h: "6. Data retention",
    p: [
      "We keep your information for as long as your account is active or as needed to provide the service.",
      "When you delete your account, we remove or anonymise personal data, except where retention is required for legal, safety or fraud-prevention purposes.",
    ],
  },
  {
    h: "7. Children",
    p: [
      "Tripsova is not directed to children under 13 (or the minimum age required in your jurisdiction). We do not knowingly collect data from them.",
    ],
  },
  {
    h: "8. Changes to this policy",
    p: [
      "We may update this policy from time to time. Material changes will be highlighted in the app, and the “last updated” date above will change.",
    ],
  },
  {
    h: "9. Contact us",
    p: [
      "Questions about privacy? Email tripsova.app@gmail.com and we’ll respond as soon as we can.",
    ],
  },
];

export default function PrivacyPage() {
  return (
    <main
      style={{
        background: C.bg,
        color: C.text,
        fontFamily: "var(--font-manrope), system-ui, sans-serif",
      }}
    >
      <SiteHeader />
      <article style={{ maxWidth: 760, margin: "0 auto", padding: "48px 20px 24px" }}>
        <h1 style={{ fontFamily: serif, fontSize: "clamp(30px, 5vw, 44px)", color: C.navy, margin: "0 0 8px" }}>
          Privacy Policy
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 28px" }}>Last updated: {UPDATED}</p>
        <p style={{ fontSize: 16.5, lineHeight: 1.75, margin: "0 0 28px" }}>
          Tripsova (“we”, “us”) helps travellers plan trips on verified, community-sourced
          information. This policy explains what we collect, how we use it, and the choices
          you have. We keep it short and plain on purpose.
        </p>

        {SECTIONS.map((s) => (
          <section key={s.h} style={{ marginBottom: 26 }}>
            <h2 style={{ fontFamily: serif, fontSize: 22, color: C.navy, margin: "0 0 10px" }}>{s.h}</h2>
            {s.p.map((para, i) => (
              <p key={i} style={{ fontSize: 15.5, lineHeight: 1.7, color: C.text, margin: "0 0 10px" }}>
                {para}
              </p>
            ))}
          </section>
        ))}
      </article>
      <SiteFooter />
    </main>
  );
}

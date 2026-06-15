import type { Metadata } from "next";
import { SiteHeader, SiteFooter, C } from "@/components/marketing/site-chrome";

const serif = "var(--font-dm-serif), Georgia, serif";
const UPDATED = "June 9, 2026";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The terms that govern your use of Tripsova — accounts, acceptable use, community content, and important disclaimers about traveller-sourced information.",
  alternates: { canonical: "/terms" },
};

const SECTIONS: { h: string; p: string[] }[] = [
  {
    h: "1. Acceptance of these terms",
    p: [
      "By creating an account or using Tripsova, you agree to these Terms of Service and to our Privacy Policy. If you do not agree, please do not use the service.",
    ],
  },
  {
    h: "2. The service",
    p: [
      "Tripsova helps you plan trips using traveller-verified destinations, food, safety updates and companions, plus AI-assisted itineraries and offline packs.",
      "Features may change, improve or be discontinued as the product evolves.",
    ],
  },
  {
    h: "3. Your account",
    p: [
      "You must provide accurate information and keep your credentials secure. You are responsible for activity under your account.",
      "You must meet the minimum age required in your jurisdiction to use Tripsova.",
    ],
  },
  {
    h: "4. Acceptable use",
    p: [
      "Be honest. Do not post fake reviews, fake verifications, spam, or misleading safety information.",
      "Do not harass other travellers, infringe others’ rights, or attempt to disrupt, scrape or reverse-engineer the service.",
      "We may remove content and suspend accounts that violate these rules or harm the community.",
    ],
  },
  {
    h: "5. Your content",
    p: [
      "You keep ownership of the content you post. You grant Tripsova a worldwide, non-exclusive licence to host, display and distribute it within the service.",
      "By contributing verifications or updates, you confirm they are truthful to the best of your knowledge — other travellers rely on them.",
    ],
  },
  {
    h: "6. Community information — important",
    p: [
      "Much of Tripsova’s content is community-sourced and AI-assisted. We work hard to rank it by trust, but we cannot guarantee that any place, route, price, diet status or safety note is complete, current or accurate.",
      "Always use your own judgement and verify critical safety, health, visa and diet information independently before you act on it.",
    ],
  },
  {
    h: "7. Third-party content and links",
    p: [
      "The service may reference third-party places, websites or services. We are not responsible for their content, availability or practices.",
    ],
  },
  {
    h: "8. Disclaimers",
    p: [
      "Tripsova is provided “as is” and “as available”, without warranties of any kind, to the fullest extent permitted by law.",
    ],
  },
  {
    h: "9. Limitation of liability",
    p: [
      "To the maximum extent permitted by law, Tripsova will not be liable for indirect, incidental or consequential damages, or for decisions you make based on community-sourced information.",
    ],
  },
  {
    h: "10. Termination",
    p: [
      "You may stop using Tripsova at any time. We may suspend or terminate access if you breach these terms or to protect the service and its users.",
    ],
  },
  {
    h: "11. Governing law",
    p: [
      "These terms are governed by the laws of India, without regard to conflict-of-law principles. Courts in India will have jurisdiction over disputes.",
    ],
  },
  {
    h: "12. Changes and contact",
    p: [
      "We may update these terms; continued use after changes means you accept them. Questions? Email tripsova.app@gmail.com.",
    ],
  },
];

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ color: C.muted, fontSize: 14, margin: "0 0 28px" }}>Last updated: {UPDATED}</p>
        <p style={{ fontSize: 16.5, lineHeight: 1.75, margin: "0 0 28px" }}>
          These terms govern your use of Tripsova. Please read them — especially the section
          on community-sourced information, which explains what we can and can’t guarantee.
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

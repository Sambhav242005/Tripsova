import type { Metadata } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap",
});

const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: ["400"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://tripsova.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Tripsova — Discover through people",
    template: "%s | Tripsova",
  },
  description:
    "Plan safer, smarter trips with Tripsova: traveller-verified destinations, AI trip planning, verified companions (TripPods), diet-aware food discovery, and offline trip packs.",
  applicationName: "Tripsova",
  keywords: [
    "Tripsova",
    "travel app",
    "India travel",
    "traveller verified",
    "trip planner",
    "travel companions",
    "TripPod",
    "PureFind",
    "Jain food",
    "pure veg",
    "vegan",
    "halal food",
    "offline travel",
    "solo travel safety",
    "family travel",
  ],
  authors: [{ name: "Tripsova" }],
  creator: "Tripsova",
  publisher: "Tripsova",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Tripsova",
    title: "Tripsova — Discover through people",
    description:
      "Traveller-verified destinations, AI trip planning, verified companions, diet-aware food, and offline trip packs. Powered by Travellers.",
    url: SITE_URL,
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tripsova — Discover through people",
    description:
      "Traveller-verified destinations, AI trip planning, verified companions, diet-aware food, and offline trip packs.",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Tripsova",
  url: SITE_URL,
  slogan: "Discover through people.",
  description:
    "India-first, globally scalable travel and community app for traveller-verified trips, food, and companions.",
  logo: `${SITE_URL}/icon.svg`,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${dmSerif.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
      </body>
    </html>
  );
}

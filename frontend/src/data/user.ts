import type { Theme } from "./theme";

export interface CurrentUser {
  name: string;
  handle: string;
  avatar: string;
  trust: number;
  premium: boolean;
  profileType: string;
  verifications: string[];
  followers: number;
  following: number;
  countries: number;
  posts: number;
  trips: number;
  pods: number;
  foods: string[];
  referrals: number;
}

export const CURRENT_USER: CurrentUser = {
  name: "Aakash Kumar",
  handle: "@aakash.travels",
  avatar: "AK",
  trust: 88,
  premium: true,
  profileType: "Creator",
  verifications: ["email", "phone", "digilocker", "frequent", "premium"],
  followers: 1240,
  following: 312,
  countries: 3,
  posts: 48,
  trips: 12,
  pods: 7,
  foods: ["jain", "pure_veg"],
  referrals: 6,
};

export const SCREEN_TITLES: Record<string, string> = {
  home: "Home",
  discover: "Discover",
  purefind: "PureFind",
  pods: "TripPods",
  profile: "Profile",
  plan: "Trip Builder",
  guides: "Local Guides",
  family: "Family Circle",
  budget: "Budget Tracker",
  maps: "Offline Maps",
  dest: "Destination",
};

export const SUBPAGES = ["plan", "guides", "family", "budget", "maps"];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {},
  हिंदी: {
    "Home": "होम",
    "Discover": "खोज",
    "PureFind": "प्योरफाइंड",
    "Pods": "पॉड्स",
    "Profile": "प्रोफ़ाइल",
    "Helpful": "सहायक",
    "Reply": "जवाब",
    "Language": "भाषा",
  },
  தமிழ்: {
    "Home": "முகப்பு",
    "Discover": "ஆராய்",
    "Helpful": "பயனுள்ளது",
    "Reply": "பதில்",
    "Language": "மொழி",
  },
  বাংলা: {
    "Home": "হোম",
    "Discover": "অন্বেষণ",
    "Helpful": "সহায়ক",
    "Reply": "উত্তর",
    "Language": "ভাষা",
  },
};

export const VERIFY_LEVELS: Record<string, { icon: string; label: string; color: keyof Theme }> = {
  email: { icon: "Mail", label: "Email Verified", color: "muted" },
  phone: { icon: "Smartphone", label: "Phone Verified", color: "secondary" },
  digilocker: { icon: "ShieldCheck", label: "DigiLocker Verified", color: "success" },
  govt: { icon: "BadgeCheck", label: "Government ID Verified", color: "accent" },
  frequent: { icon: "Plane", label: "Frequent Traveller", color: "teal" },
  premium: { icon: "Crown", label: "Premium Member", color: "gold" },
};

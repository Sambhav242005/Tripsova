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

export const SCREEN_TITLES: Record<string, string> = {
  home: "Home",
  discover: "Trip Pulse",
  purefind: "PureFind",
  pods: "TripPods",
  profile: "Profile",
  plan: "Trip Builder",
  budget: "Budget Tracker",
  maps: "Offline Maps",
  settings: "Settings & Privacy",
  support: "Help & Support",
  dest: "Destination",
};

export const SUBPAGES = ["plan", "budget", "maps", "settings", "support"];

export const TRANSLATIONS: Record<string, Record<string, string>> = {
  English: {},
  हिंदी: {
    "Home": "होम",
    "Discover": "खोज",
    "Trip Pulse": "ट्रिप पल्स",
    "PureFind": "प्योरफाइंड",
    "Pods": "पॉड्स",
    "TripPods": "ट्रिपपॉड्स",
    "AI Trip Builder": "एआई ट्रिप बिल्डर",
    "Plan My Journey": "मेरी यात्रा की योजना",
    "Route Planner": "मार्ग योजक",
    "Budget Tracker": "बजट ट्रैकर",
    "Offline Maps": "ऑफ़लाइन मानचित्र",
    "Settings & Privacy": "सेटिंग्स और प्राइवेसी",
    "Help & Support": "सहायता",
    "Profile": "प्रोफ़ाइल",
    "Create": "बनाएं",
    "Helpful": "सहायक",
    "Reply": "जवाब",
    "Language": "भाषा",
  },
  தமிழ்: {
    "Home": "முகப்பு",
    "Discover": "ஆராய்",
    "Trip Pulse": "பயண துடிப்பு",
    "PureFind": "ப்யூர்ஃபைண்ட்",
    "TripPods": "ட்ரிப்பாட்ஸ்",
    "Profile": "சுயவிவரம்",
    "AI Trip Builder": "ஏஐ பயண திட்டம்",
    "Plan My Journey": "என் பயணத் திட்டம்",
    "Route Planner": "வழி திட்டமிடுபவர்",
    "Budget Tracker": "பட்ஜெட் கண்காணிப்பாளர்",
    "Offline Maps": "ஆஃப்லைன் வரைபடங்கள்",
    "Settings & Privacy": "அமைப்புகள் மற்றும் தனியுரிமை",
    "Help & Support": "உதவி",
    "Create": "உருவாக்கு",
    "Helpful": "பயனுள்ளது",
    "Reply": "பதில்",
    "Language": "மொழி",
  },
  বাংলা: {
    "Home": "হোম",
    "Discover": "অন্বেষণ",
    "Trip Pulse": "ট্রিপ পালস",
    "PureFind": "পিউরফাইন্ড",
    "TripPods": "ট্রিপপডস",
    "Profile": "প্রোফাইল",
    "AI Trip Builder": "এআই ট্রিপ বিল্ডার",
    "Plan My Journey": "আমার ভ্রমণের পরিকল্পনা",
    "Route Planner": "রুট পরিকল্পনাকারী",
    "Budget Tracker": "বাজেট ট্র্যাকার",
    "Offline Maps": "অফলাইন মানচিত্র",
    "Settings & Privacy": "সেটিংস ও গোপনীয়তা",
    "Help & Support": "সাহায্য",
    "Create": "তৈরি করুন",
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

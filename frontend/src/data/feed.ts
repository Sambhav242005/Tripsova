export interface FeedPost {
  id: number;
  user: string;
  avatar: string;
  score: number;
  destId: string;
  location: string;
  category: string;
  time: string;
  expiry: string;
  content: string;
  helpful: number;
  comments: number;
  verified: boolean;
  _apiId?: string;
}

export const FEED_POSTS: FeedPost[] = [
  { id: 1, user: "Aryan M.", avatar: "AM", score: 92, destId: "spiti", location: "Spiti", category: "Food", time: "2h ago", expiry: "5 days", content: "Incredible Jain thali at Sharma Ji Ka Dhaba near the Kaza market. ₹180, no onion garlic, spotless kitchen. A must for Jain travellers passing through.", helpful: 34, comments: 7, verified: true },
  { id: 2, user: "Priya S.", avatar: "PS", score: 87, destId: "rishikesh", location: "Rishikesh", category: "Safety", time: "5h ago", expiry: "4 days", content: "Solo women — Lakshman Jhula is safe at night. Many cafes open till 11pm. Avoid the ghats after midnight. Beatles Café too crowded weekends — try Little Buddha instead.", helpful: 61, comments: 14, verified: true },
  { id: 3, user: "Rahul K.", avatar: "RK", score: 78, destId: "spiti", location: "Spiti", category: "Transport", time: "1h ago", expiry: "6 days", content: "Alert — small landslide near Losar on Kaza road. Take alternate route via Gramphoo. Roads otherwise clear. 8°C right now, carry warm layers.", helpful: 89, comments: 23, verified: false },
  { id: 4, user: "Sneha V.", avatar: "SV", score: 95, destId: "goa", location: "Goa", category: "Stay", time: "3h ago", expiry: "4 days", content: "Hidden gem — Bluebell Homestay in Assagao. ₹1,200/night, pure veg kitchen, rooftop garden. Book directly to avoid OTA fees.", helpful: 47, comments: 9, verified: true },
  { id: 5, user: "Dev P.", avatar: "DP", score: 83, destId: "bali", location: "Bali", category: "Weather", time: "6h ago", expiry: "1 day", content: "Ubud rainy each afternoon this week but mornings are gorgeous. Tegallalang rice terraces best before 9am — beat the crowds and the heat.", helpful: 28, comments: 5, verified: true },
];

export interface Story {
  id: number;
  user: string;
  avatar: string;
  own?: boolean;
  seen?: boolean;
  destId?: string;
}

export const STORIES: Story[] = [
  { id: 1, user: "You", avatar: "AK", own: true },
  { id: 2, user: "Sneha", avatar: "SV", seen: false, destId: "goa" },
  { id: 3, user: "Aryan", avatar: "AM", seen: false, destId: "spiti" },
  { id: 4, user: "Meera", avatar: "MN", seen: false, destId: "rishikesh" },
  { id: 5, user: "Dev", avatar: "DP", seen: true, destId: "bali" },
  { id: 6, user: "Priya", avatar: "PS", seen: true, destId: "rishikesh" },
];

export interface CommunityActivity {
  id: number;
  icon: string;
  text: string;
  time: string;
  color: string;
}

export const COMMUNITY_ACTIVITY: CommunityActivity[] = [
  { id: 1, icon: "BadgeCheck", text: "Little Buddha Café was Vegan-verified by 4 more travellers", time: "12m", color: "success" },
  { id: 2, icon: "Users", text: "Goa Beach Trip pod filled its last 2 spots", time: "38m", color: "secondary" },
  { id: 3, icon: "ShieldCheck", text: "Priya S. reached an Exemplary TrustScore of 95", time: "1h", color: "gold" },
  { id: 4, icon: "MapPin", text: "7 new safety updates posted from Spiti Valley", time: "2h", color: "accent" },
];

export interface CommunityCounter {
  icon: string;
  value: string;
  label: string;
}

export const COMMUNITY_COUNTER: CommunityCounter[] = [
  { icon: "Users", value: "12,842", label: "travellers exploring right now" },
  { icon: "Compass", value: "483", label: "active trips today" },
  { icon: "MapPin", value: "1,024", label: "destination updates this week" },
];

export interface StoryFeed {
  id: number;
  user: string;
  avatar: string;
  destId: string;
  place: string;
  title: string;
  excerpt: string;
  likes: number;
  gradient: string;
}

export const STORY_FEED: StoryFeed[] = [
  { id: 1, user: "Sneha V.", avatar: "SV", destId: "goa", place: "Assagao, Goa", title: "Three slow mornings in North Goa", excerpt: "Coffee at Bluebell, a scooter, and absolutely no plans. The susegad life is real.", likes: 312, gradient: "linear-gradient(150deg,#5A4F3E,#C2A878)" },
  { id: 2, user: "Aryan M.", avatar: "AM", destId: "spiti", place: "Kaza, Spiti", title: "The road to Chandratal nearly broke us", excerpt: "14,100 ft, no signal, the bluest lake I've ever seen. Worth every bone-rattling hour.", likes: 489, gradient: "linear-gradient(150deg,#1E2740,#5A6B96)" },
];

export interface Collection {
  id: number;
  title: string;
  count: number;
  by: string;
  gradient: string;
}

export const COLLECTIONS: Collection[] = [
  { id: 1, title: "Himalayan Escapes", count: 24, by: "Aryan M.", gradient: "linear-gradient(150deg,#1E2740,#5A6B96)" },
  { id: 2, title: "Veg-friendly Bali", count: 31, by: "Sneha V.", gradient: "linear-gradient(150deg,#1B3A47,#5E97A8)" },
  { id: 3, title: "Desert Nights, Rajasthan", count: 18, by: "Vikram S.", gradient: "linear-gradient(150deg,#6B5A38,#D4B483)" },
  { id: 4, title: "Slow Mornings, Rishikesh", count: 22, by: "Meera N.", gradient: "linear-gradient(150deg,#243A33,#6E8C7E)" },
];

export const CAT_COLORS: Record<string, string> = {
  Food: "#3E7D5A", Safety: "#B5483D", Transport: "#C0934A", Stay: "#4A7A95", Weather: "#7A6A9E", Crowd: "#9E5048",
};

export const INTERESTS = ["Photography", "Food Exploration", "Hiking", "Backpacking", "Luxury Travel", "Culture", "Adventure", "Wellness", "Nature", "Nightlife"];

export const LANGUAGES = ["English", "हिंदी", "தமிழ்", "বাংলা"];

export const USER_VERIFY: Record<string, string[]> = {
  "Aryan M.": ["email", "phone", "digilocker", "frequent"],
  "Priya S.": ["email", "phone", "digilocker", "govt", "premium"],
  "Rahul K.": ["email", "phone"],
  "Sneha V.": ["email", "phone", "digilocker", "frequent", "premium"],
  "Dev P.": ["email", "phone", "frequent"],
  "Meera N.": ["email", "phone", "digilocker", "govt"],
  "Vikram Singh": ["email", "phone", "digilocker", "govt", "frequent"],
  "Meera Nair": ["email", "phone", "digilocker", "govt"],
  "Arjun Thapa": ["email", "phone", "digilocker", "frequent"],
  "Fatima Khan": ["email", "phone", "digilocker", "govt", "premium"],
};

export const USER_PREMIUM = ["Priya S.", "Sneha V.", "Fatima Khan"];

export const getVerify = (name: string) => USER_VERIFY[name] || ["email"];
export const trustTier = (s: number) => s >= 90 ? "Exemplary" : s >= 80 ? "Highly Trusted" : s >= 60 ? "Trusted" : "Building Trust";

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

export interface Collection {
  id: number;
  title: string;
  count: number;
  by: string;
  gradient: string;
}

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

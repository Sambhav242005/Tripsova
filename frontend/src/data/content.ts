export interface Restaurant {
  id: number;
  name: string;
  destId: string;
  location: string;
  types: string[];
  verifiedBy: Record<string, number>;
  rating: number;
  reviews: number;
  tags: string[];
  distance: string;
  lastVerified: string;
  gradient: string;
}

export const RESTAURANTS: Restaurant[] = [
  { id: 1, name: "Sharma Ji Ka Dhaba", destId: "spiti", location: "Spiti", types: ["jain", "pure_veg"], verifiedBy: { jain: 18, pure_veg: 24 }, rating: 4.8, reviews: 234, tags: ["No onion garlic", "Separate kitchen", "Jain thali"], distance: "0.3 km", lastVerified: "2 days ago", gradient: "linear-gradient(150deg,#1B263B,#5E7C99)" },
  { id: 2, name: "Oasis Restaurant", destId: "jaisalmer", location: "Pushkar", types: ["vegan", "pure_veg"], verifiedBy: { vegan: 12, pure_veg: 9 }, rating: 4.6, reviews: 189, tags: ["100% Vegan", "Organic", "No dairy"], distance: "1.2 km", lastVerified: "5 days ago", gradient: "linear-gradient(150deg,#243A33,#6E8C7E)" },
  { id: 3, name: "Little Buddha Café", destId: "rishikesh", location: "Rishikesh", types: ["vegan", "gluten", "buddhist"], verifiedBy: { vegan: 32, gluten: 11, buddhist: 6 }, rating: 4.9, reviews: 412, tags: ["Fully vegan", "Gluten-free menu", "Rooftop seating"], distance: "0.8 km", lastVerified: "1 day ago", gradient: "linear-gradient(150deg,#2E2C44,#6E6E96)" },
  { id: 4, name: "Sai Kripa Restaurant", destId: "goa", location: "Coorg", types: ["pure_veg", "sattvic"], verifiedBy: { pure_veg: 14, sattvic: 8 }, rating: 4.5, reviews: 156, tags: ["South Indian", "Sattvic menu", "Thali specials"], distance: "2.1 km", lastVerified: "3 days ago", gradient: "linear-gradient(150deg,#1E2E2C,#5E847E)" },
  { id: 5, name: "Natraj Dining Hall", destId: "jaisalmer", location: "Jaisalmer", types: ["jain", "pure_veg", "sattvic"], verifiedBy: { jain: 21, pure_veg: 17, sattvic: 5 }, rating: 4.7, reviews: 298, tags: ["Jain thali", "No root veg", "Rajasthani"], distance: "0.5 km", lastVerified: "4 days ago", gradient: "linear-gradient(150deg,#6B5A38,#D4B483)" },
  { id: 6, name: "Green Bowl Café", destId: "goa", location: "Goa", types: ["vegan", "gluten"], verifiedBy: { vegan: 15, gluten: 7 }, rating: 4.4, reviews: 103, tags: ["Plant-based", "Açaí bowls", "Fresh juices"], distance: "1.5 km", lastVerified: "6 days ago", gradient: "linear-gradient(150deg,#5A4F3E,#C2A878)" },
  { id: 7, name: "Al-Raheem Kitchen", destId: "bali", location: "Hyderabad", types: ["halal", "everything"], verifiedBy: { halal: 29 }, rating: 4.7, reviews: 521, tags: ["Halal certified", "Biryani", "Family dining"], distance: "0.9 km", lastVerified: "1 day ago", gradient: "linear-gradient(150deg,#1B3A47,#5E97A8)" },
  { id: 8, name: "Ananda Satvik Kitchen", destId: "rishikesh", location: "Varanasi", types: ["sattvic", "pure_veg", "jain"], verifiedBy: { sattvic: 13, pure_veg: 11, jain: 9 }, rating: 4.8, reviews: 167, tags: ["No onion/garlic", "Sattvic thali", "Ayurvedic"], distance: "0.6 km", lastVerified: "3 days ago", gradient: "linear-gradient(150deg,#3A2E3A,#9A7E8E)" },
];

export interface Pod {
  id: number;
  destId: string;
  destination: string;
  dates: string;
  duration: string;
  budget: string;
  spots: number;
  size: number;
  host: string;
  hostAvatar: string;
  score: number;
  podRating: number;
  pastPods: number;
  style: string;
  verified: boolean;
  compatibility: number;
  intro: string;
  voice: string;
  interests: string[];
  description: string;
  gradient: string;
  groupFoods: string[];
}

export const PODS: Pod[] = [
  { id: 1, destId: "spiti", destination: "Spiti Valley", dates: "Oct 10–17", duration: "7 days", budget: "₹12,000", spots: 2, size: 5, host: "Aryan M.", hostAvatar: "AM", score: 92, podRating: 4.9, pastPods: 6, style: "Adventure", verified: true, compatibility: 87, intro: "Hey! I've done this circuit twice. Looking for an easy-going crew who love early starts and big mountains.", voice: "0:18 voice intro", interests: ["Photography", "Hiking", "Backpacking"], description: "Epic Spiti circuit — Kaza, Key Monastery, Chandratal Lake. Calm pace, lots of chai stops.", gradient: "linear-gradient(150deg,#1E2740,#5A6B96)", groupFoods: ["jain", "pure_veg"] },
  { id: 2, destId: "goa", destination: "Goa Beach Trip", dates: "Nov 1–5", duration: "4 days", budget: "₹8,000", spots: 3, size: 6, host: "Sneha V.", hostAvatar: "SV", score: 95, podRating: 5.0, pastPods: 11, style: "Friends", verified: true, compatibility: 92, intro: "North Goa, sunsets and good food. Mixed-diet group, everyone's welcome — we always find places for all of us.", voice: "0:24 voice intro", interests: ["Food Exploration", "Photography", "Nightlife"], description: "North Goa beaches, café-hopping, sunset vibes. Chill group, flexible plans.", gradient: "linear-gradient(150deg,#5A4F3E,#C2A878)", groupFoods: ["vegan", "everything", "pure_veg"] },
  { id: 3, destId: "andaman", destination: "Andaman Islands", dates: "Dec 20–28", duration: "8 days", budget: "₹18,000", spots: 1, size: 4, host: "Dev P.", hostAvatar: "DP", score: 83, podRating: 4.6, pastPods: 3, style: "Adventure", verified: false, compatibility: 74, intro: "Havelock, Neil Island, scuba. Looking for one calm ocean-lover to round out the group.", voice: "0:15 voice intro", interests: ["Adventure", "Nature", "Photography"], description: "Diving, island-hopping, slow evenings. One spot left.", gradient: "linear-gradient(150deg,#1B3A47,#5E97A8)", groupFoods: ["everything", "halal"] },
  { id: 4, destId: "jaisalmer", destination: "Udaipur & Jaisalmer", dates: "Oct 25–29", duration: "4 days", budget: "₹9,500", spots: 2, size: 5, host: "Priya S.", hostAvatar: "PS", score: 87, podRating: 4.8, pastPods: 5, style: "Cultural", verified: true, compatibility: 81, intro: "Lakes, palaces, bazaars and a desert night. Jain & sattvic food sorted throughout the route.", voice: "0:21 voice intro", interests: ["Culture", "Photography", "Food Exploration"], description: "Heritage cities at a relaxed pace, with a desert camp finale.", gradient: "linear-gradient(150deg,#3A2E3A,#9A7E8E)", groupFoods: ["jain", "sattvic"] },
];

export interface Guide {
  id: number;
  name: string;
  destId: string;
  location: string;
  speciality: string;
  languages: string[];
  rating: number;
  reviews: number;
  price: string;
  score: number;
  verified: boolean;
  tags: string[];
  gradient: string;
}

export const GUIDES: Guide[] = [
  { id: 1, name: "Vikram Singh", destId: "jaisalmer", location: "Jaisalmer", speciality: "Desert & Heritage", languages: ["Hindi", "English"], rating: 4.9, reviews: 312, price: "₹1,200/day", score: 94, verified: true, tags: ["Desert safari", "Fort tours", "Camel trek"], gradient: "linear-gradient(150deg,#6B5A38,#D4B483)" },
  { id: 2, name: "Meera Nair", destId: "rishikesh", location: "Munnar", speciality: "Nature & Tea Estates", languages: ["Malayalam", "English", "Tamil"], rating: 4.8, reviews: 189, price: "₹900/day", score: 91, verified: true, tags: ["Tea estate walks", "Bird watching", "Waterfalls"], gradient: "linear-gradient(150deg,#1E2E2C,#5E847E)" },
  { id: 3, name: "Arjun Thapa", destId: "spiti", location: "Manali", speciality: "Trekking & Adventure", languages: ["Hindi", "English", "Nepali"], rating: 4.7, reviews: 245, price: "₹1,500/day", score: 88, verified: true, tags: ["High altitude treks", "Camping", "Snow routes"], gradient: "linear-gradient(150deg,#1B263B,#5E7C99)" },
  { id: 4, name: "Fatima Khan", destId: "bali", location: "Agra", speciality: "History & Heritage", languages: ["Hindi", "English", "Urdu"], rating: 4.9, reviews: 421, price: "₹800/day", score: 96, verified: true, tags: ["Heritage walks", "History", "Photography spots"], gradient: "linear-gradient(150deg,#3A2E3A,#9A7E8E)" },
];

export interface FamilyMember {
  id: number;
  name: string;
  relation: string;
  avatar: string;
  location: string;
  lastSeen: string;
  status: string;
  trip: string | null;
  checkins: number;
}

export const FAMILY_MEMBERS: FamilyMember[] = [
  { id: 1, name: "Maa", relation: "Mother", avatar: "MA", location: "Manali", lastSeen: "10 min ago", status: "active", trip: "Manali Trip", checkins: 3 },
  { id: 2, name: "Papa", relation: "Father", avatar: "PA", location: "Delhi", lastSeen: "2 hrs ago", status: "home", trip: null, checkins: 0 },
];

export interface Hotel {
  id: number;
  name: string;
  destId: string;
  location: string;
  price: string;
  rating: number;
  reviews: number;
  traits: string[];
  gradient: string;
}

export const HOTELS: Hotel[] = [
  { id: 1, name: "Bluebell Homestay", destId: "goa", location: "Assagao, Goa", price: "₹1,200", rating: 4.8, reviews: 142, traits: ["Solo Female Friendly", "Family Friendly"], gradient: "linear-gradient(150deg,#5A4F3E,#C2A878)" },
  { id: 2, name: "The Himalayan Nest", destId: "spiti", location: "Kaza, Spiti", price: "₹1,800", rating: 4.7, reviews: 88, traits: ["Backpacker Friendly", "Solo Female Friendly"], gradient: "linear-gradient(150deg,#1E2740,#5A6B96)" },
  { id: 3, name: "Ganga View Retreat", destId: "rishikesh", location: "Tapovan, Rishikesh", price: "₹2,400", rating: 4.9, reviews: 203, traits: ["Family Friendly", "Wellness"], gradient: "linear-gradient(150deg,#243A33,#6E8C7E)" },
];

export interface Experience {
  id: number;
  name: string;
  destId: string;
  host: string;
  price: string;
  rating: number;
  duration: string;
  gradient: string;
}

export const EXPERIENCES: Experience[] = [
  { id: 1, name: "Sunrise kayak on the Ganga", destId: "rishikesh", host: "Meera N.", price: "₹600", rating: 4.9, duration: "2 hrs", gradient: "linear-gradient(150deg,#243A33,#6E8C7E)" },
  { id: 2, name: "Desert camp & folk night", destId: "jaisalmer", host: "Vikram S.", price: "₹1,500", rating: 4.8, duration: "Overnight", gradient: "linear-gradient(150deg,#6B5A38,#D4B483)" },
  { id: 3, name: "Rice-terrace cycle tour", destId: "bali", host: "Wayan G.", price: "₹900", rating: 4.9, duration: "Half day", gradient: "linear-gradient(150deg,#1B3A47,#5E97A8)" },
];

export interface Question {
  id: number;
  q: string;
  by: string;
  avatar: string;
  time: string;
  answers: number;
  upvotes: number;
  tags: string[];
  top: string;
}

export const QUESTIONS: Question[] = [
  { id: 1, q: "Best cafés in Bali for working remotely?", by: "Nikhil R.", avatar: "NR", time: "3h", answers: 14, upvotes: 42, tags: ["Bali", "Cafés"], top: "Crate in Canggu has fast wifi + great coffee. Outpost Ubud if you want a proper co-working vibe." },
  { id: 2, q: "Is Goa safe for solo female travelers in December?", by: "Aditi M.", avatar: "AM", time: "6h", answers: 23, upvotes: 88, tags: ["Goa", "Safety", "Solo"], top: "Yes — North Goa is busy and well-lit. Stick to Assagao/Anjuna, pre-book cabs at night, you'll be great." },
  { id: 3, q: "Hidden gems in Thailand away from the crowds?", by: "Sara T.", avatar: "ST", time: "2d", answers: 17, upvotes: 56, tags: ["Thailand", "Offbeat"], top: "Koh Mak and Nan province. Barely any tourists, incredibly kind locals, untouched beaches." },
];

export interface Notification {
  id: number;
  icon: string;
  text: string;
  time: string;
  unread: boolean;
  color: string;
}

export const NOTIFICATIONS: Notification[] = [
  { id: 1, icon: "UserPlus", text: "Sneha V. requested to join your Spiti pod", time: "8m", unread: true, color: "secondary" },
  { id: 2, icon: "Heart", text: "Priya S. and 23 others liked your Goa story", time: "40m", unread: true, color: "danger" },
  { id: 3, icon: "BadgeCheck", text: "Your DigiLocker verification was approved", time: "2h", unread: true, color: "success" },
  { id: 4, icon: "MessageCircle", text: "New message in \"Goa Beach Trip\" group chat", time: "5h", unread: false, color: "accent" },
  { id: 5, icon: "Sparkles", text: "Your AI itinerary for Rishikesh is ready", time: "1d", unread: false, color: "gold" },
];

export interface MatchRequest {
  id: number;
  name: string;
  avatar: string;
  score: number;
  pod: string;
  compatibility: number;
  foods: string[];
  dir: string;
  status?: string;
}

export const MATCH_REQUESTS: MatchRequest[] = [
  { id: 1, name: "Rohan D.", avatar: "RD", score: 90, pod: "Spiti Valley", compatibility: 88, foods: ["pure_veg"], dir: "incoming" },
  { id: 2, name: "Ishita B.", avatar: "IB", score: 84, pod: "Spiti Valley", compatibility: 79, foods: ["jain"], dir: "incoming" },
  { id: 3, name: "Goa Beach Trip", avatar: "SV", score: 95, pod: "Hosted by Sneha V.", compatibility: 92, foods: ["vegan"], dir: "outgoing", status: "Pending" },
];

export interface GroupChat {
  id: number;
  name: string;
  members: number;
  last: string;
  time: string;
  unread: number;
  gradient: string;
}

export const GROUP_CHATS: GroupChat[] = [
  { id: 1, name: "Spiti Valley Crew", members: 5, last: "Aryan: carry an extra power bank, no charging at Chandratal", time: "12m", unread: 3, gradient: "linear-gradient(150deg,#1E2740,#5A6B96)" },
  { id: 2, name: "Goa Beach Trip", members: 6, last: "Sneha: dinner at Thalassa on the 2nd, booked!", time: "1h", unread: 0, gradient: "linear-gradient(150deg,#5A4F3E,#C2A878)" },
];

export interface Event {
  id: number;
  title: string;
  date: string;
  going: number;
  place: string;
  gradient: string;
}

export const EVENTS: Event[] = [
  { id: 1, title: "Travellers' Meetup, Rishikesh", date: "Sat 14 Jun · 6 PM", going: 34, place: "Little Buddha Café", gradient: "linear-gradient(150deg,#243A33,#6E8C7E)" },
  { id: 2, title: "Full-moon beach cleanup", date: "Sun 22 Jun · 5 PM", going: 58, place: "Vagator Beach, Goa", gradient: "linear-gradient(150deg,#5A4F3E,#C2A878)" },
];

export interface Creator {
  id: number;
  name: string;
  avatar: string;
  type: string;
  followers: string;
  countries: number;
  trust: number;
  bio: string;
  gradient: string;
}

export const CREATORS: Creator[] = [
  { id: 1, name: "Sneha V.", avatar: "SV", type: "Creator", followers: "24.1k", countries: 9, trust: 95, bio: "Slow travel + vegetarian food across India. Sharing the susegad life.", gradient: "linear-gradient(150deg,#5A4F3E,#C2A878)" },
  { id: 2, name: "Vikram Singh", avatar: "VS", type: "Local Guide", followers: "8.4k", countries: 1, trust: 94, bio: "Born in Jaisalmer. Desert safaris, fort stories, and the best kachori in Rajasthan.", gradient: "linear-gradient(150deg,#6B5A38,#D4B483)" },
];

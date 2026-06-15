// Domain types for content entities. The demo/seed arrays that used to live here
// were removed — all of these are now sourced from the backend API at runtime.

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

export interface Notification {
  id: number;
  icon: string;
  text: string;
  time: string;
  unread: boolean;
  color: string;
}

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

export interface GroupChat {
  id: number;
  name: string;
  members: number;
  last: string;
  time: string;
  unread: number;
  gradient: string;
}

export interface Event {
  id: number;
  title: string;
  date: string;
  going: number;
  place: string;
  gradient: string;
}

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

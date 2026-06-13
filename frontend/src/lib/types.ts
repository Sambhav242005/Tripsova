// Backend API response types matching FastAPI Pydantic schemas

// --- Auth ---
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AuthUserResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  verification_status: string;
  trust_score: number;
  avatar_url?: string;
  created_at: string;
}

// --- Users ---
export interface UserUpdate {
  name?: string;
  phone?: string;
  avatar_url?: string;
  travel_style?: Record<string, unknown>;
  diet_preference?: Record<string, unknown>;
}

export interface UserResponse {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: string;
  verification_status: string;
  trust_score: number;
  travel_style?: Record<string, unknown>;
  diet_preference?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Destinations ---
export interface DestinationCreate {
  name: string;
  slug?: string;
  city: string;
  state: string;
  country: string;
  description: string;
  best_time_to_visit: string;
  average_budget_min: number;
  average_budget_max: number;
  safety_summary: string;
  weather_summary: string;
  crowd_level: string;
  internet_quality: string;
  latitude: number;
  longitude: number;
  photos?: string[];
  tags?: string[];
}

export interface DestinationResponse {
  id: string;
  name: string;
  slug: string;
  city: string;
  state: string;
  country: string;
  description: string;
  best_time_to_visit: string;
  average_budget_min?: number;
  average_budget_max?: number;
  safety_summary?: string;
  weather_summary?: string;
  crowd_level?: string;
  internet_quality?: string;
  offline_available: boolean;
  latitude?: number;
  longitude?: number;
  photos?: string[];
  tags?: string[];
  data_version: number;
  created_at: string;
  updated_at: string;
}

// --- Places ---
export interface PlaceCreate {
  destination_id?: string;
  name: string;
  slug?: string;
  type: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  price_range?: string;
  opening_hours?: Record<string, unknown>;
  photos?: string[];
  tags?: string[];
  diet_tags?: string[];
  phone?: string;
  website?: string;
  external_rating?: number;
  external_review_count?: number;
}

export interface PlaceResponse {
  id: string;
  destination_id?: string;
  name: string;
  slug: string;
  type: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  price_range?: string;
  opening_hours?: Record<string, unknown>;
  photos?: string[];
  tags?: string[];
  diet_tags?: string[];
  phone?: string;
  website?: string;
  external_rating?: number;
  external_review_count?: number;
  external_rating_source?: string;
  popularity_score: number;
  confidence_score: number;
  tripova_score: number;
  trust_score: number;
  safety_score: number;
  food_score: number;
  source?: string;
  is_partner_listed: boolean;
  is_offline_available: boolean;
  last_verified_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PlaceScoreResponse {
  finalScore: number;
  ratingScore?: number;
  reviewConfidence?: number;
  popularityScore: number;
  trustScore: number;
  travellerVerificationScore: number;
  freshnessScore: number;
  foodScore: number;
  safetyScore: number;
  penalties: string[];
  explanation: string;
}

export interface PaginatedList<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

// --- Food / PureFind ---
export interface FoodVerifyRequest {
  diet_tag: string;
  note?: string;
  media?: string[];
  confidence_score?: number;
}

export interface FoodVerificationResponse {
  id: string;
  place_id: string;
  user_id: string;
  diet_tag: string;
  note?: string;
  confidence_score: number;
  media?: string[];
  verified_at?: string;
  created_at: string;
}

export interface FoodPlaceResponse {
  id: string;
  name: string;
  slug: string;
  type: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  diet_tags?: string[];
  food_score: number;
  tripova_score: number;
  phone?: string;
  verified_count: number;
}

// --- Feed ---
export interface FeedPostCreate {
  destination_id?: string;
  place_id?: string;
  content: string;
  media?: string[];
  crowd_level?: string;
  weather_note?: string;
  safety_note?: string;
  price_note?: string;
  food_note?: string;
}

export interface FeedPostResponse {
  id: string;
  destination_id?: string;
  place_id?: string;
  user_id: string;
  content: string;
  media?: string[];
  crowd_level?: string;
  weather_note?: string;
  safety_note?: string;
  price_note?: string;
  food_note?: string;
  helpful_count: number;
  report_count: number;
  verification_score: number;
  expires_at?: string;
  created_at: string;
  user_name?: string;
  user_avatar?: string;
}

// --- Trips ---
export interface TripGenerateRequest {
  destination: string;
  days: number;
  budget: number;
  peopleCount: number;
  travelStyle?: string[];
  dietPreference?: string[];
  tripType: string;
  // Legacy mode (LAND/AIR/WATER) or a transport (CAR/TRAIN/BUS/FLIGHT/FERRY/…).
  travelMode?: TransportKey | "LAND" | "AIR" | "WATER";
  startDate?: string;
  offlineRequired?: boolean;
}

export type TransportKey =
  | "CAR" | "MOTORCYCLE" | "TRAIN" | "BUS" | "METRO"
  | "BICYCLE" | "WALK" | "FLIGHT" | "FERRY" | "CRUISE";

export interface RoutePoint { name: string; latitude: number; longitude: number; }
export interface RouteLeg { origin: RoutePoint; destination: RoutePoint; transport: TransportKey; }
export interface RoutePlanRequest {
  origin?: RoutePoint;
  destination?: RoutePoint;
  travelMode?: string;
  transport?: TransportKey;
  legs?: RouteLeg[];
  departureTime?: string;
  // Persistence: attach to an existing trip, or save as a new standalone trip.
  tripId?: string;
  save?: boolean;
}

// Smart journey: the engine picks the modes from just two city names.
export interface JourneyPlanRequest {
  origin: string;
  destination: string;
  roundTrip?: boolean;
  peopleCount?: number;
  budget?: number;
  departureTime?: string;
}

export interface JourneyCostLeg {
  transport: TransportKey;
  label?: string | null;
  from?: string | null;
  to?: string | null;
  distanceKm?: number | null;
  estimatedCost: number;
}

export interface JourneyCost {
  currency: string;
  people: number;
  perLeg: JourneyCostLeg[];
  total: number;
  perPerson: number;
}

export interface JourneyGeoResolved {
  resolvedName: string;
  source: string; // "db" | "nominatim"
}

export interface JourneyPlanResponse {
  origin: RoutePoint;
  destination: RoutePoint;
  roundTrip: boolean;
  peopleCount: number;
  chosenModes: TransportKey[];
  geocoding: { origin: JourneyGeoResolved; destination: JourneyGeoResolved };
  cost: JourneyCost;
  budget?: number | null;
  withinBudget?: boolean | null;
  // Full route_planner output (legs, segments, overnight/fuel stops, notes…).
  route: Record<string, unknown>;
}

export interface TripGenerateResponse {
  summary: string;
  itinerary: Record<string, unknown>[];
  recommendedPlaces: Record<string, unknown>[];
  recommendedFood: Record<string, unknown>[];
  estimatedBudget: Record<string, unknown>;
  safetyNotes: string[];
  offlinePackSuggested: boolean;
  travelMode?: string;
  fuelStops?: Record<string, unknown>[];
  aiGenerated?: boolean;
  tripId?: string;
}

export interface TripResponse {
  id: string;
  user_id: string;
  destination_id?: string;
  title?: string;
  trip_type?: string;
  days?: number;
  budget?: number;
  people_count?: number;
  travel_style?: Record<string, unknown>;
  diet_preference?: Record<string, unknown>;
  start_date?: string;
  offline_required: boolean;
  generated_plan?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Offline ---
export interface OfflinePackCreate {
  destinationId: string;
  tripId?: string;
  days?: number;
  includeFood?: boolean;
  includeEmergency?: boolean;
  includeMapMetadata?: boolean;
  includeFeedSummary?: boolean;
}

export interface OfflinePackResponse {
  id: string;
  user_id: string;
  destination_id?: string;
  trip_id?: string;
  title?: string;
  data_version: number;
  generated_at: string;
  expires_at?: string;
  size_bytes?: number;
}

export interface OfflinePackDownloadResponse {
  id: string;
  title?: string;
  destination: Record<string, unknown>;
  places: Record<string, unknown>[];
  itinerary?: Record<string, unknown>[];
  food_spots: Record<string, unknown>[];
  emergency_places: Record<string, unknown>[];
  safety_notes: string[];
  transport_notes?: string[];
  contacts: Record<string, unknown>[];
  feed_summary?: Record<string, unknown>[];
  coordinates: Record<string, unknown>;
  map_metadata?: Record<string, unknown>;
  generated_at: string;
  expires_at?: string;
  data_version: number;
}

// --- TripPods ---
export interface TripPodCreate {
  destination_id: string;
  title: string;
  start_date: string;
  end_date?: string;
  budget?: number;
  travel_style?: string[];
  max_members?: number;
  gender_preference?: string;
  verification_required?: boolean;
}

export interface TripPodResponse {
  id: string;
  creator_id: string;
  destination_id?: string;
  title?: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  travel_style?: Record<string, unknown>;
  max_members?: number;
  gender_preference?: string;
  verification_required?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

// --- Trust ---
export interface TrustScoreResponse {
  entity_type: string;
  entity_id: string;
  score: number;
  components: Record<string, unknown>;
  events: Record<string, unknown>[];
}

// --- Partners ---
export interface PartnerApplyRequest {
  name: string;
  type: string;
  phone: string;
  email?: string;
  location?: string;
}

export interface PartnerResponse {
  id: string;
  user_id?: string;
  name: string;
  type: string;
  phone: string;
  email?: string;
  location?: string;
  verification_status: string;
  trust_score: number;
  response_rate?: number;
  cancellation_rate?: number;
  created_at: string;
  updated_at: string;
}

// --- Bookings ---
export interface BookingCreate {
  listing_id?: string;
  partner_id?: string;
  destination_id?: string;
  start_date?: string;
  end_date?: string;
  metadata?: Record<string, unknown>;
}

export interface BookingResponse {
  id: string;
  user_id: string;
  listing_id?: string;
  partner_id?: string;
  destination_id?: string;
  amount?: number;
  commission_amount?: number;
  currency: string;
  status: string;
  start_date?: string;
  end_date?: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// --- Deep Review ---
export interface DeepReviewRequest {
  placeId?: string;
  destinationId?: string;
  placeName: string;
  destinationName: string;
  userQuestion?: string;
  includeReddit?: boolean;
  includeWeb?: boolean;
}

export interface DeepReviewResponse {
  overallSummary: string;
  positiveSignals: string[];
  negativeSignals: string[];
  repeatedComplaints: string[];
  safetyWarnings: string[];
  foodWarnings: string[];
  crowdWarnings: string[];
  sentiment: string;
  sentimentScore: number;
  sentimentMagnitude: number;
  confidenceScore: number;
  sourcesUsed: Record<string, unknown>[];
  lastCheckedAt: string;
}

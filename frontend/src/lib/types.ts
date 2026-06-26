// Backend API response types matching FastAPI Pydantic schemas

// --- Budget ---
export interface ExpenseResponse {
  id: string;
  description: string;
  amount: number;
  category?: string | null;
  paid_by: string;
  split: string[];
  currency: string;
  created_at: string;
}

export interface Settlement {
  from: string;
  to: string;
  amount: number;
}

export interface BudgetSummary {
  expenses: ExpenseResponse[];
  members: string[];
  total: number;
  per_person: number;
  balances: Record<string, number>;
  settlements: Settlement[];
  currency: string;
}

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
  tags?: string[];                 // descriptive cuisine/type tags (not a diet claim)
  diet_source?: "community" | "suggested" | null;
  food_score: number;
  tripova_score: number;
  phone?: string;
  verified_count: number;
  distance_km?: number;
  photos?: string[];
  source?: string;
  is_community_verified: boolean;
  is_diet_trusted: boolean;
}

export interface FoodDiscoverRequest {
  lat: number;
  lng: number;
  radius_km?: number;
  diet_tag?: string[];
  destination_id?: string;
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
  destination_name?: string;
}

// --- Trips ---
export interface TripGenerateRequest {
  destination: string;
  // Optional starting point; when set, the backend computes the getting-there leg.
  origin?: string;
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
  | "BICYCLE" | "WALK" | "FLIGHT";
  // FERRY | CRUISE — removed; water transport module on hold

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
  id?: string | null;             // set when the journey was saved to history
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

export type JourneyStatus = "pending" | "ready" | "failed";

export interface JourneyListItem {
  id: string;
  origin: string;
  destination: string;
  roundTrip: boolean;
  peopleCount: number;
  status: JourneyStatus;
  total?: number | null;
  chosenModes: TransportKey[];
  createdAt: string;
}

export interface JourneyRecordResponse {
  id: string;
  origin: string;
  destination: string;
  roundTrip: boolean;
  peopleCount: number;
  budget?: number | null;
  status: JourneyStatus;
  result?: JourneyPlanResponse | null;
  error?: string | null;
  createdAt: string;
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
  gettingThere?: GettingThere | null;
  aiGenerated?: boolean;
  tripId?: string;
}

// The getting-there leg, present only when the trip request carried an `origin`.
// On success it has the route fields; on failure it carries just a `note` (and maybe
// origin/destination/transport) explaining why it couldn't be planned.
export interface GettingThere {
  origin?: RoutePoint;
  destination?: RoutePoint;
  transport?: TransportKey;
  distanceKm?: number | null;
  durationHours?: number | null;
  departureTime?: string | null;
  arrivalTime?: string | null;
  fuelStops?: Record<string, unknown>[];
  travelCost?: number | null;
  // Real train identity for a TRAIN leg, from the datameet/railways dataset.
  // scheduled* are present only when a direct timetable entry was matched.
  trainNumber?: string | null;
  trainName?: string | null;
  scheduledDeparture?: string | null;
  scheduledArrival?: string | null;
  // Real flight identity for a FLIGHT leg, from the configured provider.
  // Present only when a flight was matched; priceText is indicative.
  flightNumber?: string | null;
  airline?: string | null;
  fromAirport?: string | null;
  toAirport?: string | null;
  priceText?: string | null;
  // Full route_planner output (legs/segments/stops) for drawing the map.
  route?: Record<string, unknown> | null;
  note?: string | null;
  originQuery?: string;
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
  destination_id?: string;
  title: string;
  start_date?: string;
  end_date?: string;
  budget?: number;
  travel_style?: string[] | Record<string, unknown>;
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
  travel_style?: string[] | Record<string, unknown>;
  max_members?: number;
  gender_preference?: string;
  verification_required?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  creator_name?: string;
  creator_avatar?: string;
  my_member_status?: "REQUESTED" | "APPROVED" | "REJECTED" | "LEFT" | string | null;
  my_member_id?: string | null;
  pending_request_count?: number;
  pending_requests?: TripPodPendingRequest[];
}

export interface TripPodPendingRequest {
  member_id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  status: string;
  created_at: string;
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

export interface RedditReview {
  title: string;
  snippet: string;
  insight: string;
  url: string;
  /** "reddit" or, for open-web hits, the result's domain (e.g. "tripadvisor.com"). */
  source?: string;
  subreddit?: string;
  sentiment: string;
  createdDate?: string;
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
  topReviews: RedditReview[];
  lastCheckedAt: string;
}

// --- Transit (BMTC / City Bus) ---
export interface TransitRouteSuggestion {
  route_id: number;
  route_no: string;
  route_name?: string | null;
}

export interface TransitStopSuggestion {
  station_id: number;
  station_name: string;
  latitude: number;
  longitude: number;
}

export interface TransitSearchResult {
  query: string;
  routes: TransitRouteSuggestion[];
  stops: TransitStopSuggestion[];
}

export interface TransitLiveBus {
  vehicle_id: number;
  vehicle_number: string;
  latitude: number;
  longitude: number;
  heading: number;
  eta?: string | null;
  service_type?: string | null;
  last_refresh?: string | null;
}

export interface TransitRouteStation {
  station_id: number;
  station_name: string;
  latitude: number;
  longitude: number;
}

export interface TransitRouteDirection {
  stations: TransitRouteStation[];
  live_buses: TransitLiveBus[];
}

export interface TransitLiveRoute {
  route_id: number;
  route_no: string;
  route_name: string;
  up: TransitRouteDirection;
  down?: TransitRouteDirection | null;
  fetched_at: string;
}

export interface TransitVehicleTrack {
  vehicle_id: number;
  vehicle_number: string;
  route_no: string;
  latitude: number;
  longitude: number;
  current_stop?: string | null;
  next_stop?: string | null;
  heading: number;
}

export interface TransitVehicleTrip {
  route_no: string;
  vehicle_number: string;
  stops: {
    station_id?: number;
    station_name?: string;
    latitude?: number;
    longitude?: number;
    scheduled_arrival?: string;
    actual_arrival?: string;
    eta?: string;
  }[];
  live_location?: TransitVehicleTrack | null;
}

export interface TransitAllRoute {
  route_id: number;
  route_no: string;
  route_name: string;
  from_station: string;
  to_station: string;
}

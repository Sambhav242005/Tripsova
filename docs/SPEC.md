# Tripova — Product Specification

> **Version:** 1.0.0  
> **Last updated:** 2026-06-21  
> **Tagline:** *Powered by Travellers*

---

## 1. Product Overview

Tripova is an **India-first, globally scalable travel/community app** that helps users plan safer, smarter, and more trustworthy trips. It replaces the need for multiple travel apps by combining live traveller-verified data, AI trip planning, verified companion matching, diet-aware food discovery, offline trip packs, and booking-ready local partner listings — all in one platform.

### 1.1 Problem Statement

| Problem | How Tripova Solves It |
|---------|----------------------|
| Outdated travel information | Live Destination Feed with freshness-scored traveller posts |
| Too many apps needed for one trip | All-in-one: plan, discover, book, navigate offline |
| Lack of trustworthy local recommendations | TrustScore-ranked places, no ads, no fake reviews |
| Difficulty finding verified companions | TripPod — verified traveller matching |
| Safety concerns for solo travellers | TrustScore + safety reports + TripPod companions |
| Difficulty finding Jain/Pure Veg/Vegan/Halal food | PureFind — diet-tagged, community-verified food discovery |
| Low-network problems during trips | JSON Offline Trip Packs with full trip data |
| Confusing booking and partner discovery | Verified local partners with booking lifecycle |

### 1.2 Target Users

- **Solo travellers** (India and abroad) seeking safety and companionship
- **Families** needing reliable, diet-aware travel planning
- **Adventure travellers** (Spiti, Kasol, Himachal, etc.)
- **Food-conscious travellers** (Jain, Pure Veg, Vegan, Halal)
- **Budget travellers** who want transparent cost estimates
- **International tourists** visiting India

---

## 2. Core Features — Specifications

### 2.1 Live Destination Feed

| Property | Specification |
|----------|---------------|
| **Purpose** | Real-time traveller-updated destination intelligence |
| **Data source** | User-generated posts with freshness scoring |
| **Feed order** | CityFeed → Trip Pulse → TripPod → PureFind |
| **Post fields** | Content, location, category, crowd level, safety note, helpful count, report count, verification score |
| **Freshness decay** | ≤30d: 100%, ≤90d: 60%, ≤180d: 30%, >180d: 10% |
| **Helpful/report** | Users can mark posts Helpful (+1) or Report (triggers safety score penalty) |

### 2.2 AI Trip Builder

| Property | Specification |
|----------|---------------|
| **Purpose** | Generate a complete day-by-day itinerary from user inputs |
| **AI provider** | OpenAI-compatible API (Ollama, OpenRouter, OpenAI) — configurable |
| **Fallback** | Rule-based planner when AI is disabled/unavailable |
| **Input fields** | Destination (required), Days, Budget, Group Type, Interests, Diet preferences |
| **Output** | Day-by-day plan (morning/afternoon/evening), recommended places, food, estimated budget, safety notes, pro tips |
| **Endpoint** | `POST /api/trips/generate` (auth required) |
| **Rate limit** | Subject to global rate limit |

### 2.3 TripPod — Verified Companion Matching

| Property | Specification |
|----------|---------------|
| **Purpose** | Match verified travellers heading to the same destination |
| **Pod lifecycle** | OPEN → FULL → COMPLETED / CANCELLED |
| **Member lifecycle** | REQUESTED → APPROVED / REJECTED → LEFT |
| **Trust integration** | Members displayed with TrustScore; only verified users can join |
| **Capacity** | Configurable per pod (default: 5) |
| **Creation** | Any verified user can create a TripPod |

### 2.4 TrustScore

| Property | Specification |
|----------|---------------|
| **Scope** | Users, places, partners, feed posts, food verifications, TripPods |
| **Base score** | 50 (neutral) — accumulates via TrustEvent score deltas |
| **Scoring factors** | Popularity (25%), TrustScore (25%), Traveller Verification (20%), Freshness (10%), Sentiment (10%), Food Score (5%), Safety (5%) |
| **Penalties** | High report count (-15), safety warning (-10), low source confidence (-5), stale data >365d (-10) |
| **Range** | 0–100, clamped |
| **Explainability** | API responses include score breakdown with human-readable explanation |
| **Ranking rule** | 4.9 rating with 12 reviews does NOT automatically beat 4.4 with 6,000 reviews — multi-factor weighted |

### 2.5 PureFind — Food Discovery

| Property | Specification |
|----------|---------------|
| **Purpose** | Find diet-tagged, community-verified food places |
| **Diet tags** | PURE_VEG, JAIN, VEGAN, HALAL, EGGLESS, NO_ONION_GARLIC |
| **Verification** | Community-verified (N users confirm diet compliance) |
| **Scoring** | `food_score = min(100, verification_count * 20)` |
| **Ranking** | Integrated into Tripova multi-factor ranking formula |
| **Display** | Badges per diet tag with verification count |

### 2.6 Offline Trip Packs

| Property | Specification |
|----------|---------------|
| **Purpose** | Full trip data that works without internet |
| **Format** | JSON (not tile-based maps) |
| **Max size** | Configurable via `OFFLINE_PACK_MAX_SIZE_MB` (default: 50 MB) |
| **Contents** | Destination summary, itinerary, saved places, food spots, emergency places, safety notes, transport notes, coordinates, map metadata, data version |
| **Data sources** | Tripova database (no external tile servers) |
| **Future** | OpenMapTiles + MBTiles + MapLibre for vector tile offline maps |

### 2.7 BMTC Transit Tracker

| Property | Specification |
|----------|---------------|
| **Purpose** | Live Bengaluru city bus tracking |
| **Data source** | Reverse-engineered from `bmtcmobileapp.karnataka.gov.in` |
| **Provider type** | Pure proxy — no database models |
| **Endpoints** | Search routes/stops, live route detail (stations + live buses), vehicle tracking, all routes list |
| **Cache** | In-process dict, 120s TTL for search results |
| **Rate limiting** | No bulk requests; respect BMTC servers |
| **City scope** | Bengaluru-only (extensible via new providers) |
| **Upstream API** | All POST, JSON body, `lan: en` header, 15s timeout |

### 2.8 Geo-Lock

| Property | Specification |
|----------|---------------|
| **Purpose** | Restrict API access by geographic location |
| **Geo provider** | `api.country.is` (free, no API key) |
| **Cache** | In-memory, 1-hour TTL |
| **Default** | India-only (`IN`) |
| **Modes** | `strict=false` (allow unknown locations), `strict=true` (block unknown) |
| **Exempt paths** | `/health`, `/docs`, `/openapi.json`, `/redoc`, `/` |
| **Application** | ASGI middleware (global) + per-endpoint dependency `require_india_only` |
| **Private IPs** | 10.x, 192.168.x, 127.x → unknown location |

---

## 3. Architecture

### 3.1 Backend

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | FastAPI (Python 3.11+) | Async, auto OpenAPI docs |
| Database | PostgreSQL 16 + PostGIS | SQLite+aiosqlite for local dev |
| ORM | SQLAlchemy 2.0 (async) | Centralized models in `users/models.py` |
| Migrations | Alembic | Async-compatible env |
| Auth | JWT (python-jose) + bcrypt | Access + refresh token rotation |
| Validation | Pydantic v2 | `model_dump()`, `model_validate()` |
| Geospatial | GeoAlchemy2 + Geography | (Schema stores WKT for now) |
| Testing | pytest + pytest-asyncio | 27 test files |
| Linting | Ruff / Black | Line-length 120 |
| Server | Uvicorn | Lifespan-managed startup/shutdown |

#### 3.1.1 Middleware Stack (execution order)

1. **RateLimitMiddleware** — token-bucket per client IP
2. **RequestLoggingMiddleware** — logs method, path, status, duration
3. **CORSMiddleware** — configured origins
4. **GeoLockMiddleware** — country-based access control
5. **Global exception handler** — catches unhandled errors, returns 500

#### 3.1.2 Module Pattern

```
module/
├── __init__.py
├── models.py        # SQLAlchemy ORM (shared in users/models.py for most)
├── schemas.py       # Pydantic v2 request/response schemas
├── service.py       # Business logic
├── routes.py        # FastAPI APIRouter
└── (extra files)    # ranking.py, ai_provider.py, bmtc_provider.py, etc.
```

### 3.2 Frontend

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js (forked) | Client components with `"use client"` |
| Icons | lucide-react | Accessed via shared `Icon` component by string name |
| Styling | Inline `style={{}}` objects | Theme token object `t` threaded as prop |
| State | React context | AppProvider (tab, sub, dest, dark, lang) |
| URL routing | `window.history.replaceState` | Syncs tab/sub/dest to `?param=` |
| Auth context | Custom AuthProvider | JWT token management |

#### 3.2.1 Screen Map

| Route Param | Component | Description |
|-------------|-----------|-------------|
| `?tab=home` | HomeScreen | Feed: CityFeed → Trip Pulse → TripPod → PureFind |
| `?tab=discover` | DiscoverScreen | Destination catalog |
| `?tab=purefind` | PureFindScreen | Diet-aware food |
| `?tab=pods` | PodsScreen | TripPods |
| `?tab=profile` | ProfileScreen | User profile |
| `?sub=plan` | PlanScreen | AI trip builder |
| `?sub=journey` | JourneyScreen | Multi-leg journey |
| `?sub=route` | RouteScreen | Route planner |
| `?sub=transit` | TransitScreen | BMTC bus tracker |
| `?sub=budget` | BudgetScreen | Budget tracker |
| `?sub=maps` | OfflineMapsScreen | Offline packs |
| `?sub=settings` | SettingsScreen | Settings |
| `?sub=support` | SupportScreen | Help |
| `?dest=<id>` | DestinationHub | Per-destination feed |

---

## 4. API Specification

### 4.1 Authentication

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/register` | POST | No | Create account |
| `/api/auth/login` | POST | No | Get tokens |
| `/api/auth/refresh` | POST | Refresh token | Rotate access token |
| `/api/auth/logout` | POST | Yes | Revoke refresh token |
| `/api/auth/me` | GET | Yes | Current user info |

### 4.2 Users

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/users/me` | GET/PATCH | Yes | Get/update profile |
| `/api/users/me/preferences` | GET/PUT | Yes | Travel preferences |

### 4.3 Destinations

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/destinations` | GET | No | List (paginated) |
| `/api/destinations/{slug_or_id}` | GET | No | Detail |

### 4.4 Places

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/places` | GET | No | List with ranking |
| `/api/places/{id_or_slug}` | GET | No | Detail |
| `/api/places/{id}/trust` | GET | No | TrustScore breakdown |

### 4.5 Food (PureFind)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/food` | GET | No | List diet-filtered food |
| `/api/food/verify` | POST | Yes | Submit diet verification |

### 4.6 Feed

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/feed` | GET | No | List posts |
| `/api/feed` | POST | Yes | Create post |
| `/api/feed/{id}/helpful` | POST | Yes | Mark helpful |
| `/api/feed/{id}/report` | POST | Yes | Report post |

### 4.7 Trips

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/trips/generate` | POST | Yes | AI/rule-based itinerary |
| `/api/trips/my` | GET | Yes | User's saved trips |
| `/api/trips/{id}` | GET | Yes | Trip detail |
| `/api/trips/journey/plan` | POST | Yes | Multi-leg journey planner |
| `/api/trips/journey/feasibility` | POST | Yes | Route feasibility check |

### 4.8 TripPods

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/trippods` | GET | No | List pods |
| `/api/trippods` | POST | Yes | Create pod |
| `/api/trippods/{id}` | GET/PATCH | Yes | Detail/update |
| `/api/trippods/{id}/join` | POST | Yes | Request to join |
| `/api/trippods/{id}/respond` | POST | Yes | Approve/reject member |

### 4.9 Trust

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/trust/score` | GET | No | TrustScore lookup |
| `/api/trust/events` | GET | Yes | Score history |

### 4.10 Partners

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/partners` | GET | No | List partners |
| `/api/partners/{id}` | GET | No | Partner detail |

### 4.11 Bookings

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/bookings` | GET/POST | Yes | List/create bookings |
| `/api/bookings/{id}` | GET/PATCH | Yes | Detail/update |
| `/api/bookings/{id}/cancel` | POST | Yes | Cancel |

### 4.12 Offline

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/offline/packs` | GET/POST | Yes | List/create packs |
| `/api/offline/packs/{id}` | GET/DELETE | Yes | Download/delete |
| `/api/offline/packs/{id}/sync` | POST | Yes | Sync pack |

### 4.13 Maps

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/maps/geocode` | GET | No | Forward geocode |
| `/api/maps/reverse` | GET | No | Reverse geocode |
| `/api/maps/nearby` | GET | No | Nearby POIs |

### 4.14 Transit (BMTC)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/transit/search?q=` | GET | No | Search routes/stops |
| `/api/transit/routes/{id}` | GET | No | Live route detail |
| `/api/transit/vehicle/{id}` | GET | No | Vehicle tracking |
| `/api/transit/all-routes` | GET | No | All routes list |

### 4.15 Admin

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/admin/*` | Various | Admin | Dashboard, management |

### 4.16 Data Sources

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/datasources/ingest` | POST | Admin | Trigger data ingestion |
| `/api/datasources/deep-review` | POST | Admin | Submit Reddit deep review query |

### 4.17 General

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | App info (name, version, status) |
| `/health` | GET | Health check |
| `/docs` | GET | Swagger UI |

---

## 5. Data Model Specification

### 5.1 Entity Relationship Summary

All models defined in `app/modules/users/models.py`.

```
User ──has_many──> FeedPost
User ──has_many──> Trip (created)
User ──has_many──> TripPodMember (member of)
User ──has_many──> FoodVerification (verified by)
User ──has_many──> TrustEvent (target)
User ──has_many──> DeepReviewQuery

Destination ──has_many──> Place
Destination ──has_many──> FeedPost
Destination ──has_many──> Trip

Place ──has_many──> PlaceSource
Place ──has_many──> FoodVerification
Place ──has_many──> FeedPost
Place ──has_many──> DeepReviewQuery
Place ──belongs_to──> Destination

TripPod ──has_many──> TripPodMember

Partner ──has_many──> Listing

Listing ──has_many──> Booking

OfflinePack ──belongs_to──> User (created for)
OfflineSyncLog ──belongs_to──> OfflinePack
```

### 5.2 Key Fields Per Entity

| Entity | Key Columns |
|--------|-------------|
| **User** | id (UUID), name, email, phone, role (USER/LOCAL_PARTNER/ADMIN), verification_status, trust_score, avatar_url, diet_preference (JSON), travel_style (JSON) |
| **Destination** | id (UUID), slug (unique), name, country, description, best_time_to_visit, safety_summary, tags (JSON), lat, lng, geom_wkt |
| **Place** | id (UUID), slug, name, place_type (enum), description, external_rating, external_review_count, diet_tags (JSON), food_score, safety_score, last_verified_at, lat, lng, geom_wkt, destination_id (FK) |
| **FeedPost** | id (UUID), content, crowd_level, safety_note, helpful_count, report_count, verification_score, user_id (FK), destination_id (FK), place_id (FK) |
| **Trip** | id (UUID), title, summary, itinerary (JSON), budget, people_count, trip_type, travel_style (JSON), diet_preference (JSON), user_id (FK), destination_id (FK) |
| **TripPod** | id (UUID), title, destination, max_members, status (enum), creator_id (FK) |
| **TripPodMember** | id (UUID), pod_id (FK), user_id (FK), status (enum), requested_at |
| **FoodVerification** | id (UUID), place_id (FK), diet_tag (enum), verified_by (FK), created_at |
| **Partner** | id (UUID), name, partner_type (enum), contact_email, contact_phone, verified, trust_score |
| **Listing** | id (UUID), partner_id (FK), place_id (FK), status (enum), commission_pct |
| **Booking** | id (UUID), listing_id (FK), user_id (FK), status (enum), date_from, date_to, total_cost, guests |
| **TrustEvent** | id (UUID), entity_type, entity_id, score_delta, reason, created_by (FK) |
| **OfflinePack** | id (UUID), user_id (FK), destination_id (FK), pack_data (JSON), size_bytes, version, expires_at |
| **DeepReviewQuery** | id (UUID), place_id (FK), source_url, title, summary, sentiment, sentiment_score, confidence, fetched_at, expires_at |

---

## 6. Multi-Factor Ranking Algorithm

Places are ranked using a weighted composite score, NOT by star rating alone.

### 6.1 Score Components

| Component | Weight | Source |
|-----------|--------|--------|
| Popularity Score | 25% | Formula: `rating × 0.60 + review_confidence × 0.40` |
| TrustScore | 25% | Accumulated trust events on the entity |
| Traveller Verification | 20% | Feed post count × 10 + helpful sum × 2 + verifications × 15 |
| Freshness Score | 10% | ≤30d: 100, ≤90d: 60, ≤180d: 30, >180d: 10 |
| Sentiment Score | 10% | VADER on feed posts + deep reviews (mapped to 0–100) |
| Food Score | 5% | `min(100, verification_count × 20)` |
| Safety Score | 5% | `clamp(100 − report_count × 5, 0, 100)` |

### 6.2 Penalties

| Condition | Penalty |
|-----------|---------|
| Report count > 5 | −15 points |
| Safety score < 30 | −10 points |
| Source confidence < 40 | −5 points |
| Stale data (>365 days since verification) | −10 points |

---

## 7. Authentication & Security

### 7.1 Auth Flow

```
Register → Login → { access_token (24h), refresh_token (30d) }
                       ↓
              Bearer token in Authorization header
                       ↓
              Token refresh before expiry
                       ↓
              Logout revokes refresh token
```

### 7.2 Security Measures

| Measure | Implementation |
|---------|---------------|
| Password hashing | bcrypt via `passlib` |
| JWT signing | `python-jose` with HS256 |
| Token expiry | Access: 24h, Refresh: 30d |
| Refresh rotation | Old refresh token revoked on use |
| Rate limiting | Token-bucket: 120/min global, 10/min auth |
| Geo-lock | IP-based country restriction (default: India) |
| CORS | Whitelist-only origins |
| Request logging | All requests logged (method, path, status, duration) |
| Error handling | Global handler — no stack traces leaked |

### 7.3 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@tripova.com` | `password123` |
| Traveller | `traveller@tripova.com` | `password123` |
| Partner | `partner@tripova.com` | `password123` |

---

## 8. Data Sources Strategy

### 8.1 Primary (Tripova-native)

- User-generated feed posts with verification
- User-based food verifications (PureFind)
- Partner listings and booking reviews
- TripPod reviews
- TrustScore events

### 8.2 Open/Free (no API key)

| Source | Data | Integration |
|--------|------|-------------|
| OpenStreetMap | POIs, roads, buildings | Overpass API |
| Geofabrik | Regional OSM extracts | Download + ingest |
| Wikivoyage | Travel guides, destination info | Wikivoyage API |
| Wikidata | Structured entity data | Wikidata Query Service |
| OpenTripMap | POIs, attractions | (Future) |
| OpenFreeMap | Raster/vector map tiles | Direct tile URLs (no API key) |
| Nominatim | Geocoding | Free with usage guidelines |
| Photon (Komoot) | Geocoding autocomplete | Free |

### 8.3 Optional Enrichment (API key)

| Source | Data | Integration |
|--------|------|-------------|
| Google Places | Extended POI data | `google_places_provider.py` |
| Weather APIs | Live weather | (Future) |
| Ola Maps | Geocoding, tiles, directions | 500K free calls/mo (India) |
| Mapbox | Styled tiles, routing | Free tier available |

### 8.4 Deep Review Only (Reddit)

- Used only for corroboration, never as primary data
- Reddit is queried when user asks "is this place actually good?"
- Only stored fields: source URL, title, short summary, sentiment, confidence, fetched date, expiry
- VADER sentiment analysis applied

---

## 9. Transit Data Flow

```
User (frontend)
  │
  ▼
/api/transit/search?q=500A
  │
  ▼
transit/routes.py ──> transit/service.py (checks 120s cache)
  │                        │
  │                   [cache miss]
  │                        │
  ▼                        ▼
bmtc_provider.py ──> POST https://bmtcmobileapi.karnataka.gov.in/WebAPI/…
  │
  ▼
Response mapped to Pydantic schemas → JSON to frontend
```

---

## 10. Offline Strategy

### 10.1 MVP — JSON Offline Trip Packs

Generated on demand and stored in the database as JSON. Contents:

```json
{
  "destination": { "name": "Manali", "summary": "...", "country": "India" },
  "itinerary": [ { "day": 1, "morning": "...", "afternoon": "...", "evening": "..." } ],
  "saved_places": [ { "name": "Hadimba Temple", "lat": 32.24, "lng": 77.18, ... } ],
  "food_spots": [ { "name": "Cafe 1947", "diet_tags": ["PURE_VEG"], ... } ],
  "emergency_places": [ { "name": "Kullu Hospital", ... } ],
  "safety_notes": [ "Avoid solo trekking after dark" ],
  "transport_notes": [ "HRTC buses from Delhi (14h)" ],
  "coordinates": { "lat": 32.24, "lng": 77.18 },
  "data_version": "1.0.0"
}
```

### 10.2 Future — Vector Tile Offline Maps

Legally generated OSM-compatible vector tiles via OpenMapTiles → MBTiles → MapLibre rendering (not bulk-downloaded from public tile servers).

---

## 11. Configuration Reference

All configuration via `.env` file, loaded by `app/config.py` (pydantic-settings v2).

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `sqlite+aiosqlite:///./tripsova_dev.db` | Database connection string |
| `JWT_SECRET` | **Yes** | — | JWT signing key |
| `JWT_ALGORITHM` | No | `HS256` | JWT algorithm |
| `JWT_EXPIRY_HOURS` | No | `24` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRY_DAYS` | No | `30` | Refresh token lifetime |
| `GOOGLE_PLACES_API_KEY` | No | — | (Optional) Google Places |
| `AI_ENABLED` | No | `false` | Enable AI trip generation |
| `AI_API_URL` | No | `http://localhost:11434/v1/chat/completions` | AI endpoint |
| `AI_API_KEY` | No | — | AI API key |
| `AI_MODEL` | No | `gemma4:31b-cloud` | Model name |
| `AI_TIMEOUT_SECONDS` | No | `120` | AI request timeout |
| `CORS_ORIGINS` | No | (see .env.example) | Allowed origins |
| `DEBUG` | No | `false` | Debug mode |
| `OFFLINE_PACK_MAX_SIZE_MB` | No | `50` | Offline pack size limit |
| `RATE_LIMIT_ENABLED` | No | `true` | Rate limiting switch |
| `RATE_LIMIT_PER_MINUTE` | No | `120` | Global rate limit |
| `RATE_LIMIT_AUTH_PER_MINUTE` | No | `10` | Auth endpoint limit |
| `GEO_LOCK_ENABLED` | No | `false` | Geo-lock switch |
| `GEO_LOCK_ALLOWED_COUNTRIES` | No | `IN` | Allowed country codes |
| `GEO_LOCK_STRICT` | No | `false` | Strict geo-lock mode |

---

## 12. Testing Specification

### 12.1 Test Framework

- **pytest** with **pytest-asyncio** (auto mode)
- SQLite in-memory test database (`aiosqlite`)
- Conftest creates real users + derives tokens

### 12.2 Coverage Requirements

| Module | Test File | Status |
|--------|-----------|--------|
| Auth | `test_auth.py`, `test_auth_refresh.py` | ✅ |
| Users | `test_users.py` | ✅ |
| Destinations | `test_destinations.py` | ✅ |
| Places | `test_places.py`, `test_ranking.py` | ✅ |
| Feed | `test_feed.py` | ✅ |
| Food | `test_food.py`, `test_food_diet.py` | ✅ |
| Trips | `test_trip_planner.py`, `test_journey_planner.py`, `test_route_planner.py`, `test_ai_trips.py` | ✅ |
| Offline | `test_offline.py` | ✅ |
| TripPods | `test_trippods.py` | ✅ |
| Admin | `test_admin.py` | ✅ |
| Feasibility | `test_feasibility.py` | ✅ |
| Fuel sync | `test_fuel_sync.py` | ✅ |
| Geocode | `test_geocode_endpoint.py` | ✅ |
| Rate limit | `test_rate_limit.py` | ✅ |
| Request logging | `test_request_logging.py` | ✅ |
| Sentiment | `test_sentiment.py` | ✅ |
| Reddit review | `test_reddit_review_filter.py` | ✅ |
| API smoke | `test_api.py` | ✅ |
| **Transit** | *(not yet written)* | ⚠️ |
| **Geo-lock** | *(not yet written)* | ⚠️ |

### 12.3 Each Test Should Cover

- Normal/expected usage (happy path)
- Edge cases and null inputs
- Error conditions (404, 401, 403, 502, etc.)

---

## 13. Frontend UI Specifications

### 13.1 Theme System

All components receive a `t: Theme` prop with color tokens. Two themes: `LIGHT` and `DARK` (defined in `frontend/src/data/theme.ts`).

| Token | Purpose |
|-------|---------|
| `t.bg` / `t.bg2` | Background levels |
| `t.card` | Card/surface background |
| `t.text` | Body text |
| `t.heading` | Heading text |
| `t.muted` | Secondary/muted text |
| `t.border` | Borders and dividers |
| `t.accent` | Primary accent (CTA, active state) |
| `t.secondary` | Secondary accent |
| `t.gold` / `t.goldFill` | Brand gold |
| `t.success` / `t.warning` / `t.error` | Semantic colors |
| `t.tag` | Tag/chip background |
| `t.overlay` | Shadow/overlay color |

### 13.2 Brand Assets

- **Logo**: Navy disc, gold serif "T", dashed flight-path orbit, airplane silhouette
- **Serif font**: `var(--font-dm-serif), Georgia, serif` (headings)
- **Sans font**: System default (body)
- **Icon system**: lucide-react, accessed by string name via `<Icon name="..." />`

### 13.3 Responsive Layout

| Breakpoint | Layout | Navigation |
|------------|--------|------------|
| < 1024px (mobile) | Single column | Bottom tab bar (5 items) + hamburger drawer |
| ≥ 1024px (desktop) | Two column (260px sidebar + main) | Fixed sidebar + top header |

---

## 14. Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| API response time | < 500ms (p95) for read endpoints |
| Offline pack generation | < 5s |
| Database | PostgreSQL 16 + PostGIS |
| Concurrency | Async throughout (SQLAlchemy async, httpx async) |
| Error handling | All endpoints return consistent error shape |
| Logging | All requests logged with duration |
| Rate limiting | 120 req/min global, 10 req/min auth |
| Geo-restriction | Configurable, default India-only |

---

## 15. Known Gaps & Future Work

| Area | Gap | Priority |
|------|-----|----------|
| Background workers | Celery/RQ not wired; offline pack gen runs sync | Medium |
| File uploads | No image upload endpoints | Medium |
| Email/phone verification | Fields exist, flow unimplemented | Medium |
| Pagination audit | Some list endpoints unbounded | Low |
| CORS validation | `*` accepted without warning | Low |
| Food score formula | `count × 20` ignores verifier trust | Low |
| Transit tests | BMTC module has no tests | Medium |
| Geo-lock tests | Geo-lock module has no tests | Medium |
| Geo production | `api.country.is` has no SLA; bundle GeoLite2 | Low |
| PostGIS spatial index | Geometry stored as WKT text | Low |
| Frontend README | Still create-next-app boilerplate | Low |
| CHANGELOG | Does not exist | Low |
| Architecture diagram | Does not exist | Low |
| Water transport | FERRY/CRUISE paused (no routing data) | Paused |
| Google Maps tiles | Not used (legal restrictions) | Won't do |
| Reddit as primary DB | Prohibited by rules | Won't do |

# Tripova Project Structure

## Overview

Tripova is an India-first travel discovery platform built with a modular FastAPI backend. The project follows a feature-module pattern where each domain (auth, destinations, food, etc.) is self-contained with its own models, schemas, service layer, and routes. All 18 API routers are mounted centrally in `app/main.py`.

## Root Directory

```
Tripsova/
├── backend/                  # FastAPI Python backend
├── frontend/                 # Next.js frontend (fetches the live API)
│   └── public/brand/          # Stable generated brand assets used by static icons
├── deploy/                   # Docker Compose, nginx, system packages, Pi deploy guide
├── docs/                     # Project docs (this file, USER_WORKFLOW, plans)
└── tripova.jsx               # Legacy prototype, not referenced by any build
```

## Backend Structure

```
backend/
├── .env.example              # Environment variable template
├── alembic.ini               # Alembic configuration
├── pyproject.toml             # Python project metadata, deps, tool config
├── requirements.txt           # Pinned dependencies
├── README.md                  # Setup and dev guide
├── alembic/                   # Database migrations
│   ├── env.py                 # Alembic environment config
│   ├── script.py.mako         # Migration template
│   └── versions/              # Migration versions
├── app/                       # Application source
│   ├── __init__.py
│   ├── config.py              # Settings from env vars
│   ├── database.py            # SQLAlchemy async engine, session, Base
│   ├── dependencies.py        # FastAPI deps (auth, admin guards)
│   ├── main.py                # FastAPI app factory, lifespan, 17 routers
│   ├── security.py            # bcrypt hashing, JWT create/decode
│   ├── modules/               # Feature modules (see below)
│   └── shared/                # Shared utilities (see below)
├── scripts/
│   └── seed.py                # Database seeder (3 users, 7 dests, 105 places, etc.)
└── tests/                     # Pytest suite (27 test files)
```

### app/ — Core Application

| File | Purpose |
|------|---------|
| `config.py` | `Settings` class reading `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_PLACES_API_KEY`, `CORS_ORIGINS`, `OFFLINE_PACK_MAX_SIZE_MB`, `GEO_LOCK_*` from env |
| `database.py` | `engine`, `async_session_factory`, `Base`, `get_db()`, `init_db()`, `close_db()` |
| `dependencies.py` | `get_current_user_id`, `get_current_user_role`, `require_admin`, `require_auth` |
| `security.py` | `hash_password`, `verify_password`, `create_access_token`, `decode_access_token` |
| `main.py` | Lifespan-managed FastAPI app with CORS middleware, global exception handler, health endpoint, and 18 mounted routers |

### app/modules/ — Feature Modules

19 feature modules (18 with routers + admin as a utility module), each following the `models.py → schemas.py → service.py → routes.py` pattern:

| # | Module | Files | Purpose |
|---|--------|-------|---------|
| 1 | `auth/` | models, schemas, service, routes | Registration, login, token refresh |
| 2 | `users/` | **models**, schemas, service, routes | Profile management, preferences — **centralized SQLAlchemy models live here** |
| 3 | `destinations/` | models, schemas, service, routes | City/country discovery with rich metadata |
| 4 | `places/` | models, schemas, service, routes, **ranking** | POIs, attractions, landmarks with multi-factor ranking |
| 5 | `food/` | schemas, service, routes | PureFind food discovery (no own models — uses `FoodVerification` from users/models) |
| 6 | `feed/` | models, schemas, service, routes | Traveller feed posts with freshness scoring |
| 7 | `trips/` | models, schemas, service, routes, **ai_provider** | AI trip builder and itinerary management |
| 8 | `offline/` | models, schemas, service, routes, **pack_builder**, **sync** | JSON Offline Trip Pack generation and sync |
| 9 | `maps/` | schemas, service, routes, **osm**, **mbtiles** | Map data integration (no own models — uses destinations/places) |
| 10 | `trippods/` | models, schemas, service, routes | Verified companion matching (TripPods) |
| 11 | `trust/` | models, schemas, service, routes, **scoring** | TrustScore engine for users, places, posts, partners |
| 12 | `partners/` | models, schemas, service, routes | Local partner listings and management |
| 13 | `bookings/` | models, schemas, service, routes | Booking lifecycle management |
| 14 | `admin/` | schemas, service, routes | Admin dashboard (no own models — uses shared models) |
| 15 | `data_sources/` | schemas, service, routes, **base**, **osm_provider**, **geofabrik_provider**, **wikidata_provider**, **wikivoyage_provider**, **google_places_provider**, **weather_provider**, **reddit_deep_review_provider**, **ingestion_service**, **normalizer** | Multi-source data ingestion from OSM, Geofabrik, Wikidata, Wikivoyage, Google Places, Weather, Reddit |
| 16 | `transit/` | schemas, service, routes, **bmtc_provider** | Bengaluru city bus (BMTC) live transit tracker — reverse-engineered from govt website |
| 17 | `budget/` | models, schemas, service, routes | Shared expense tracking and settle-up |
| 18 | `data_sources/` | (same as above) | — |

### Feature Module Pattern

Every module (except `food/`, `admin/`) follows a consistent 4-file pattern:

1. **`models.py`** — SQLAlchemy ORM models (column definitions, relationships)
2. **`schemas.py`** — Pydantic request/response schemas
3. **`service.py`** — Business logic layer (called by routes)
4. **`routes.py`** — FastAPI `APIRouter` with endpoint definitions

Exceptions:
- `food/` — no `models.py`; uses `FoodVerification` model from `users/models.py`
- `admin/` — no `models.py`; administrative operations on shared models
- `places/` — extra `ranking.py` for multi-factor scoring algorithm
- `trips/` — extra `ai_provider.py` for AI trip generation
- `offline/` — extra `pack_builder.py` and `sync.py` for pack generation/sync
- `trust/` — extra `scoring.py` for TrustScore calculation
- `maps/` — extra `osm.py` and `mbtiles.py` for map data
- `data_sources/` — full ingestion pipeline with providers, normalizer, and ingestion service
- `transit/` — extra `bmtc_provider.py` for the reverse-engineered BMTC API client

### Centralized SQLAlchemy Models

All SQLAlchemy models are defined in `app/modules/users/models.py`. Other modules that need models import them from there via re-export files. The models include:

| Model | Table | Module Consumer |
|-------|-------|----------------|
| `User` | `users` | auth, users |
| `Destination` | `destinations` | destinations, feed, trips, offline |
| `Place` | `places` | places, food, maps |
| `PlaceSource` | `place_sources` | data_sources |
| `FoodVerification` | `food_verifications` | food, trust |
| `FeedPost` | `feed_posts` | feed |
| `Trip` | `trips` | trips |
| `OfflinePack` | `offline_packs` | offline |
| `OfflineSyncLog` | `offline_sync_logs` | offline |
| `TripPod` | `trip_pods` | trippods |
| `TripPodMember` | `trip_pod_members` | trippods |
| `Partner` | `partners` | partners |
| `Listing` | `listings` | partners, bookings |
| `Booking` | `bookings` | bookings |
| `DeepReviewQuery` | `deep_review_queries` | data_sources |
| `TrustEvent` | `trust_events` | trust |

### app/modules/transit/ — BMTC Transit Tracker (NEW)

A standalone module for live Bengaluru city bus tracking, added 2026-06-21.

#### Architecture

```
transit/
├── __init__.py
├── bmtc_provider.py      # HTTP client for 11 BMTC API endpoints
├── schemas.py             # Pydantic response models (RouteSuggestion, LiveBus, etc.)
├── service.py             # Business logic with 120s in-process cache
└── routes.py              # 4 endpoints at /api/transit/*
```

#### Provider — bmtc_provider.py

Reverse-engineered from network traffic on `bmtcmobileapp.karnataka.gov.in`. All endpoints are **POST** with `Content-Type: application/json` and `lan: en` header. Uses `httpx.AsyncClient` with 15s timeout.

| Method | Upstream Path | Purpose |
|--------|---------------|---------|
| `search_routes` | `/SearchRoute_v2` | Route number autocomplete |
| `search_stops` | `/FindNearByBusStop_v2` | Stop name substring search |
| `get_all_routes` | `/GetAllRouteList` | ~11 000+ routes (up/down distinct) |
| `get_route_details` | `/SearchByRouteDetails_v4` | Stations + live buses on a route |
| `get_vehicle_trip` | `/VehicleTripDetails_v2` | Live tracking for a specific vehicle |
| `get_timetable_by_route` | `/GetTimetableByRouteId_v3` | Scheduled trip times by route |
| `get_timetable_by_station` | `/GetTimetableByStation_v4` | Scheduled trips between stations |
| `get_fare` | `/GetMobileFareData_v2` | Fare for a route-stop pair |
| `get_route_points` | `/RoutePoints` | Station lat/lng in route order |
| `get_service_types` | `/GetAllServiceTypes` | Service type IDs (AC, Non-AC) |
| `search_vehicles` | `/ListVehicles` | Find vehicles by plate number |

**⚠️ Disclaimer**: This is an unofficial API consumed by the BMTC website itself. Use at your own discretion. Do not put excessive load on BMTC servers.

#### Service — service.py

In-process dict cache with 120s TTL for search results. Cached keys are prefixed by type (`routes:`, `stops:`). Live route data and vehicle tracking bypass cache.

#### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/transit/search?q=...` | GET | Search routes and stops by name/number |
| `/api/transit/routes/{route_id}` | GET | Live bus positions + station list for a route |
| `/api/transit/vehicle/{vehicle_id}` | GET | Live tracking for a specific bus |
| `/api/transit/all-routes` | GET | List all BMTC routes (cached 120s) |

#### Data Format Note

BMTC upstream returns `Issuccess` boolean + `responsecode` integer + `data` array for most endpoints. The provider validates these before returning data.

### app/shared/ — Geo-Lock (NEW)

Location-based access control added 2026-06-21.

```
app/shared/
├── __init__.py
├── enums.py              # UserRole, VerificationStatus, PlaceType, DietTag, …
├── errors.py             # Custom exception classes (NotFound, Unauthorized, etc.)
├── pagination.py         # Pagination helpers
├── utils.py              # General utility functions
├── rate_limit.py         # Token-bucket rate limiting middleware
├── request_logging.py    # Request/response logging middleware
├── cache.py              # Redis caching helper (wired into destination routes)
├── sentiment.py          # VADER sentiment analysis
├── ai.py                 # AI provider helper for trip generation
├── diet.py               # Diet-related utilities
└── geolock.py            # Geo-lock middleware + dependency (NEW)
```

#### geolock.py

Restricts API access to specific countries by IP geolocation.

**Resolved**: Uses `https://api.country.is/` (free, no API key) with 1-hour in-memory cache.

**Components:**
- `GeoLockMiddleware` — ASGI middleware, blocks requests before they reach route handlers
- `require_india_only` — Per-endpoint FastAPI dependency for selective blocking
- `GeoResolver` — IP→country resolver with private-IP detection and graceful fallback

**Exempt paths:** `/health`, `/docs`, `/openapi.json`, `/redoc`, `/` — always pass through.

**Configuration** (in `config.py` / `.env`):

| Setting | Default | Description |
|---------|---------|-------------|
| `GEO_LOCK_ENABLED` | `false` | Master switch |
| `GEO_LOCK_ALLOWED_COUNTRIES` | `"IN"` | Comma-separated ISO 3166-1 alpha-2 codes |
| `GEO_LOCK_STRICT` | `false` | If true, block when geo lookup fails (private IP / API down) |

**Cache**: 1-hour TTL in process dict. Private IPs (10.x, 192.168.x, 127.x) return None — in non-strict mode these pass through, in strict mode they're blocked.

### app/main.py — Router Mounting

18 API routers are mounted in `app/main.py` (lines 92-109):

| # | Router | Module | Prefix |
|---|--------|--------|--------|
| 1 | `auth_router` | auth | (none) |
| 2 | `users_router` | users | (none) |
| 3 | `destinations_router` | destinations | (none) |
| 4 | `places_router` | places | (none) |
| 5 | `food_router` | food | (none) |
| 6 | `feed_router` | feed | (none) |
| 7 | `trips_router` | trips | (none) |
| 8 | `offline_router` | offline | (none) |
| 9 | `maps_router` | maps | (none) |
| 10 | `trippods_router` | trippods | (none) |
| 11 | `trust_router` | trust | (none) |
| 12 | `partners_router` | partners | (none) |
| 13 | `bookings_router` | bookings | (none) |
| 14 | `admin_router` | admin | (none) |
| 15 | `datasources_router` | data_sources | (none) |
| 16 | `transit_router` | transit | `/api/transit` |
| 17 | `budget_router` | budget | `/api/budget` |
| 18 | geolock (middleware) | shared/geolock | — (ASGI middleware, not a router) |

### Data Layer

```
alembic/               # Migration framework
├── env.py             # Async Alembic environment
├── script.py.mako     # Migration template
└── versions/          # Versioned migrations

scripts/
└── seed.py            # Seeds: 3 users, 7 destinations, 105 places,
                       # 12 food verifications, 16 feed posts, 3 TripPods,
                       # 6 pod members, 3 partners, 7 listings, 9 trust events
```

### Tests

```
tests/
├── conftest.py
├── test_admin.py
├── test_api.py
├── test_auth.py
├── test_auth_refresh.py
├── test_destinations.py
├── test_feed.py
├── test_offline.py
├── test_places.py
├── test_ranking.py
├── test_rate_limit.py
├── test_request_logging.py
├── test_sentiment.py
├── test_trip_planner.py
├── test_journey_planner.py
├── test_route_planner.py
├── test_ai_trips.py
├── test_food.py
├── test_food_diet.py
├── test_feasibility.py
├── test_fuel_sync.py
├── test_geocode_endpoint.py
├── test_geolock.py
├── test_reddit_review_filter.py
├── test_transit.py
├── test_trippods.py
├── test_users.py
```

Uses `pytest` + `pytest-asyncio` (auto mode configured in `pyproject.toml`).

### Seed Data Summary

From `scripts/seed.py`:
- **3 users**: admin, traveller, partner
- **7 destinations**: Manali, Rishikesh, Jaipur, Goa, Udaipur, Kasol, Spiti Valley
- **105 places**: 15 per destination (5 tourist spots/viewpoints/treks + 5 food + 3 accommodation + 2 emergency)
- **12 food verifications** with diet tags (PURE_VEG, JAIN, VEGAN, HALAL)
- **16 feed posts** with traveller content, crowd levels, safety notes
- **3 TripPods** with 6 member relationships
- **3 partners** (guide, homestay, cafe)
- **7 listings** (one per partner-listed place)
- **9 trust events** with score deltas

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 + PostGIS |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt |
| Geospatial | GeoAlchemy2 + Geography |
| Testing | pytest + pytest-asyncio |
| Linting | Ruff / Black (line-length 120) |
| Async Server | Uvicorn |

---

## Frontend Structure

The frontend is a Next.js app that fetches the **live backend API** — there is no
hardcoded demo data driving the UI. See `frontend/AGENTS.md` for the coding conventions.

```
frontend/
├── public/brand/              # Supplied Tripsova logo image assets used by app chrome and icons
└── src/
    ├── app/                   # Next.js routes (app shell, SSR content pages, robots/sitemap/manifest/icons)
    │   └── app/page.tsx       # Client component: <AppProvider><AppShell />
    ├── lib/
    │   ├── api.ts             # Client-side API helper (api.get/api.post)
    │   ├── server-api.ts      # Server-side fetch helper for SSR pages
    │   ├── destinations.ts    # useDestinations(limit?) hook → { destinations, loading, error, reload }
    │   ├── types.ts           # API response types (16 transit types included)
    │   └── utils.ts           # Shared helpers
    ├── data/                  # Theme tokens + small static config ONLY (no demo content)
    │   ├── theme.ts           # LIGHT / DARK token objects (the `t` prop source)
    │   └── index.ts           # Re-exports (Theme type, etc.)
    └── components/tripova/
        ├── logo.tsx           # Image-backed brand mark plus native wordmark text
        ├── icon.tsx           # lucide-react icon-by-name wrapper
        ├── app-shell.tsx      # Responsive shell (sidebar ≥1024px, bottom-nav on mobile), tab routing
        ├── app-provider.tsx   # Context provider for tab/sub/dest + URL sync (NEW)
        ├── primitives/index.tsx # Shared UI: ScreenHeader, SectionTitle, Card, Btn, InputF, SkeletonCard…
        ├── badges/index.tsx   # TrustBadge, CommBadge, PoweredBy, CommunityVerified
        ├── layout/side-drawer.tsx
        ├── overlays/          # CreateSheet, NotificationsSheet, EmergencySheet
        ├── auth/              # auth-context.tsx, login-screen.tsx, register-screen.tsx
        └── screens/           # 15 screen files (one per surface)
```

### Screens

| Screen | File | Description |
|--------|------|-------------|
| Home | `screens/home-screen.tsx` | Feed sections: CityFeed → Trip Pulse → TripPod → PureFind |
| Discover | `screens/discover-screen.tsx` | Destination catalog (Trip Pulse) |
| PureFind | `screens/purefind-screen.tsx` | Diet-aware food discovery |
| Pods | `screens/pods-screen.tsx` | TripPod companion matching |
| Plan | `screens/plan-screen.tsx` | AI Trip Builder |
| Route | `screens/route-screen.tsx` | Route Planner with transit integration |
| Journey | `screens/journey-screen.tsx` | Multi-leg journey planner results |
| Transit | `screens/transit-screen.tsx` | BMTC live bus tracker (NEW) |
| Budget | `screens/budget-screen.tsx` | Budget tracker |
| Destination Hub | `screens/destination-hub.tsx` | Per-destination feed + food hub |
| Profile | `screens/profile-screen.tsx` | User profile |
| Settings | `screens/settings-screen.tsx` | Settings & privacy |
| Support | `screens/support-screen.tsx` | Help & support |
| Offline Maps | `screens/offline-maps-screen.tsx` | Offline trip packs |
| Budget | `screens/budget-screen.tsx` | Budget tracking |

### URL Routing (NEW — 2026-06-21)

The app-provider now syncs `tab`, `sub`, and `dest` state to the browser URL via `window.history.replaceState`:

- **URL format**: `/app` → `/app?tab=discover` → `/app?dest=goa`
- **Read on mount**: Initial state is populated from URL search params (deep-link support)
- **Sync on change**: Every navigation updates the URL without cluttering browser history
- **No SSR flash**: URL sync happens only after hydration (`hydrated` gate)

### Styling model

All `components/tripova/**` UI is styled with **inline `style={{}}` objects** that read colours from a single theme object `t` (`LIGHT`/`DARK` in `data/theme.ts`) threaded down as a prop. No CSS modules / Tailwind on these screens. shadcn `ui/` primitives read CSS variables from `app/globals.css`. Serif type uses `var(--font-dm-serif)`.

### Home feed order

The home screen renders four sections in this client-specified order:
**CityFeed → Trip Pulse → TripPod → PureFind**. Each section fetches its own live data (`/api/feed`, `/api/destinations`, `/api/trippods`, `/api/food`) and self-hides or shows an honest empty/error state when there is no data.

### Data rule

No demo / fabricated arrays drive screens. Destinations flow through the `useDestinations` hook; other surfaces call `api.get`/`api.post` directly. Every screen handles loading, error (with retry), and empty states explicitly.

---

## Changelog — All Actions (2026-06-21)

### New Modules

#### 1. BMTC Transit Tracker (`backend/app/modules/transit/`)

- **`bmtc_provider.py`**: HTTP client for 11 BMTC API endpoints (reverse-engineered from `bmtcmobileapp.karnataka.gov.in`)
  - All POST requests with `httpx.AsyncClient`, 15s timeout
  - Error handling: `BMTCApiError` with logging
  - Response validation: checks `Issuccess` and `responsecode`
- **`schemas.py`**: 8 Pydantic v2 response models (RouteSuggestion, StopSuggestion, LiveBus, RouteStation, RouteDetail, TransitSearchResult, LiveRouteResult, VehicleTrack, VehicleTripResult)
- **`service.py`**: Business logic with 120s in-process dict cache for search results
  - `search_transit(query, provider)` — searches routes + stops in parallel
  - `get_live_route(route_id, provider)` — stations + live buses for both directions
  - `track_vehicle(vehicle_id, provider)` — individual bus tracking with stop list
- **`routes.py`**: 4 endpoints at `/api/transit/`
- **Router registration**: `router = APIRouter(prefix="/api/transit")` → mounted in `main.py:101`

#### 2. Geo-Lock (`backend/app/shared/geolock.py`)

- **`GeoResolver`**: IP→country via `api.country.is` (free, no API key), 1h in-memory cache, private-IP detection
- **`GeoLockMiddleware`**: ASGI middleware, exempts health/docs paths, blocks non-allowed countries with 403
- **`require_india_only`**: Per-endpoint FastAPI dependency
- **Config**: 3 new settings (`GEO_LOCK_ENABLED`, `GEO_LOCK_ALLOWED_COUNTRIES`, `GEO_LOCK_STRICT`)
- **Cleanup**: Resolver closed in `lifespan` shutdown

#### 3. Transit Screen (`frontend/src/components/tripova/screens/transit-screen.tsx`)

- 394-line full-featured transit UI
- Search by route number or stop name with live results
- Route detail view with station list + live bus positions
- Direction toggle (up/down), ETA display, service type badges
- Animated pulse indicator for live buses
- Auto-refresh indicator (data fetched on each view)
- Error/empty states for BMTC API being unavailable

#### 4. URL Routing (`frontend/src/components/tripova/app-provider.tsx`)

- On mount: reads `?tab=`, `?sub=`, `?dest=` from `window.location.search`
- On state change: syncs to URL via `window.history.replaceState`
- `hydrated` gate prevents SSR mismatch
- Clean URL: `/app` (defaults stripped), `/app?tab=discover`, `/app?dest=goa`

### Modified Backend Files

| File | Change |
|------|--------|
| `app/main.py` | Added transit router import + mount (line 33, 101), GeoLock middleware (line 58), resolver cleanup in lifespan |
| `app/config.py` | Added `GEO_LOCK_ENABLED`, `GEO_LOCK_ALLOWED_COUNTRIES`, `GEO_LOCK_STRICT` settings |
| `.env.example` | Added geo-lock config comments |
| `app/modules/trips/transport.py` | Paused FERRY and CRUISE profiles (commented out), changed `WATER` alias from `FERRY` to `TRAIN` |

### Modified Frontend Files

| File | Change |
|------|--------|
| `app-provider.tsx` | Added URL sync (read on mount + write on state change) |
| `destination-hub.tsx` | Per-section loading states (postsLoading, restsLoading), shimmer skeletons, context-aware empty messages |
| `app-shell.tsx` | Added TransitScreen import + route case |
| `route-screen.tsx` | Removed FERRY/CRUISE from TRANSPORT_META, emptied WATER_KEYS |
| `journey-screen.tsx` | Removed FERRY/CRUISE from TRANSPORT_META |
| `plan-screen.tsx` | Removed FERRY from travelModes |
| `lib/types.ts` | Removed FERRY/CRUISE from TransportKey type (commented) |

### Water Transport — Paused

FERRY and CRUISE transport profiles are temporarily suspended across the stack:

- **Backend**: Profiles commented out in `transport.py`. `WATER` legacy alias now maps to `TRAIN`.
- **Frontend**: Removed from all TRANSPORT_META objects, travelModes arrays, and WATER_KEYS.
- **Type**: `TransportKey` no longer includes `FERRY | CRUISE` in the union (commented for easy un-pause).

**Rationale**: Water transport routing data (routes, schedules, fares, port locations) is not yet available. The module will be resumed when data sources are ready.

---

## Known Issues & Problems

Last verified against the working tree on 2026-06-25. Items confirmed fixed have moved to the Resolved section below.

### Open Issues

#### 1. Celery/RQ background worker not wired
Celery is listed as an optional dependency but no task queue is configured. Offline pack generation and data-ingestion sync run synchronously inside the request-response cycle.

#### 2. No input sanitization or request size limiting beyond Pydantic
Pydantic handles type validation, but there is no additional sanitization for text fields and no request body size limit.

#### 3. No file/image upload endpoints
Models have image URL fields but no endpoint can populate them (places, feed posts, profiles, food verifications).

#### 4. Pagination not audited on every list endpoint
`app/shared/pagination.py` is used by destinations, places, feed, trippods, and partners. The remaining list endpoints (bookings, trust, offline, data_sources) should be audited for unbounded queries.

#### 5. No email/phone verification
`User.email_verified` / `phone_verified` exist but are never set by any endpoint.

#### 6. CORS origins not validated
`CORS_ORIGINS` can be set to `*` in `.env` with no validation preventing it in production.

#### 7. Google Places provider fails silently
`google_places_provider.py` has no logging or warning when `GOOGLE_PLACES_API_KEY` is unset; data providers degrade with no operator signal.

#### 8. Food verification score formula is naive
`food_score = min(100, verification_count * 20)` — a flat 20 points per verification regardless of verifier trustworthiness.

#### 9. `tripova.jsx` at root is orphaned
Legacy prototype at the repo root, not referenced by any build configuration.

#### 10. PostGIS spatial index — currently N/A
The schema stores geometry as `geom_wkt` (Text), not a PostGIS geometry column, so no GIST index applies yet. Revisit when a real geometry column is introduced.

#### 11. Geo-lock uses a third-party API for geo resolution
`api.country.is` is a free service with no SLA. If it goes down, geo-lock falls back gracefully (in non-strict mode allows through). For production, consider bundling a GeoLite2 database locally.

### Resolved

- **Database migrations** — initial schema migration exists (`alembic/versions/599dafc6cc34`), plus `7b41c2a9e0d5` for refresh tokens.
- **`aiosqlite` test dependency** — declared in `pyproject.toml` dev extras.
- **`vaderSentiment` in pyproject** — declared in main dependencies.
- **pydantic-settings config** — `app/config.py` uses `BaseSettings` with `.env` auto-loading.
- **Hardcoded JWT secret** — `JWT_SECRET` is now required with no built-in default.
- **Connection pooling** — `app/database.py` configures pool size/overflow/timeout/recycle/pre-ping for Postgres.
- **Exception handler leak** — global handler returns a generic 500 and logs the traceback server-side instead of returning `str(exc)`.
- **Duplicated JWT decode logic** — `app/dependencies.py` shares a single `_decode_bearer_token` helper.
- **Request/response logging** — `app/shared/request_logging.py` middleware logs method, path, status, and duration per request.
- **Rate limiting** — `app/shared/rate_limit.py` token-bucket middleware, per-client-IP, stricter on auth endpoints, configurable via `RATE_LIMIT_*` settings.
- **Refresh tokens** — `refresh_tokens` table, `/api/auth/refresh` and `/api/auth/logout` with rotation and revocation.
- **Test fixtures** — `conftest.py` creates real users in the test DB and derives tokens from them.
- **Weak `/api/places` assertion** — `test_api.py` now requires 200.
- **Ranking test duplication** — `test_ranking.py` imports `review_confidence_score`, `popularity_score`, `freshness_score_from_days`, and `compose_final_score` from `app.modules.places.ranking`.
- **Admin schemas/tests** — `app/modules/admin/schemas.py` response models and `tests/test_admin.py` coverage exist.
- **Nginx config** — `deploy/nginx.conf` exists.
- **Redis caching** — `app/shared/cache.py` helper exists and is wired into destination routes.
- **Frontend hardcoded data** — frontend fetches the live API via `src/lib/api.ts` / `server-api.ts`.
- **URL-based routing** — app-provider syncs tab/sub/dest to browser URL (2026-06-21).
- **DestinationHub empty states** — per-section loading, shimmer skeletons, context-aware empty messages (2026-06-21).
- **TypeScript errors** — `useRef<ReturnType<typeof setTimeout> | null>(null)` fixed (2026-06-21).
- **Water transport paused** — FERRY/CRUISE removed across stack (2026-06-21).
- **Transit module tests** — `tests/test_transit.py` covers search, route, vehicle, cache, and BMTC error handling (2026-06-25).
- **Geo-lock tests** — `tests/test_geolock.py` covers middleware, dependency, private IP, and exempt paths (2026-06-25).
- **Frontend README** — replaced `create-next-app` boilerplate with Tripsova-specific setup guide (2026-06-25).
- **Documentation debt** — `backend/DECISIONS.md` and `backend/TASKS.md` created (2026-06-25).
- **Module count** — docs updated from 17→19 modules (budget added, transit/budget split) (2026-06-25).
- **`pytest`/`pytest-asyncio`** — moved from core dependencies to dev extras in `pyproject.toml` (2026-06-25).
- **Shared error classes** — `ValidationException` added to `app/shared/errors.py` matching AGENTS.md rule #9 (2026-06-25).
- **`*.bak` gitignore** — added to root `.gitignore` to prevent DB backup commits (2026-06-25).
- **BMTC connection reuse** — `get_provider` dependency switched from per-request client to singleton pattern (2026-06-25).
- **Error boundary** — `ErrorBoundary` component added and wrapped around `(app)/layout.tsx` children (2026-06-25).
- **Frontend typecheck** — `npm run typecheck` script added to `package.json` (2026-06-25).

### Summary of Remaining Action Items

1. Wire a background worker (Celery/RQ) for offline pack generation and ingestion sync
2. Add image upload endpoints
3. Implement email/phone verification flow
4. Audit remaining list endpoints for pagination
5. Add logging when data providers are unavailable (Google Places)
6. Trust-weight the food verification score formula
7. Validate CORS origins; reject `*` in production
11. Consider bundling a GeoLite2 database for production geo-lock (remove third-party API dependency)

# Tripova Project Structure

## Overview

Tripova is an India-first travel discovery platform built with a modular FastAPI backend. The project follows a feature-module pattern where each domain (auth, destinations, food, etc.) is self-contained with its own models, schemas, service layer, and routes. All 15 API routers are mounted centrally in `app/main.py`.

## Root Directory

```
Tripsova/
├── backend/                  # FastAPI Python backend
├── frontend/                 # Next.js frontend (fetches the live API)
├── deploy/                   # docker-compose, nginx.conf, system packages
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
│   ├── main.py                # FastAPI app factory, lifespan, 15 routers
│   ├── security.py            # bcrypt hashing, JWT create/decode
│   ├── modules/               # Feature modules (see below)
│   └── shared/                # Shared utilities (see below)
├── scripts/
│   └── seed.py                # Database seeder (3 users, 7 dests, 105 places, etc.)
└── tests/                     # Pytest suite (see "Tests" section below)
```

### app/ — Core Application

| File | Purpose |
|------|---------|
| `config.py` | `Settings` class reading `DATABASE_URL`, `JWT_SECRET`, `GOOGLE_PLACES_API_KEY`, `CORS_ORIGINS`, `OFFLINE_PACK_MAX_SIZE_MB` from env |
| `database.py` | `engine`, `async_session_factory`, `Base`, `get_db()`, `init_db()`, `close_db()` |
| `dependencies.py` | `get_current_user_id`, `get_current_user_role`, `require_admin`, `require_auth` |
| `security.py` | `hash_password`, `verify_password`, `create_access_token`, `decode_access_token` |
| `main.py` | Lifespan-managed FastAPI app with CORS middleware, global exception handler, health endpoint, and 15 mounted routers |

### app/modules/ — Feature Modules

15 feature modules, each following the `models.py → schemas.py → service.py → routes.py` pattern:

| Module | Files | Purpose |
|--------|-------|---------|
| `auth/` | models, schemas, service, routes | Registration, login, token refresh |
| `users/` | **models**, schemas, service, routes | Profile management, preferences — **centralized SQLAlchemy models live here** |
| `destinations/` | models, schemas, service, routes | City/country discovery with rich metadata |
| `places/` | models, schemas, service, routes, **ranking** | POIs, attractions, landmarks with multi-factor ranking |
| `food/` | schemas, service, routes | PureFind food discovery (no own models — uses `FoodVerification` from users/models) |
| `feed/` | models, schemas, service, routes | Traveller feed posts with freshness scoring |
| `trips/` | models, schemas, service, routes, **ai_provider** | AI trip builder and itinerary management |
| `offline/` | models, schemas, service, routes, **pack_builder**, **sync** | JSON Offline Trip Pack generation and sync |
| `maps/` | schemas, service, routes, **osm**, **mbtiles** | Map data integration (no own models — uses destinations/places) |
| `trippods/` | models, schemas, service, routes | Verified companion matching (TripPods) |
| `trust/` | models, schemas, service, routes, **scoring** | TrustScore engine for users, places, posts, partners |
| `partners/` | models, schemas, service, routes | Local partner listings and management |
| `bookings/` | models, schemas, service, routes | Booking lifecycle management |
| `admin/` | schemas, service, routes | Admin dashboard (no own models — uses shared models) |
| `data_sources/` | schemas, service, routes, **base**, **osm_provider**, **geofabrik_provider**, **wikidata_provider**, **wikivoyage_provider**, **google_places_provider**, **weather_provider**, **reddit_deep_review_provider**, **ingestion_service**, **normalizer** | Multi-source data ingestion from OSM, Geofabrik, Wikidata, Wikivoyage, Google Places, Weather, Reddit |

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

### app/main.py — Router Mounting

15 API routers are mounted in `app/main.py` (lines 69-83):

| # | Router | Module |
|---|--------|--------|
| 1 | `auth_router` | auth |
| 2 | `users_router` | users |
| 3 | `destinations_router` | destinations |
| 4 | `places_router` | places |
| 5 | `food_router` | food |
| 6 | `feed_router` | feed |
| 7 | `trips_router` | trips |
| 8 | `offline_router` | offline |
| 9 | `maps_router` | maps |
| 10 | `trippods_router` | trippods |
| 11 | `trust_router` | trust |
| 12 | `partners_router` | partners |
| 13 | `bookings_router` | bookings |
| 14 | `admin_router` | admin |
| 15 | `datasources_router` | data_sources |

### Shared Modules

```
app/shared/
├── __init__.py
├── enums.py          # UserRole, VerificationStatus, PlaceType, DietTag,
                      # TripType, TripPodStatus, TripPodMemberStatus,
                      # PartnerType, ListingStatus, BookingStatus, SentimentLabel
├── errors.py         # Custom exception classes
├── pagination.py     # Pagination helpers
└── utils.py          # General utility functions
```

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
├── test_offline.py
├── test_places.py
├── test_ranking.py
├── test_rate_limit.py
├── test_request_logging.py
├── test_sentiment.py
└── test_trip_planner.py
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
frontend/src/
├── app/                      # Next.js routes (app shell, SSR content pages, robots/sitemap/manifest/icons)
├── lib/
│   ├── api.ts                # Client-side API helper (api.get/api.post)
│   ├── server-api.ts         # Server-side fetch helper for SSR pages
│   ├── destinations.ts       # useDestinations(limit?) hook → { destinations, loading, error, reload }
│   ├── types.ts              # API response types (FeedPostResponse, FoodPlaceResponse, TripPodResponse, …)
│   └── utils.ts              # Shared helpers
├── data/                     # Theme tokens + small static config ONLY (no demo content)
│   ├── theme.ts              # LIGHT / DARK token objects (the `t` prop source)
│   └── index.ts              # Re-exports (Theme type, etc.)
└── components/tripova/
    ├── logo.tsx              # Brand mark: navy disc, gold serif "T", airplane swoosh, TRIPSOVA wordmark
    ├── icon.tsx              # lucide-react icon-by-name wrapper
    ├── app-shell.tsx         # Responsive shell (sidebar ≥1024px, bottom-nav on mobile), tab routing
    ├── primitives/index.tsx  # Shared UI: ScreenHeader, SectionTitle, Card, Btn, InputF, SkeletonCard…
    └── screens/              # One file per surface (home, discover, pods, purefind, plan, profile, …)
```

### Styling model
All `components/tripova/**` UI is styled with **inline `style={{}}` objects** that read
colours from a single theme object `t` (`LIGHT`/`DARK` in `data/theme.ts`) threaded down as a
prop. No CSS modules / Tailwind on these screens. shadcn `ui/` primitives read CSS variables
from `app/globals.css`. Serif type uses `var(--font-dm-serif)`.

### Home feed order
The home screen renders four sections in this client-specified order:
**CityFeed → Trip Pulse → TripPod → PureFind**. Each section fetches its own live data
(`/api/feed`, `/api/destinations`, `/api/trippods`, `/api/food`) and self-hides or shows an
honest empty/error state when there is no data.

### Data rule
No demo / fabricated arrays drive screens. Destinations flow through the `useDestinations`
hook; other surfaces call `api.get`/`api.post` directly. Every screen handles loading, error
(with retry), and empty states explicitly.

---

## Known Issues & Problems

Last verified against the working tree on 2026-06-11. Items confirmed fixed have moved to the Resolved section below.

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

#### 10. Generic Next.js README
`frontend/README.md` is still `create-next-app` boilerplate with no Tripsova-specific setup instructions.

#### 11. Documentation debt
No `CHANGELOG.md`, no architecture diagram, and `backend/DECISIONS.md` / `backend/TASKS.md` referenced by AGENTS.md do not exist.

#### 12. PostGIS spatial index — currently N/A
The schema stores geometry as `geom_wkt` (Text), not a PostGIS geometry column, so no GIST index applies yet. Revisit when a real geometry column is introduced.

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

### Summary of Remaining Action Items

1. Wire a background worker (Celery/RQ) for offline pack generation and ingestion sync
2. Add image upload endpoints
3. Implement email/phone verification flow
4. Audit remaining list endpoints for pagination
5. Add logging when data providers are unavailable (Google Places)
6. Trust-weight the food verification score formula
7. Validate CORS origins; reject `*` in production
8. Replace frontend README boilerplate; add CHANGELOG and architecture diagram

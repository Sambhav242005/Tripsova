# Tripova Project Structure

## Overview

Tripova is an India-first travel discovery platform built with a modular FastAPI backend. The project follows a feature-module pattern where each domain (auth, destinations, food, etc.) is self-contained with its own models, schemas, service layer, and routes. All 15 API routers are mounted centrally in `app/main.py`.

## Root Directory

```
D:\Travel/
├── backend/                  # FastAPI Python backend
├── tripova.jsx               # Frontend entry (do not modify)
└── WhatsApp Image 2026-05-31 at 3.20.55 PM.jpeg
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
│   └── versions/              # Migration versions (initially empty)
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
└── tests/
    ├── conftest.py            # Pytest fixtures
    ├── test_api.py
    ├── test_auth.py
    ├── test_destinations.py
    ├── test_offline.py
    ├── test_places.py
    ├── test_ranking.py
    └── test_trip_planner.py
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
| `admin/` | service, routes | Admin dashboard (no own models — uses shared models) |
| `data_sources/` | schemas, service, routes, **base**, **osm_provider**, **geofabrik_provider**, **wikidata_provider**, **wikivoyage_provider**, **google_places_provider**, **weather_provider**, **reddit_deep_review_provider**, **ingestion_service**, **normalizer** | Multi-source data ingestion from OSM, Geofabrik, Wikidata, Wikivoyage, Google Places, Weather, Reddit |

### Feature Module Pattern

Every module (except `food/`, `admin/`) follows a consistent 4-file pattern:

1. **`models.py`** — SQLAlchemy ORM models (column definitions, relationships)
2. **`schemas.py`** — Pydantic request/response schemas
3. **`service.py`** — Business logic layer (called by routes)
4. **`routes.py`** — FastAPI `APIRouter` with endpoint definitions

Exceptions:
- `food/` — no `models.py`; uses `FoodVerification` model from `users/models.py`
- `admin/` — no `models.py` or `schemas.py`; administrative operations on shared models
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
├── test_api.py
├── test_auth.py
├── test_destinations.py
├── test_offline.py
├── test_places.py
├── test_ranking.py
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

## Known Issues & Problems

This section catalogues all known issues, gaps, and technical debt in the Tripova project. These need attention before production readiness.

### Critical Issues

#### 1. No database migrations exist
`alembic/versions/` is completely empty. The app relies on `Base.metadata.create_all()` at startup in `app/database.py:init_db()`. This is not safe for production — schema changes require a manual full rebuild with data loss. Alembic is configured (`alembic.ini` + `env.py`) but no initial migration has been generated.

#### 2. Missing test dependency: `aiosqlite`
The test config at `conftest.py:12` uses `sqlite+aiosqlite://` as the test database URL, but `aiosqlite` is not listed in either `pyproject.toml` or `requirements.txt`. Running tests will fail with `ModuleNotFoundError: No module named 'aiosqlite'` unless manually installed.

#### 3. `vaderSentiment` missing from `pyproject.toml`
The sentiment analysis module (`app/shared/sentiment.py`) imports `vaderSentiment`, which is listed in `requirements.txt` but **not** in `pyproject.toml` dependencies. This means `pip install -e .` will not install it, causing runtime import errors in environments that use the pyproject-based install (e.g., Docker image build).

#### 4. Config does not use pydantic-settings
`app/config.py` uses raw `os.getenv()` calls instead of inheriting from `pydantic-settings` `BaseSettings`, even though `pydantic-settings>=2.1.0` is a declared dependency. This means:
- No automatic type coercion for non-string types (DEBUG, OFFLINE_PACK_MAX_SIZE_MB are manually handled)
- No `.env` auto-loading (manually calling `load_dotenv()`)
- No validation or default-from-env-variable-name conventions
- The `CORS_ORIGINS` split is fragile — a missing origin produces single-element lists

### Infrastructure & Deployment Problems

#### 5. No connection pooling configuration
`app/database.py:6` creates the engine with only `echo=settings.DEBUG`. No pool size, pool overflow, pool timeout, or pool recycling is configured. Under load, connections will exhaust the PostgreSQL `max_connections` limit.

#### 6. Nginx directory is empty
`deploy/nginx/` exists but contains no configuration files. The Docker Compose stack has no reverse proxy, meaning all services are directly exposed. No TLS/SSL termination is configured.

#### 7. Redis caching layer not wired
Redis is listed as an optional dependency in `pyproject.toml` (commented) but no caching logic exists anywhere in the codebase. Frequently accessed data (destinations, places, rankings) has no cache layer.

#### 8. Celery/RQ background worker not wired
Celery is listed as an optional dependency but no task queue is configured. Offline pack generation, data ingestion sync, and other long-running tasks run synchronously in the request-response cycle.

### Code Quality & Architecture Problems

#### 9. Global exception handler exposes internals in debug mode
`app/main.py:51-56` catches all `Exception` types and returns `str(exc)` in the response body when `DEBUG=true`. This can leak sensitive information (stack traces, SQL queries, internal variable values) even in debug builds exposed to developers.

#### 10. `get_current_user_role` duplicates `get_current_user_id` logic
`app/dependencies.py:11-36` has two nearly identical functions (`get_current_user_id` and `get_current_user_role`) that both decode the JWT token with identical boilerplate. A single `decode_token` dependency could return both `sub` and `role`.

#### 11. No request/response logging middleware
There is no middleware for logging requests, response times, or error rates. Debugging production issues will be difficult without structured logging.

#### 12. No input sanitization or validation beyond Pydantic
Pydantic schemas handle type validation, but there is no additional sanitization for text fields (XSS prevention, SQL injection — though SQLAlchemy parameterizes queries). No request size limiting is configured.

#### 13. Test fixtures use fake user IDs that don't exist in DB
`conftest.py:54-55` creates tokens with hardcoded IDs (`"admin-user-id"`, `"test-user-id"`). When endpoints like `/api/auth/me` actually query the database for a user by this ID, they will return 404 because no user with that ID exists in the test database. Several tests may be passing falsely by coincidence (e.g., because the endpoint returns 200 but with null fields).

#### 14. `test_explore_endpoints_return_ok` has weak assertion
`test_api.py:76` asserts `response.status_code in (200, 404)` for `/api/places` — this passes even when the endpoint is completely broken. Also asserts `/api/destinations` returns 200 but empty database returns empty list which is still 200, so the test is valid but weak.

#### 15. `test_ranking.py` duplicates production ranking logic
The test file `test_ranking.py` re-implements its own `_popularity_score` and `_final_score` functions (30+ lines) rather than importing from `app.modules.places.ranking`. This means the tests verify the test's own logic, not the actual production code.

### Missing Features

#### 16. No file/image upload endpoints
There are no endpoints for uploading images for places, feed posts, user profiles, or food verifications. The models have image URL fields but no way to populate them.

#### 17. No rate limiting
API endpoints have no rate limiting. A malicious client can hammer any endpoint without restriction.

#### 18. No pagination on list endpoints
While `app/shared/pagination.py` exists as a utility, many list endpoints may not use it. Unbounded queries will load all rows into memory.

#### 19. No email/phone verification
User registration creates accounts without email or phone verification. The `User` model has `email_verified` and `phone_verified` fields but they are never set by any endpoint.

#### 20. Admin module has no schemas or dedicated tests
`app/modules/admin/` has `routes.py` and `service.py` but no `schemas.py` and no test coverage. Admin functionality is untested.

### Frontend Issues

#### 21. Frontend uses hardcoded seed data instead of live API
The frontend `src/data/` directory contains hardcoded destinations, feed posts, and content. The SPA renders static data rather than fetching from the backend API, making the frontend appear disconnected from the backend.

#### 22. Generic Next.js README
`frontend/README.md` is the default `create-next-app` boilerplate. It provides no Tripova-specific setup instructions, no API documentation, and no guidance on connecting to the backend.

#### 23. `tripova.jsx` at root is orphaned/unused
The file `D:\Travel\tripova.jsx` at the project root appears to be a legacy or misplaced frontend entry point. It is not referenced by any build configuration.

### Security Concerns

#### 24. Default JWT secret in code
`app/config.py:19` has a hardcoded default JWT secret (`"change-me-in-production-tripova-jwt-secret-key"`). If this default is ever deployed (even accidentally in a staging environment), all tokens can be forged.

#### 25. No refresh token mechanism
The auth system issues long-lived JWT tokens (default 72 hours) with no refresh token. Token revocation is impossible without a blacklist (which doesn't exist). Compromised tokens remain valid until expiry.

#### 26. CORS origins include `*` pattern from env
The `CORS_ORIGINS` env variable can easily be set to `*` by a developer in `.env`, which is insecure for production. No validation prevents this.

### Data & Schema Issues

#### 27. Google Places provider fails gracefully but silently
`google_places_provider.py` will fail silently if `GOOGLE_PLACES_API_KEY` is not set. There is no warning or logging when a data provider is unavailable.

#### 28. PostGIS spatial index not created in init_db
`Base.metadata.create_all` creates the tables but does not create spatial indexes (GIST indexes on `Place.geom`). Spatial queries without indexes will be slow as the dataset grows.

#### 29. Food verification score formula is naive
`app/modules/food/service.py:89` sets `place.food_score = min(100, verification_count * 20)` — every verification adds a flat 20 points regardless of the verifier's trustworthiness or the verification quality.

### Documentation Debt

#### 30. No API changelog or upgrade guide
There is no `CHANGELOG.md` or migration guide for API consumers.

#### 31. `backend/DECISIONS.md` and `backend/TASKS.md` don't exist
The AGENTS.md references these as expected documentation files, but neither exists in the project.

#### 32. No architecture diagram
The project has no visual architecture diagram (no `docs/ARCHITECTURE.md` or diagram assets).

---

## Summary of Immediate Action Items

1. Generate initial Alembic migration
2. Add `aiosqlite` to test dependencies
3. Add `vaderSentiment` to `pyproject.toml`
4. Convert `config.py` to use pydantic-settings `BaseSettings`
5. Configure database connection pooling
6. Fix test fixtures to create real test users in DB
7. Wire up Redis caching for high-traffic endpoints
8. Remove hardcoded JWT secret default in production config
9. Set up nginx reverse proxy configuration
10. Add rate limiting middleware

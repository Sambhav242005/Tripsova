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

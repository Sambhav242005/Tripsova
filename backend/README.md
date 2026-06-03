# Tripova Backend

**Tripova API — Powered by Travellers**

Tripova is a travel discovery platform that curates the best places, food, and experiences for travellers. This backend powers the Tripova mobile and web apps with a comprehensive API for destinations, places, food recommendations, trip planning, offline packs, and more.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 + PostGIS |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt |
| Geospatial | GeoAlchemy2 |
| Testing | pytest + pytest-asyncio |
| Linting | Ruff / Black |
| Async Server | Uvicorn |

## Setup Instructions

### 1. Clone the repository

```bash
git clone <repo-url>
cd backend
```

### 2. Create a virtual environment

```bash
python -m venv venv
source venv/bin/activate   # Linux/macOS
venv\Scripts\activate      # Windows
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

For development extras:

```bash
pip install -e ".[dev]"
```

Optional dependency groups:

```bash
pip install -e ".[redis]"     # Redis caching support
pip install -e ".[celery]"    # Background task queue
pip install -e ".[openai]"    # AI trip builder
pip install -e ".[praw]"      # Reddit Deep Review Mode
```

### 4. Set up the database

Make sure PostgreSQL 16+ with PostGIS is running. Then create the database:

```bash
createdb tripova
```

Copy the environment file and adjust as needed:

```bash
cp .env.example .env
```

### 5. Run migrations

```bash
alembic upgrade head
```

### 6. Seed data (optional)

```bash
python scripts/seed.py
```

### 7. Run the backend

```bash
uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.

## API Documentation

Once the server is running, visit:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## Core API Endpoints

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/auth` | Registration, login, token refresh |
| Users | `/api/users` | Profile management, preferences |
| Destinations | `/api/destinations` | City/country discovery |
| Places | `/api/places` | POIs, attractions, landmarks |
| Food | `/api/food` | Restaurants, cafes, local eats |
| Feed | `/api/feed` | Personalized content feed |
| Trips | `/api/trips` | Trip planning & itineraries |
| Offline | `/api/offline` | Offline pack generation |
| Maps | `/api/maps` | Map tiles & geodata |
| TripPods | `/api/trippods` | Social trip groups |
| Trust | `/api/trust` | Reviews, ratings, verification |
| Partners | `/api/partners` | Partner integrations |
| Bookings | `/api/bookings` | Booking management |
| Admin | `/api/admin` | Admin dashboard & management |
| Data Sources | `/api/datasources` | Data source management |

## Data Source Strategy

Tripova uses a layered data strategy:

1. **Main Moat Data** — Proprietary traveller reviews, ratings, and TripPods content. This is the core differentiator.
2. **Open Base Data** — OpenTripMap, OpenStreetMap, and other open geospatial datasets provide foundational POI data.
3. **Paid / Optional** — Google Places API for enriched details (photos, opening hours, etc.) when available.
4. **Research** — Reddit (via PRAW) for "Deep Review Mode" — sentiment analysis of traveller discussions.

## Offline Strategy

Offline packs are JSON bundles containing destinations, places, maps, and food data for a region:

- Generated on-demand via `/api/offline/pack`
- Configurable max pack size via `OFFLINE_PACK_MAX_SIZE_MB` (default 50 MB)
- Future: MapLibre GL + OpenMapTiles for vector tile offline maps

## Ranking Logic

Tripova scores and ranks places using a multi-factor algorithm:

- **External Rating Score** (normalised Google / OpenTripMap / other source ratings)
- **Review Confidence** (based on number of reviews — more reviews = higher confidence weight)
- **Popularity Score** (derived from traveller engagement, saves, shares, check-ins)
- **Tripova Score** = weighted combination of external rating, review confidence, and popularity, with optional Deep Review sentiment boost

The ranking formula is configurable and can be tuned per category (food vs attractions vs landmarks).

## Deep Review Mode

Deep Review Mode retrieves real traveller sentiment from Reddit communities to supplement structured ratings. It is:

- Used only when explicit traveller stories add value (e.g., "is this place worth it?")
- Powered by Reddit's API via PRAW (optional dependency)
- Cached to avoid redundant lookups
- Controllable per-request via query parameter

Reddit is the only third-party review source. No scraping of other platforms.

## Security Notes

- All passwords are hashed with bcrypt
- Authentication uses signed JWT tokens with configurable expiry
- CORS is restricted to trusted origins via `CORS_ORIGINS`
- Sensitive configuration lives in `.env` — never commit secrets
- The `.env.example` file contains placeholder values — always replace before production
- Debug mode (`DEBUG=true`) should never be enabled in production

## Known Limitations (MVP)

- No production-grade database connection pooling yet
- Optional APIs (Google Places, Reddit, OpenAI) require their own API keys
- Offline packs are currently simple JSON — vector tile support is future work
- No write-through cache layer (Redis support is optional and not yet wired)
- Rate limiting is not yet implemented
- File/image upload endpoints are planned but not yet built

## Next Steps

- [ ] Production database setup with proper connection pooling
- [ ] Redis caching layer for frequently accessed data
- [ ] Background task queue (Celery) for offline pack generation and data sync
- [ ] Mobile app integration (React Native)
- [ ] Real AI trip builder with OpenAI
- [ ] MapLibre + OpenMapTiles vector tile offline support
- [ ] Comprehensive test suite with CI/CD
- [ ] Rate limiting and API key management for third-party integrations

# Backend Decisions

## Architecture

### Why FastAPI over Django/Flask
- Native async support for IO-bound data source calls (OSM, Google Places, Reddit, BMTC)
- Pydantic v2 integration for request/response validation
- Auto-generated OpenAPI docs at /docs
- Lightweight — no Django-style monolithic overhead for a modular API

### Why SQLAlchemy 2.0 async over Prisma
- Prisma generates a separate schema file — SQLAlchemy keeps models in Python
- Raw SQL escape hatch when needed (e.g. complex ranking queries)
- GeoAlchemy2 for PostGIS support
- Alembic for mature migration management

### Feature module pattern
Each domain (auth, destinations, food, etc.) is a self-contained module with:
- `models.py` — SQLAlchemy ORM
- `schemas.py` — Pydantic v2 request/response
- `service.py` — business logic
- `routes.py` — FastAPI APIRouter

This keeps unrelated features isolated and makes testing straightforward.

## Data Sources

- **OpenStreetMap** via Geofabrik extracts — base map data
- **Wikidata / Wikivoyage** — structured travel info, descriptions
- **Google Places** — enrichment (requires API key, optional)
- **Reddit** — deep review only (not primary data), uses VADER sentiment
- **BMTC** — live Bengaluru transit (reverse-engineered, unofficial)
- **eRail** — live train data (keyless, delimited text)
- **Travelpayouts / Amadeus** — live flight data (optional, requires token)

## Offline Strategy

JSON Offline Trip Packs are the MVP approach. Future: OpenMapTiles + MBTiles + MapLibre for offline maps. No Google Maps tile downloading.

## Ranking

Multi-factor place ranking: popularity (25%), trust (25%), traveller verification (20%), freshness (10%), sentiment (10%), food (5%), safety (5%). Penalties for reports, low confidence, stale data. A 4.9 with 12 reviews does not beat 4.4 with 6000.

## Transport

Profiles are behavioural (refuel / overnight_rest / scheduled), not just speed. Water transport (FERRY, CRUISE) paused until route data is available.

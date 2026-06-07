# AGENTS.md — Tripova Coding Agent Guide

## Project Name

Tripova

## Core Positioning

Tripova is an India-first but globally scalable travel/community app.

Main tagline:

**Powered by Travellers**

Tripova helps users plan safer, smarter, and more trustworthy trips using live traveller-verified destination data, AI trip planning, verified companions, offline trip packs, food discovery, and booking-ready local partner listings.

## Main Product Goals

Tripova should solve these travel problems:

1. Outdated travel information
2. Too many apps needed for one trip
3. Lack of trustworthy local recommendations
4. Difficulty finding verified travel companions
5. Safety concerns for solo travellers and families
6. Difficulty finding Jain / Pure Veg / Vegan / Halal food while travelling
7. Low-network problems during trips
8. Confusing booking and local partner discovery

## Core MVP Features

1. Live Destination Feed
2. AI Trip Builder
3. TripPod verified companion matching
4. TrustScore for places, people, posts, and partners
5. PureFind food discovery
6. Offline Trip Packs
7. Partner/listing/booking-ready backend

## Backend Stack

Use Python backend.

Preferred stack:

* FastAPI
* PostgreSQL
* PostGIS
* SQLAlchemy 2.0
* Alembic
* Pydantic
* JWT Auth
* Redis optional
* Celery/RQ optional
* Pytest
* Ruff/Black

Do not use Prisma for this Python backend.

## Important Rules

### 1. Work only in the backend unless asked

Do not modify frontend files unless the task explicitly requires it.

### 2. Do not hardcode secrets

Use `.env` and `.env.example`.

### 3. Do not create fake empty APIs

Every MVP endpoint should return useful seed data, database data, or a clear fallback response.

### 4. Keep code modular

Use feature modules:

* auth
* users
* destinations
* places
* food
* feed
* trips
* offline
* maps
* data_sources
* trippods
* trust
* partners
* bookings
* admin

### 5. Data source rules

Tripova should use multiple data sources.

Main long-term data:

* Tripova traveller posts
* user verifications
* partner listings
* PureFind food checks
* booking reviews
* TripPod reviews

Open base data:

* OpenStreetMap
* Geofabrik
* Wikivoyage
* Wikidata
* OpenTripMap

Optional enrichment:

* Google Places
* Weather APIs
* booking APIs later

Deep Review only:

* Reddit
* public travel forums
* web search results

Reddit must not be used as the main data source. Use Reddit only when the user asks for deeper review, such as:

* "Is this place actually good?"
* "Check real traveller reviews."
* "Is this cafe safe/good for Jain food?"
* "Is this place overhyped?"

Do not store full Reddit comments unless allowed by API terms. Store only source URL, title, short summary, sentiment, confidence, fetched date, and expiry.

### 6. Map and offline rules

Do not download or cache Google Maps tiles.

Do not bulk download tiles from public OpenStreetMap tile servers.

For MVP offline support, use JSON Offline Trip Packs.

Offline Trip Pack should include:

* destination summary
* itinerary
* saved places
* food spots
* emergency places
* safety notes
* transport notes
* coordinates
* map metadata
* data version

Future offline maps should use legally generated OpenStreetMap-compatible vector tiles, OpenMapTiles, MBTiles, and MapLibre.

### 7. Ranking logic

Do not rank places only by star rating.

Use:

* rating
* review count
* review confidence
* source trust
* Tripova traveller verification
* freshness
* food verification
* safety reports
* sentiment score
* report penalties

A place with 4.9 rating and 12 reviews should not automatically beat a place with 4.4 rating and 6,000 reviews.

### 8. TrustScore logic

TrustScore applies to:

* users
* places
* partners
* feed posts
* food verifications
* TripPods

TrustScore should be explainable.

API responses should show score breakdown where possible.

### 9. Use shared error classes

Raise exceptions from `app/shared/errors.py` (e.g., `NotFoundException`, `UnauthorizedException`, `ValidationException`) instead of raw `HTTPException`. This keeps error responses consistent and the API predictable.

### 10. Pydantic v2 style

Always use Pydantic v2 API:

* `model_dump()` instead of `.dict()`
* `model_dump(mode="json")` instead of `.json()`
* `model_validate()` instead of `parse_obj()`
* Field type annotations instead of `Field(...)`

The existing codebase already follows this convention.

### 11. Standardize request/response format

Every endpoint must follow this pattern:

**Request** — accept a Pydantic `body: SchemaName` parameter. Convert to dict with:
* `body.model_dump()` for full creates (all fields required)
* `body.model_dump(exclude_none=True)` for partial updates (optional fields)

**Response** — always use `response_model=ResponseSchema` on the decorator. Services return ORM objects or dicts; routes wrap them in response schemas:

```python
@router.post("/example", response_model=ExampleResponse, status_code=201)
async def create(body: ExampleCreate, db: AsyncSession = Depends(get_db)):
    result = await create_example(db, body.model_dump())
    return ExampleResponse(**result)
```

### 12. Seed data must test ranking edge cases

The seed script must include places where a moderate rating with many reviews outranks a high rating with few reviews. This ensures the multi-factor ranking logic is always exercised and verifiable.

### 13. Every new feature module must include tests

Each new module or significant feature should include a test file under `tests/`. Tests should cover:

* Normal/expected usage
* Edge cases and null inputs
* Error conditions

Use `pytest-asyncio` for async tests.

### 14. Keep docs updated

After every significant edit or feature addition, update the relevant markdown files:

* `AGENTS.md` — if a new rule, stack change, or process change was introduced
* `docs/PROJECT_STRUCTURE.md` — if new files, modules, or structural changes were made
* `backend/TASKS.md` if available
* `backend/DECISIONS.md` if a major decision was made

This keeps the docs reliable for the next agent session.

### 15. Sentiment analysis

Tripova uses VADER for sentiment analysis on Reddit deep reviews and feed post content.

The sentiment module lives at `backend/app/shared/sentiment.py`.

VADER compound scores (-1 to 1) are mapped to a 0-100 scale.

Sentiment score is integrated into both:
- The tripova place ranking formula (10% weight)
- The deep review endpoint response

## Files To Read Before Coding

Before coding, read these files in order:

1. `AGENTS.md` (this file)
2. `docs/PROJECT_STRUCTURE.md`
3. `backend/ARCHITECTURE.md` (if available)
4. `backend/DATA_STRATEGY.md` (if available)
5. `backend/TASKS.md` (if available)
6. Inspect the existing code under `backend/`

## Coding Flow

1. Read the context files listed above.
   - `docs/PROJECT_STRUCTURE.md` includes a **Known Issues & Problems** section — review it before starting any work to avoid reintroducing known bugs.
2. Make a short implementation plan.
3. Then code.

After coding:

1. Run format/lint if configured.
2. Run tests if available.
3. Check FastAPI docs at `/docs`.
4. Update `backend/TASKS.md` if available.
5. Update `backend/DECISIONS.md` if a major decision was made.
6. Summarize changed files and pending work.

## Do Not Do

* Do not convert the backend to Node.js.
* Do not use Prisma.
* Do not make Tripova a generic travel app.
* Do not treat Instagram-style content as the main goal.
* Do not use Reddit as a primary database.
* Do not download Google Maps tiles.
* Do not bulk download public OSM tiles.
* Do not remove offline strategy.
* Do not remove PureFind.
* Do not remove TrustScore.
* Do not remove TripPod.
* Do not remove sentiment analysis.
* Do not create unused over-engineered microservices.

## Product Identity

Tripova should feel:

* premium
* trustworthy
* minimal
* useful
* traveller-powered
* India-first
* globally scalable

The backend should support this product direction, not just generic CRUD.

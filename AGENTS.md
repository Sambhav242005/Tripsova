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

Raise exceptions from `app/shared/errors.py` (`NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `BadRequestError`, `ConflictError`, `ValidationException`, `ServiceUnavailableError`) instead of raw `HTTPException`. This keeps error responses consistent and the API predictable.

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

### 16. BMTC Transit module — third-party API rules

The BMTC transit module (`backend/app/modules/transit/`) uses a reverse-engineered API from `bmtcmobileapp.karnataka.gov.in`. Follow these rules:

- Do **not** put excessive load on BMTC servers. Search results are cached (120s TTL in-process).
- The provider uses `httpx.AsyncClient` with 15s timeout. All endpoints are POST.
- The upstream API is unreliable (govt service). All endpoints must handle `BMTCApiError` gracefully — show clear error messages, never crash.
- The transit module is Bengaluru-only. Extending to other cities requires a new provider (e.g. `delhi_transport_provider.py`).
- Transit has no database models — it's a pure proxy layer.

### 17. Geo-lock rules

The geo-lock module (`backend/app/shared/geolock.py`) restricts API access by IP geolocation:

- Default: India-only (`IN`). Change via `GEO_LOCK_ALLOWED_COUNTRIES` in `.env`.
- Uses `api.country.is` (free, no API key) with 1-hour in-memory cache.
- Private IPs (10.x, 192.168.x, 127.x) return None — resolved by the middleware as "unknown location."
- `GEO_LOCK_STRICT=false` allows unknown locations through; `true` blocks them.
- Health check, docs, and root endpoints are always exempt.
- Per-endpoint blocking available via `require_india_only` dependency.
- For production, consider replacing `api.country.is` with a bundled GeoLite2 database.

### 18. URL routing rules (frontend)

The `app-provider.tsx` syncs `tab`, `sub`, and `dest` state to the browser URL:

- On mount, read `?tab=`, `?sub=`, `?dest=` from `window.location.search`.
- On state change, update URL via `window.history.replaceState` (not `pushState`) to avoid cluttering browser history.
- Default tab "home" is stripped from the URL for cleanliness.
- The `hydrated` flag gates URL writes to prevent SSR mismatch.
- When adding new navigation dimensions, mirror the pattern: read in the mount effect, write in a sync effect.

### 19. Water transport is paused

FERRY and CRUISE transport profiles are temporarily suspended:

- **Backend**: Profiles are commented out in `transport.py`. The `WATER` legacy alias maps to `TRAIN`.
- **Frontend**: Removed from all `TRANSPORT_META` objects and `travelModes` arrays.
- **Type**: `TransportKey` type excludes `FERRY | CRUISE` (kept as comments for quick un-pause).
- Do **not** re-enable water transport until routing data (routes, schedules, fares, port locations) is available.
- If re-enabling, restore in all places: `transport.py`, `types.ts`, `route-screen.tsx`, `journey-screen.tsx`, `plan-screen.tsx`.

### 20. New feature modules must register in main.py and docs

Every new module requires:
1. A directory under `backend/app/modules/<name>/` with `__init__.py`
2. Router imported and mounted in `backend/app/main.py`
3. Entry added to `docs/PROJECT_STRUCTURE.md` (module table + router table)
4. Test file added under `backend/tests/`
5. If it has frontend screens: register imports + route case in `app-shell.tsx`
6. If it has API types: add interfaces to `frontend/src/lib/types.ts`

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
* Do not remove offline strategy.
* Do not remove PureFind.
* Do not remove TrustScore.
* Do not remove TripPod.
* Do not remove sentiment analysis.

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


<!-- headroom:rtk-instructions -->
# RTK (Rust Token Killer) - Token-Optimized Commands

When running shell commands, **always prefix with `rtk`**. This reduces context
usage by 60-90% with zero behavior change. If rtk has no filter for a command,
it passes through unchanged — so it is always safe to use.

## Key Commands
```bash
# Git (59-80% savings)
rtk git status          rtk git diff            rtk git log

# Files & Search (60-75% savings)
rtk ls <path>           rtk read <file>         rtk grep <pattern>
rtk find <pattern>      rtk diff <file>

# Test (90-99% savings) — shows failures only
rtk pytest tests/       rtk cargo test          rtk test <cmd>

# Build & Lint (80-90% savings) — shows errors only
rtk tsc                 rtk lint                rtk cargo build
rtk prettier --check    rtk mypy                rtk ruff check

# Analysis (70-90% savings)
rtk err <cmd>           rtk log <file>          rtk json <file>
rtk summary <cmd>       rtk deps                rtk env

# GitHub (26-87% savings)
rtk gh pr view <n>      rtk gh run list         rtk gh issue list

# Infrastructure (85% savings)
rtk docker ps           rtk kubectl get         rtk docker logs <c>

# Package managers (70-90% savings)
rtk pip list            rtk pnpm install        rtk npm run <script>
```

## Rules
- In command chains, prefix each segment: `rtk git add . && rtk git commit -m "msg"`
- For debugging, use raw command without rtk prefix
- `rtk proxy <cmd>` runs command without filtering but tracks usage
<!-- /headroom:rtk-instructions -->

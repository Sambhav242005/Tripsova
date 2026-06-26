# Backend Tasks

## Completed

### Core Infrastructure
- FastAPI app with CORS, rate limiting, request logging, geo-lock
- SQLAlchemy 2.0 async with SQLite (dev) and PostgreSQL+PostGIS (prod)
- Alembic migrations for initial schema + refresh tokens
- JWT authentication with refresh tokens, bcrypt password hashing
- Shared error classes (NotFoundError, UnauthorizedError, etc.)
- VADER sentiment analysis
- Shared AI helper for OpenAI-compatible completions
- Diet-tag normalization module

### Feature Modules
- Auth (register, login, refresh, logout)
- Users (profile CRUD)
- Destinations (CRUD + search)
- Places (CRUD + multi-factor ranking)
- Food / PureFind (diet-tagged discovery + verification)
- Feed (traveller posts with freshness scoring)
- Trips (AI + rule-based itinerary generation, route planner, journey planner)
- Offline packs (generate + download JSON packs)
- Maps (OSM integration)
- TripPods (companion matching, member lifecycle)
- TrustScore (multi-entity scoring with explainability)
- Partners (local listings)
- Bookings (lifecycle management)
- Admin (dashboard)
- Data sources (OSM, Geofabrik, Wikidata, Wikivoyage, Google Places, weather, Reddit)
- Transit (BMTC Bengaluru bus tracker)
- Budget (shared expense tracking)

### Tests
- 30+ test files covering all modules except transit and geo-lock

## Pending

### High Priority
- [ ] Wire background worker (Celery/RQ) for offline pack generation and data ingestion
- [ ] Add image upload endpoints (models have URL fields, nothing populates them)
- [ ] Implement email/phone verification flow
- [ ] Add transit module tests (file exists, verify passes)
- [ ] Add geo-lock tests (file exists, verify passes)

### Medium Priority
- [ ] Audit remaining list endpoints for unbounded pagination
- [ ] Add logging when data providers are unavailable (Google Places)
- [ ] Trust-weight food verification score formula (currently flat min(100, count*20))
- [ ] Validate CORS origins; reject * in production

### Low Priority
- [ ] Replace api.country.is with bundled GeoLite2 database for production geo-lock
- [ ] Add Hindi/Tamil/Bengali sentiment analysis
- [ ] PostGIS geometry column + GIST spatial index

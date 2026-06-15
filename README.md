# Tripova

**Powered by Travellers**

Tripova is an India-first but globally scalable travel/community app that helps users plan safer, smarter, and more trustworthy trips. It combines live traveller-verified destination data, AI trip planning, verified companion matching, offline trip packs, food discovery, and booking-ready local partner listings into a single platform.

## Architecture

```
D:\Travel/
├── backend/         # FastAPI Python backend (PostgreSQL + PostGIS)
├── frontend/        # Next.js 16 SPA frontend (React 19, shadcn/ui)
├── deploy/          # Docker Compose + nginx deployment config
├── docs/            # Project documentation
└── .github/         # CI/CD workflows
```

## Backend Stack

| Layer | Technology |
|-------|-----------|
| Framework | FastAPI (Python 3.11+) |
| Database | PostgreSQL 16 + PostGIS |
| ORM | SQLAlchemy 2.0 (async) |
| Migrations | Alembic |
| Auth | JWT (python-jose) + bcrypt |
| Testing | pytest + pytest-asyncio |
| Data Sources | OSM, Geofabrik, Wikidata, Wikivoyage, Google Places, Reddit (deep review) |

## Frontend Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.6 (App Router) |
| UI | React 19, shadcn/ui, Tailwind CSS v4 |
| Icons | lucide-react |
| Theme | next-themes (light/dark) |
| Deployment | Docker (standalone output) |

## Core Features

1. **Live Destination Feed** — traveller-verified destination data with freshness scoring
2. **AI Trip Builder** — algorithmic multi-factor trip planning (style, diet, budget, safety)
3. **TripPod** — verified companion matching
4. **TrustScore** — explainable multi-factor scoring for places, people, posts, and partners
5. **PureFind** — food discovery with diet tags (PURE_VEG, JAIN, VEGAN, HALAL)
6. **Offline Trip Packs** — JSON bundles for low-network areas
7. **Partner/Booking** — local partner listings with booking lifecycle
8. **Deep Review** — Reddit-powered sentiment analysis for traveller verification
9. **Multi-Source Data** — 7 data providers (OSM, Geofabrik, Wikidata, Wikivoyage, Google Places, Weather, Reddit)

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate      # Windows
pip install -r requirements.txt
# Set up PostgreSQL 16 + PostGIS, create database "tripova"
cp .env.example .env
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Docker (full stack)

```bash
docker compose -f deploy/docker-compose.yml up --build
```

## API Docs

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Project Documentation

- [Project Structure & Known Issues](docs/PROJECT_STRUCTURE.md)
- [Agent Guide](AGENTS.md)
- [Backend README](backend/README.md)
- [Raspberry Pi Deployment](deploy/README.md)

## License

Private — Tripova Inc.

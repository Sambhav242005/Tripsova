import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import settings
from app.database import init_db, close_db
from app.shared.rate_limit import RateLimitMiddleware
from app.shared.request_logging import RequestLoggingMiddleware
from app.shared.geolock import GeoLockMiddleware, GEO_RESOLVER

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

from app.modules.auth.routes import router as auth_router
from app.modules.users.routes import router as users_router
from app.modules.destinations.routes import router as destinations_router
from app.modules.places.routes import router as places_router
from app.modules.food.routes import router as food_router
from app.modules.feed.routes import router as feed_router
from app.modules.trips.routes import router as trips_router
from app.modules.offline.routes import router as offline_router
from app.modules.maps.routes import router as maps_router
from app.modules.trippods.routes import router as trippods_router
from app.modules.trust.routes import router as trust_router
from app.modules.partners.routes import router as partners_router
from app.modules.bookings.routes import router as bookings_router
from app.modules.admin.routes import router as admin_router
from app.modules.data_sources.routes import router as datasources_router
from app.modules.transit.routes import router as transit_router
from app.modules.budget.routes import router as budget_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield
    await close_db()
    if GEO_RESOLVER is not None:
        await GEO_RESOLVER.close()


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Tripsova API — Powered by Travellers",
    lifespan=lifespan,
    docs_url="/docs",
)

app.add_middleware(RateLimitMiddleware)

app.add_middleware(RequestLoggingMiddleware)

app.add_middleware(GeoLockMiddleware)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


logger = logging.getLogger("tripsova")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


@app.get("/")
async def root():
    return {"name": settings.APP_NAME, "version": settings.APP_VERSION, "status": "running"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


app.include_router(auth_router)
app.include_router(users_router)
app.include_router(destinations_router)
app.include_router(places_router)
app.include_router(food_router)
app.include_router(feed_router)
app.include_router(trips_router)
app.include_router(offline_router)
app.include_router(maps_router)
app.include_router(trippods_router)
app.include_router(trust_router)
app.include_router(partners_router)
app.include_router(bookings_router)
app.include_router(admin_router)
app.include_router(datasources_router)
app.include_router(transit_router)
app.include_router(budget_router)

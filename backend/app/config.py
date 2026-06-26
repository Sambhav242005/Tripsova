from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings, loaded from environment / .env (pydantic-settings v2)."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    APP_NAME: str = "Tripsova API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Default to a zero-setup local SQLite DB; override with Postgres+PostGIS in production.
    DATABASE_URL: str = "sqlite+aiosqlite:///./tripsova_dev.db"

    # Required — must be provided via environment / .env. No insecure built-in default.
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24
    REFRESH_TOKEN_EXPIRY_DAYS: int = 30

    GOOGLE_PLACES_API_KEY: Optional[str] = None

    # AI trip generation (optional — falls back to the rule-based planner when disabled).
    # Provider-agnostic: any OpenAI-compatible chat-completions endpoint works
    # (Ollama, OpenRouter, OpenAI, vLLM, …). Defaults target a local Ollama daemon
    # serving the `gemma4:31b-cloud` model. Set AI_ENABLED=true to turn it on.
    AI_ENABLED: bool = False
    AI_API_URL: str = "http://localhost:11434/v1/chat/completions"
    AI_API_KEY: Optional[str] = None  # omit for local Ollama; required for hosted providers
    AI_MODEL: str = "gemma4:31b-cloud"
    AI_TIMEOUT_SECONDS: int = 120

    # Live train lookup (optional — falls back to the vendored ~2015 datameet/railways
    # snapshot when disabled or unreachable). Uses eRail's keyless getTrains endpoint
    # (delimited text, no API key) to return *current* train numbers + scheduled times
    # for a station pair. Results are cached in-process. Set TRAIN_LIVE_ENABLED=true on.
    TRAIN_LIVE_ENABLED: bool = False
    TRAIN_LIVE_API_URL: str = "https://erail.in/rail/getTrains.aspx"
    TRAIN_LIVE_TIMEOUT_SECONDS: int = 12

    # Live flight lookup (optional). Unlike trains there is no keyless source, so a
    # provider token is required to turn this on; otherwise flight legs stay distance
    # estimates. Two interchangeable providers behind FLIGHT_PROVIDER:
    #   "travelpayouts" — free, India-strong, cached/indicative prices (token only)
    #   "amadeus"       — real-time 400+ airlines, OAuth2 key+secret, free quota then paid
    FLIGHT_LIVE_ENABLED: bool = False
    FLIGHT_PROVIDER: str = "travelpayouts"  # "travelpayouts" | "amadeus"
    FLIGHT_LIVE_TIMEOUT_SECONDS: int = 12
    FLIGHT_CURRENCY: str = "INR"
    # Travelpayouts / Aviasales data API
    TRAVELPAYOUTS_TOKEN: Optional[str] = None
    TRAVELPAYOUTS_API_URL: str = "https://api.travelpayouts.com/aviasales/v3/prices_for_dates"
    # Amadeus Self-Service (test base; set to https://api.amadeus.com for production data)
    AMADEUS_API_KEY: Optional[str] = None
    AMADEUS_API_SECRET: Optional[str] = None
    AMADEUS_API_BASE: str = "https://test.api.amadeus.com"

    CORS_ORIGINS: str = "https://tripsova.sambhav-surana.online,http://localhost:5173,http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001,http://localhost:8000,http://127.0.0.1:8000"

    OFFLINE_PACK_MAX_SIZE_MB: int = 50

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 120
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10

    # Geo-lock — restrict API access to specific countries by IP geolocation.
    # Uses api.country.is (free, no key) with in-memory 1h cache.
    GEO_LOCK_ENABLED: bool = False
    GEO_LOCK_ALLOWED_COUNTRIES: str = "IN"
    GEO_LOCK_STRICT: bool = False

    @property
    def cors_origins_list(self) -> list[str]:
        origins = [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]
        # localhost and 127.0.0.1 are the same dev machine; allow both whenever
        # either is configured, so the frontend works regardless of which it uses.
        derived: list[str] = []
        for o in origins:
            if "localhost" in o:
                derived.append(o.replace("localhost", "127.0.0.1"))
            elif "127.0.0.1" in o:
                derived.append(o.replace("127.0.0.1", "localhost"))
        seen: set[str] = set()
        return [o for o in origins + derived if not (o in seen or seen.add(o))]

    @property
    def database_url_sync(self) -> str:
        """Synchronous SQLAlchemy URL (drops the async driver suffix) for Alembic offline mode."""
        return self.DATABASE_URL.replace("+asyncpg", "").replace("+aiosqlite", "")


settings = Settings()

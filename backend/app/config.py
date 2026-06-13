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

    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:8000"

    OFFLINE_PACK_MAX_SIZE_MB: int = 50

    RATE_LIMIT_ENABLED: bool = True
    RATE_LIMIT_PER_MINUTE: int = 120
    RATE_LIMIT_AUTH_PER_MINUTE: int = 10

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def database_url_sync(self) -> str:
        """Synchronous SQLAlchemy URL (drops the async driver suffix) for Alembic offline mode."""
        return self.DATABASE_URL.replace("+asyncpg", "").replace("+aiosqlite", "")


settings = Settings()

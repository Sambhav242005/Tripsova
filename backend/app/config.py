import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()


class Settings:
    APP_NAME: str = "Tripova API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://postgres:postgres@localhost:5432/tripova",
    )

    JWT_SECRET: str = os.getenv("JWT_SECRET", "change-me-in-production-tripova-jwt-secret-key")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = int(os.getenv("JWT_EXPIRY_HOURS", "72"))

    GOOGLE_PLACES_API_KEY: Optional[str] = os.getenv("GOOGLE_PLACES_API_KEY")

    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://localhost:3000,http://localhost:8000"
    ).split(",")

    OFFLINE_PACK_MAX_SIZE_MB: int = int(os.getenv("OFFLINE_PACK_MAX_SIZE_MB", "50"))

    @property
    def database_url_sync(self) -> str:
        return self.DATABASE_URL.replace("+asyncpg", "")


settings = Settings()

from pydantic_settings import BaseSettings
from pydantic import ValidationInfo, field_validator
from functools import lru_cache
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "DIT Forms"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "dit_forms"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Cloudinary (replaces R2)
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    @field_validator("CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET")
    @classmethod
    def validate_cloudinary(cls, v: str, info: ValidationInfo) -> str:
        if not v and os.getenv("ENVIRONMENT") == "production":
            raise ValueError(f"Cloudinary {info.field_name} is required in production")
        return v

    # Sentry
    SENTRY_DSN: str = ""
    GIT_SHA: str = "unknown"

    # CORS
    CORS_ORIGINS: str = ""  # comma-separated, empty = allow all

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()

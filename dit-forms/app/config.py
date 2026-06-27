from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "DIT Forms"
    DEBUG: bool = False

    # MongoDB
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "dit_forms"

    # JWT
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60 * 24  # 1 day

    # Cloudflare R2 (S3-compatible)
    R2_ENDPOINT: str = ""
    R2_ACCESS_KEY: str = ""
    R2_SECRET_KEY: str = ""
    R2_BUCKET: str = "dit-forms"
    R2_PUBLIC_URL: str = ""            # optional custom domain
    R2_PRESIGN_EXPIRES: int = 600      # 10 minutes

    # CORS
    CORS_ORIGINS: str = ""  # comma-separated, empty = allow all

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()

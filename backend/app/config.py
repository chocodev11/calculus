"""Application settings with explicit local and production contracts."""

from functools import lru_cache
import os
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]
LOCAL_DATABASE_PATH = PROJECT_ROOT / "backend" / "calculus.db"
LOCAL_DATABASE_URL = f"sqlite+aiosqlite:///{LOCAL_DATABASE_PATH.as_posix()}"


def _parse_debug(value: object) -> bool:
    """Parse current boolean values and the old ``DEBUG=release`` value."""
    if isinstance(value, bool):
        return value
    if value is None or value == "":
        return True
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on", "debug", "development"}:
            return True
        if normalized in {"false", "0", "no", "off", "release", "production"}:
            return False
    raise ValueError("DEBUG must be true or false (legacy value 'release' is supported)")


def _normalize_postgres_url(value: str) -> str:
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+asyncpg://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+asyncpg://", 1)
    if value.startswith("postgresql+asyncpg://"):
        return value
    return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", "backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        validate_default=True,
    )

    app_name: str = "Calculus API"
    app_env: Literal["local", "production"] = "local"
    debug: bool = True

    # Email settings
    email_sender: str = Field(default="", validation_alias="SENDER_EMAIL")
    email_password: str = Field(default="", validation_alias="SENDER_PASSWORD")

    # Database. Local always uses the repository-local SQLite file. Production
    # must provide DATABASE_URL and use PostgreSQL.
    database_url: str | None = Field(default=None, validation_alias="DATABASE_URL")

    # JWT
    secret_key: str = Field(
        default="calculus_jwt_secret_dev_key_change_in_prod",
        validation_alias="JWT_SECRET_KEY",
    )
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7
    email_verification_token_expire_minutes: int = 60 * 24

    # Email verification
    require_email_verification: bool = Field(default=False, validation_alias="REQUIRE_EMAIL_VERIFICATION")

    # URLs used in emails
    backend_base_url: str = "http://localhost:8000"

    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003",
        "http://localhost:3004",
        "http://localhost:4173",
        "https://calculus-mu.vercel.app",
    ]

    @field_validator("debug", mode="before")
    @classmethod
    def normalize_debug(cls, value: object) -> bool:
        return _parse_debug(value)

    @field_validator("app_env", mode="before")
    @classmethod
    def normalize_app_env(cls, value: object) -> str:
        normalized = str(value or "local").strip().lower()
        if normalized not in {"local", "production"}:
            raise ValueError("APP_ENV must be 'local' or 'production'")
        return normalized

    @model_validator(mode="after")
    def validate_runtime_contract(self) -> "Settings":
        legacy_release = str(os.environ.get("DEBUG", "")).strip().lower() == "release"
        explicit_app_env = os.environ.get("APP_ENV")
        if legacy_release and not explicit_app_env:
            self.app_env = "production"

        if self.app_env == "local":
            self.database_url = LOCAL_DATABASE_URL
            return self

        if self.debug:
            raise ValueError("production requires DEBUG=false")

        database_url = self.database_url
        if not database_url:
            raise ValueError("production requires DATABASE_URL")
        database_url = _normalize_postgres_url(database_url)
        if not database_url.startswith("postgresql+asyncpg://"):
            raise ValueError("production DATABASE_URL must use PostgreSQL")
        self.database_url = database_url
        return self


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings = get_settings()

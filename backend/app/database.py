from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from app.config import settings

database_url = settings.database_url

engine_kwargs = {
    "echo": False,
    "pool_pre_ping": True,
}


if database_url.startswith("postgresql+asyncpg://"):
    engine_kwargs["connect_args"] = {
        "ssl": "require",
        "statement_cache_size": 0,
    }

engine = create_async_engine(database_url, **engine_kwargs)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()

async def check_database_connection() -> None:
    """Fail fast when the configured database cannot accept a query."""
    async with engine.connect() as connection:
        await connection.execute(text("SELECT 1"))


async def init_db() -> None:
    """Load model metadata and verify connectivity.

    Schema creation belongs to Alembic. Keeping DDL out of application startup
    prevents a partially upgraded process from silently changing production data.
    """
    from app import models  # noqa: F401
    from app import sandbox_models  # noqa: F401

    await check_database_connection()

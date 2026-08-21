from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pathlib import Path
import json
from app.config import settings
from app.database import check_database_connection, init_db
from app.routers import auth_router, stories_router, courses_router, steps_router, progress_router, categories_router, shop_router, quests_router, admin_router, lessons_router
from app.routers.sandbox import router as sandbox_router

# Reduce noisy Uvicorn logs and show only SQL logs
import logging
# Default root level: show only warnings/errors (suppress app prints)
logging.basicConfig(level=logging.WARNING, format="%(levelname)s:%(name)s:%(message)s")
# Module logger
logger = logging.getLogger(__name__)

# Path to data folder
DATA_DIR = Path(__file__).parent.parent.parent / "data"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Fast Startup
    await init_db()
    await seed_achievements()
    await seed_shop_items()
    await seed_quests()
    yield
    # Shutdown

app = FastAPI(
    title=settings.app_name,
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router, prefix="/api/v1")
app.include_router(stories_router, prefix="/api/v1")
app.include_router(courses_router, prefix="/api/v1")
app.include_router(steps_router, prefix="/api/v1")
app.include_router(progress_router, prefix="/api/v1")
app.include_router(categories_router, prefix="/api/v1")
app.include_router(shop_router, prefix="/api/v1")
app.include_router(quests_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")
app.include_router(lessons_router, prefix="/api/v1")
app.include_router(sandbox_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {"message": "Calculus API", "version": "1.0.0"}


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/ready")
async def ready():
    """Report readiness only after the configured database accepts a query."""
    try:
        await check_database_connection()
    except Exception as exc:
        logger.warning("Database readiness check failed: %s", type(exc).__name__)
        raise HTTPException(status_code=503, detail="database_unavailable") from exc
    return {"status": "ready", "database": "connected"}


async def seed_achievements():
    """Seed achievements data"""
    from app.database import async_session
    from app.models import Achievement
    from sqlalchemy import select
    
    async with async_session() as db:
        # Check if achievements exist
        result = await db.execute(select(Achievement).limit(1))
        if result.scalar_one_or_none():
            return
        
        achievements_file = DATA_DIR / "achievements.json"
        with open(achievements_file, 'r', encoding='utf-8') as f:
            achievements_data = json.load(f).get("achievements", [])
        
        for ach_data in achievements_data:
            achievement = Achievement(**ach_data)
            db.add(achievement)
        
        await db.commit()
        logger.debug("✅ Achievements seeded!")


async def seed_shop_items():
    """Seed default shop items"""
    from app.database import async_session
    from app.models import ShopItem
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(select(ShopItem).limit(1))
        if result.scalar_one_or_none():
            return

        items = [
            {
                "name": "Streak Freeze",
                "description": "Skip 1 day without losing your streak",
                "icon": "🧊",
                "price": 120,
                "item_type": "streak_freeze",
                "effect_value": 1,
                "order_index": 1,
            },
            {
                "name": "XP Boost",
                "description": "2x XP for the next lesson",
                "icon": "⚡",
                "price": 60,
                "item_type": "xp_boost",
                "effect_value": 1,
                "order_index": 2,
            },
            {
                "name": "Heart",
                "description": "Restore 1 heart (life)",
                "icon": "❤️",
                "price": 35,
                "item_type": "heart",
                "effect_value": 1,
                "order_index": 3,
            },
            {
                "name": "Triple heart",
                "description": "Restore 3 hearts (lives)",
                "icon": "❤️❤️❤️",
                "price": 100,
                "item_type": "heart",
                "effect_value": 3,
                "order_index": 4,
            }
        ]

        for item_data in items:
            db.add(ShopItem(**item_data))

        await db.commit()
        logger.debug("✅ Shop items seeded!")


async def seed_quests():
    """Seed quest definitions from data/quests.json"""
    from app.database import async_session
    from app.models import Quest
    from sqlalchemy import select

    async with async_session() as db:
        result = await db.execute(select(Quest).limit(1))
        if result.scalar_one_or_none():
            return

        quests_file = DATA_DIR / "quests.json"
        if not quests_file.exists():
            logger.debug("⚠️ data/quests.json not found, skipping quest seed")
            return

        with open(quests_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        quests_data = data.get("quests", data) if isinstance(data, dict) else data

        for q in quests_data:
            quest = Quest(
                title=q["title"],
                description=q.get("description", ""),
                quest_type=q["quest_type"],
                requirement_type=q["requirement_type"],
                requirement_value=q.get("requirement_value", 1),
                coin_reward=q.get("coin_reward", 20),
                icon=q.get("icon", "📋"),
                is_active=True,
            )
            db.add(quest)

        await db.commit()
        logger.debug("✅ Quests seeded!")

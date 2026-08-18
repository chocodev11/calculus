import json
import asyncio
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models import Category

router = APIRouter(prefix="/categories", tags=["categories"])
DATA_DIR = Path(__file__).parent.parent.parent / "data"

@router.get("")
async def get_categories(db: AsyncSession = Depends(get_db)):
    """Return categories from database with fallback to categories.json."""
    result = await db.execute(select(Category))
    categories = result.scalars().all()
    if categories:
        return [
            {"id": c.id, "name": c.name, "slug": c.slug, "icon": c.icon}
            for c in categories
        ]

    categories_file = DATA_DIR / "categories.json"
    if not categories_file.exists():
        raise HTTPException(status_code=404, detail="categories not found")

    def _read():
        with open(categories_file, "r", encoding="utf-8") as f:
            return json.load(f)

    return await asyncio.to_thread(_read)

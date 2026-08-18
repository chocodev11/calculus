"""
Data Sync Script - Import JSON data to SQLite database
This script reads from /data/ folder and syncs to database safely with upsert.
"""

import json
import asyncio
import runpy
from pathlib import Path
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy import select, delete, text

import sys
sys.path.insert(0, str(Path(__file__).parent))
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

from app.models import Base, Category, Story, Chapter, Step, Slide, Achievement, ShopItem, Quest
from app.config import settings
import logging

logging.basicConfig(stream=sys.stdout, level=logging.DEBUG)
logger = logging.getLogger(__name__)

DATA_DIR = Path(__file__).parent.parent / "data"

async def ensure_course_jsons():
    """Run builder on any source folder not yet indexed."""
    data_dir = DATA_DIR
    raw_courses_dir = data_dir / 'raw_courses'
    courses_dir = data_dir / 'courses'
    index_path = courses_dir / '_index.json'
    existing_slugs = set()
    if index_path.exists():
        try:
            existing_slugs = set(json.loads(index_path.read_text(encoding='utf-8')).values())
        except Exception:
            existing_slugs = set()

    sources = []
    for entry in sorted(data_dir.iterdir()):
        if entry.is_dir() and (entry / 'course.json').is_file():
            sources.append(entry)
    if courses_dir.exists():
        for entry in sorted(courses_dir.iterdir()):
            if entry.is_dir() and (entry / 'course.json').is_file():
                sources.append(entry)
    if raw_courses_dir.exists():
        for entry in sorted(raw_courses_dir.iterdir()):
            if entry.is_dir() and (entry / 'course.json').is_file():
                sources.append(entry)

    if not sources:
        return

    def run_build():
        globs = runpy.run_path(str(Path(__file__).parent.parent / 'tools' / 'build_course_from_chapters.py'))
        build_fn = globs.get('build_course_from_folder')
        if not build_fn:
            return
        for src in sources:
            try:
                with open(src / 'course.json', 'r', encoding='utf-8') as f:
                    meta = json.load(f)
                slug = meta.get('slug') or meta.get('title')
            except Exception:
                slug = None
            if slug and slug in existing_slugs:
                continue
            out, salt = build_fn(str(src), str(courses_dir), encrypt=True)
            logger.info(f"Built course file: {out}")

    await asyncio.to_thread(run_build)


async def process_course(session: AsyncSession, course_data: dict, categories_map: dict):
    category_slug = course_data.get("category_slug", course_data.get("category", "giai-tich"))
    category = categories_map.get(category_slug)

    slug = course_data["slug"]
    result = await session.execute(select(Story).where(Story.slug == slug))
    story = result.scalar_one_or_none()

    if not story:
        story = Story(
            slug=slug,
            title=course_data["title"],
            description=course_data.get("description", ""),
            thumbnail_url=course_data.get("thumbnail_url"),
            illustration=course_data.get("illustration"),
            icon=course_data.get("icon", "📖"),
            color=course_data.get("color", "from-blue-500 to-blue-700"),
            difficulty=course_data.get("difficulty", "beginner"),
            is_published=course_data.get("is_published", True),
            is_featured=course_data.get("is_featured", False),
            order_index=course_data.get("order_index", 0),
            category_id=category.id if category else None
        )
        session.add(story)
        await session.flush()
    else:
        story.title = course_data["title"]
        story.description = course_data.get("description", story.description)
        story.thumbnail_url = course_data.get("thumbnail_url", story.thumbnail_url)
        story.illustration = course_data.get("illustration", story.illustration)
        story.icon = course_data.get("icon", story.icon)
        story.color = course_data.get("color", story.color)
        story.difficulty = course_data.get("difficulty", story.difficulty)
        story.is_published = course_data.get("is_published", story.is_published)
        story.is_featured = course_data.get("is_featured", story.is_featured)
        story.order_index = course_data.get("order_index", story.order_index)
        if category:
            story.category_id = category.id

    # Load existing chapters for this story
    ch_result = await session.execute(
        select(Chapter).where(Chapter.story_id == story.id).order_by(Chapter.order_index)
    )
    existing_chapters = {ch.order_index: ch for ch in ch_result.scalars().all()}

    json_chapters = sorted(course_data.get("chapters", []), key=lambda x: x.get("order_index", 0))
    for ch_idx, chapter_data in enumerate(json_chapters):
        order_idx = chapter_data.get("order_index", ch_idx)
        chapter = existing_chapters.get(order_idx)

        if not chapter:
            chapter = Chapter(
                story_id=story.id,
                title=chapter_data["title"],
                description=chapter_data.get("description", ""),
                order_index=order_idx,
            )
            session.add(chapter)
            await session.flush()
        else:
            chapter.title = chapter_data["title"]
            chapter.description = chapter_data.get("description", chapter.description)

        # Load existing steps for this chapter
        st_result = await session.execute(
            select(Step).where(Step.chapter_id == chapter.id).order_by(Step.order_index)
        )
        existing_steps = {st.order_index: st for st in st_result.scalars().all()}

        json_steps = sorted(chapter_data.get("steps", []), key=lambda x: x.get("order_index", 0))
        for st_idx, step_data in enumerate(json_steps):
            step_order_idx = step_data.get("order_index", st_idx)
            step = existing_steps.get(step_order_idx)

            if not step:
                step = Step(
                    chapter_id=chapter.id,
                    title=step_data["title"],
                    description=step_data.get("description", ""),
                    xp_reward=step_data.get("xp_reward", 10),
                    coin_reward=step_data.get("coin_reward", 5),
                    order_index=step_order_idx,
                )
                session.add(step)
                await session.flush()
            else:
                step.title = step_data["title"]
                step.description = step_data.get("description", step.description)
                step.xp_reward = step_data.get("xp_reward", step.xp_reward)
                step.coin_reward = step_data.get("coin_reward", step.coin_reward)

            # Resync slides for this step preserving step_id
            await session.execute(delete(Slide).where(Slide.step_id == step.id))
            for sl_idx, slide_data in enumerate(step_data.get("slides", [])):
                session.add(Slide(
                    step_id=step.id,
                    order_index=slide_data.get("order_index", sl_idx),
                    blocks=slide_data.get("blocks", [])
                ))


async def sync_data():
    """Sync all JSON data to database non-destructively."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    await ensure_course_jsons()

    async with async_session() as session:
        # 1. Sync categories
        categories_file = DATA_DIR / "categories.json"
        categories_map = {}
        if categories_file.exists():
            with open(categories_file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            categories_data = data.get("categories", data) if isinstance(data, dict) else data

            for cat in categories_data:
                existing = await session.execute(
                    select(Category).where(Category.slug == cat["slug"])
                )
                cat_obj = existing.scalar_one_or_none()
                if not cat_obj:
                    cat_obj = Category(
                        name=cat["name"],
                        slug=cat["slug"],
                        icon=cat.get("icon", "📚")
                    )
                    session.add(cat_obj)
                    await session.flush()
                else:
                    cat_obj.name = cat["name"]
                    cat_obj.icon = cat.get("icon", cat_obj.icon)
                categories_map[cat["slug"]] = cat_obj

        # 2. Sync courses from courses/ and raw_courses/
        course_source_dirs = [DATA_DIR / "courses", DATA_DIR / "raw_courses"]
        seen_slugs = set()

        for courses_dir in course_source_dirs:
            if not courses_dir.exists():
                continue
            for course_folder in sorted(courses_dir.iterdir()):
                if not course_folder.is_dir():
                    continue
                course_file = course_folder / "course.json"
                if not course_file.exists():
                    continue

                with open(course_file, 'r', encoding='utf-8') as f:
                    course_data = json.load(f)

                slug = course_data.get("slug")
                if not slug or slug in seen_slugs:
                    continue
                seen_slugs.add(slug)

                # Load chapters from subfolders
                chapters_dir = course_folder / "chapters"
                course_data["chapters"] = []
                if chapters_dir.exists():
                    for chapter_folder in sorted(chapters_dir.iterdir()):
                        if not chapter_folder.is_dir():
                            continue
                        chapter_file = chapter_folder / "chapter.json"
                        if not chapter_file.exists():
                            continue
                        with open(chapter_file, 'r', encoding='utf-8') as f:
                            chapter_data = json.load(f)
                        steps_dir = chapter_folder / "steps"
                        chapter_data["steps"] = []
                        if steps_dir.exists():
                            for step_file in sorted(steps_dir.glob("*.json")):
                                with open(step_file, 'r', encoding='utf-8') as f:
                                    step_data = json.load(f)
                                chapter_data["steps"].append(step_data)
                            chapter_data["steps"].sort(key=lambda x: x.get("order_index", 0))
                        course_data["chapters"].append(chapter_data)
                    course_data["chapters"].sort(key=lambda x: x.get("order_index", 0))

                await process_course(session, course_data, categories_map)

        await session.commit()

    await sync_achievements()
    await sync_shop_items()
    await sync_quests()
    logger.info("All data successfully synced without breaking progress!")


async def sync_achievements():
    """Upsert achievements from data/achievements.json."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    achievements_file = DATA_DIR / "achievements.json"
    if not achievements_file.exists():
        return

    with open(achievements_file, "r", encoding="utf-8") as f:
        achievements_data = json.load(f).get("achievements", [])

    async with async_session() as db:
        for ach_data in achievements_data:
            result = await db.execute(
                select(Achievement).where(
                    Achievement.title == ach_data["title"],
                    Achievement.requirement_type == ach_data["requirement_type"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                for k, v in ach_data.items():
                    setattr(existing, k, v)
            else:
                db.add(Achievement(**ach_data))
        await db.commit()


async def sync_shop_items():
    """Upsert shop items."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

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
        },
    ]

    async with async_session() as db:
        for item_data in items:
            result = await db.execute(
                select(ShopItem).where(
                    ShopItem.name == item_data["name"],
                    ShopItem.item_type == item_data["item_type"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                for k, v in item_data.items():
                    setattr(existing, k, v)
            else:
                db.add(ShopItem(**item_data, is_active=True))
        await db.commit()


async def sync_quests():
    """Upsert quests from data/quests.json."""
    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    quests_file = DATA_DIR / "quests.json"
    if not quests_file.exists():
        return

    with open(quests_file, "r", encoding="utf-8") as f:
        data = json.load(f)
    quests_data = data.get("quests", data) if isinstance(data, dict) else data

    async with async_session() as db:
        for q in quests_data:
            result = await db.execute(
                select(Quest).where(
                    Quest.title == q["title"],
                    Quest.quest_type == q["quest_type"],
                )
            )
            existing = result.scalar_one_or_none()
            if existing:
                existing.description = q.get("description", "")
                existing.requirement_type = q["requirement_type"]
                existing.requirement_value = q.get("requirement_value", 1)
                existing.coin_reward = q.get("coin_reward", 20)
                existing.icon = q.get("icon", "📋")
                existing.is_active = True
            else:
                db.add(Quest(
                    title=q["title"],
                    description=q.get("description", ""),
                    quest_type=q["quest_type"],
                    requirement_type=q["requirement_type"],
                    requirement_value=q.get("requirement_value", 1),
                    coin_reward=q.get("coin_reward", 20),
                    icon=q.get("icon", "📋"),
                    is_active=True,
                ))
        await db.commit()


if __name__ == "__main__":
    asyncio.run(sync_data())

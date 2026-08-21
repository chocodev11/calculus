import unittest

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.content_service import get_published_version, publish_version, rollback_to_version
from app.database import Base
from app.models import Category, Chapter, Slide, Step, Story
from app.sandbox_models import LessonVersion


LESSON = {
    "schema_version": "lesson-1",
    "id": "step-one",
    "content_key": "course/chapter/step-one",
    "title": "Step one",
    "description": "A test lesson",
    "course_slug": "course",
    "chapter_slug": "chapter",
    "slides": [
        {
            "id": "s01",
            "order_index": 0,
            "title": "First",
            "blocks": [{"id": "text-1", "block_type": "text", "content": {"paragraphs": ["Hello"]}}],
        },
    ],
}


class ContentServiceTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.session_factory = sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)

    async def asyncTearDown(self):
        await self.engine.dispose()

    async def test_publish_and_rollback_keep_stable_slide_row(self):
        async with self.session_factory() as db:
            category = Category(name="Math", slug="math")
            story = Story(slug="course", title="Course", is_published=True, category=category)
            chapter = Chapter(story=story, title="Chapter", order_index=0)
            step = Step(
                chapter=chapter,
                content_key="course/chapter/step-one",
                title="Step one",
                order_index=0,
            )
            db.add(step)
            await db.flush()

            draft = LessonVersion(
                step_id=step.id,
                manifest_id=step.content_key,
                version="draft",
                checksum="draft-checksum",
                content=LESSON,
                status="draft",
            )
            db.add(draft)
            await db.flush()

            published = await publish_version(db, step, draft)
            await db.commit()

            slides = (await db.execute(select(Slide).where(Slide.step_id == step.id))).scalars().all()
            self.assertEqual(len(slides), 1)
            slide_id = slides[0].id
            self.assertEqual(step.published_version_id, published.id)
            self.assertEqual((await get_published_version(db, step.id)).id, published.id)

            restored = await rollback_to_version(db, step, published)
            await db.commit()

            self.assertEqual(restored.id, published.id)
            self.assertEqual(step.published_version_id, published.id)
            self.assertEqual((await db.execute(select(Slide.id))).scalar_one(), slide_id)


if __name__ == "__main__":
    unittest.main()

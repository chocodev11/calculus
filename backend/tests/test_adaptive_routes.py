import unittest

from fastapi import Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.adaptive_contracts import AdaptiveAttemptRequest, AdaptiveSessionStartRequest
from app.content_service import publish_version
from app.database import Base
from app.models import Category, Chapter, Enrollment, Step, Story, User
from app.routers.adaptive import complete_session, create_or_resume_session, submit_attempt
from app.sandbox_models import AssessmentItem, LessonVersion


SOURCE = {
    "document": "chuyen-de-menh-de-va-tap-hop-toan-10.pdf",
    "sha256": "6f41eaf9891d0d35cf567a9b1503e5f5c26376d24406c8b687d83ac7bb4d58f3",
    "sourceQuestionIds": ["C1"],
    "page": 12,
    "section": "Bài 1. Mệnh đề",
}


def lesson_content():
    def metadata(difficulty):
        return {
            "difficulty": difficulty,
            "outcomeIds": ["logic.test"],
            "misconceptionIds": [],
            "sourceMapping": SOURCE,
        }

    mc = []
    for difficulty, count in (("easy", 7), ("medium", 7), ("hard", 7)):
        for _ in range(count):
            mc.append({
                "id": f"mc_{len(mc)}",
                "quiz_type": "multiple_choice",
                "question": "1 + 1 = ?",
                "options": [{"value": "2", "label": "2"}],
                "correct": "2",
                **metadata(difficulty),
            })
    tf = []
    for difficulty, count in (("easy", 3), ("hard", 3)):
        for _ in range(count):
            tf.append({
                "id": f"tf_{len(tf)}",
                "quiz_type": "true_false_group",
                "question": "Xét khẳng định.",
                "items": [{"id": str(index), "label": "1 + 1 = 2", "correct": True} for index in range(4)],
                **metadata(difficulty),
            })
    short = []
    for difficulty, count in (("easy", 3), ("hard", 3)):
        for _ in range(count):
            short.append({
                "id": f"short_{len(short)}",
                "quiz_type": "short_answer",
                "question": "Tính 1 + 1.",
                "correct": "2",
                "correct_answers": ["2"],
                **metadata(difficulty),
            })
    return {
        "id": "adaptive-step",
        "content_key": "demo/chapter/adaptive-step",
        "title": "Adaptive step",
        "course_slug": "demo",
        "chapter_slug": "chapter",
        "slides": [{
            "id": "s01",
            "order_index": 0,
            "blocks": [
                {"id": "mc-pool", "block_type": "assessment_pool", "content": {"poolId": "mc", "quiz_type": "multiple_choice", "items": mc}},
                {"id": "tf-pool", "block_type": "assessment_pool", "content": {"poolId": "tf", "quiz_type": "true_false_group", "items": tf}},
                {"id": "short-pool", "block_type": "assessment_pool", "content": {"poolId": "short", "quiz_type": "short_answer", "items": short}},
                {"id": "adaptive", "block_type": "adaptive_assessment", "content": {"questionCount": 9}},
            ],
        }],
    }


class AdaptiveRouteTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.engine = create_async_engine("sqlite+aiosqlite:///:memory:")
        async with self.engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
        self.session_factory = sessionmaker(self.engine, class_=AsyncSession, expire_on_commit=False)

    async def asyncTearDown(self):
        await self.engine.dispose()

    async def test_session_grades_server_side_and_complete_is_idempotent(self):
        async with self.session_factory() as db:
            category = Category(name="Math", slug="math")
            story = Story(slug="demo", title="Demo", is_published=True, category=category)
            chapter = Chapter(story=story, title="Chapter", order_index=0)
            step = Step(chapter=chapter, content_key="demo/chapter/adaptive-step", title="Adaptive", xp_reward=20, coin_reward=3)
            user = User(username="learner", email="learner@example.com", hashed_password="x", is_active=True)
            db.add_all([step, user])
            await db.flush()
            db.add(Enrollment(user_id=user.id, story_id=story.id))
            draft = LessonVersion(
                step_id=step.id,
                manifest_id=step.content_key,
                version="draft",
                checksum="draft",
                content=lesson_content(),
                status="draft",
            )
            db.add(draft)
            await db.flush()
            await publish_version(db, step, draft)
            await db.commit()

            started = await create_or_resume_session(
                AdaptiveSessionStartRequest(step_id=step.id), db, user
            )
            self.assertEqual(started["progress"]["total"], 9)
            self.assertNotIn("correct", str(started["current_item"]))
            first_request = None
            while started["current_item"] is not None:
                current = started["current_item"]
                if current["itemType"] == "boolean_group":
                    answer = [True, True, True, True]
                else:
                    answer = "2"
                request = AdaptiveAttemptRequest(
                    assessment_item_id=current["id"],
                    sequence=current["sequence"],
                    client_attempt_id=f"attempt-{current['sequence']}",
                    answer=answer,
                )
                if first_request is None:
                    first_request = request
                response = await submit_attempt(started["session_id"], request, db, user)
                self.assertTrue(response["correct"])
                if response["next_item"] is None:
                    break
                started["current_item"] = response["next_item"]
            completed = await complete_session(
                started["session_id"], Request({"type": "http", "method": "POST", "path": "/", "headers": []}), db, user
            )
            self.assertEqual(completed["correct"], 9)
            self.assertGreater(completed["xp_earned"], step.xp_reward)
            xp_after_first_completion = user.xp
            completed_again = await complete_session(
                started["session_id"], Request({"type": "http", "method": "POST", "path": "/", "headers": []}), db, user
            )
            self.assertEqual(completed_again["xp_earned"], completed["xp_earned"])
            self.assertEqual(user.xp, xp_after_first_completion)

            item_count = (await db.execute(select(AssessmentItem))).scalars().all()
            self.assertEqual(len(item_count), 33)


if __name__ == "__main__":
    unittest.main()

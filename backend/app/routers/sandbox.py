from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user
from app.database import get_db
from app.models import Chapter, Enrollment, Step, User
from app.sandbox_contracts import (
    AssessmentAttemptRequest,
    AssessmentAttemptResponse,
    SandboxEventBatch,
    SandboxCompletionResponse,
)
from app.sandbox_grading import GRADER_VERSION, grade_answer
from app.sandbox_models import AssessmentAttempt, AssessmentItem, LessonVersion, MasteryState, SandboxEvent


router = APIRouter(prefix="/sandbox", tags=["sandbox"])


async def _load_item_for_user(
    db: AsyncSession,
    user_id: int,
    item_id: int,
) -> tuple[AssessmentItem, LessonVersion]:
    result = await db.execute(select(AssessmentItem).where(AssessmentItem.id == item_id))
    item = result.scalar_one_or_none()
    if item is None or not item.is_active:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assessment item not found")

    lesson_result = await db.execute(
        select(LessonVersion, Step, Chapter)
        .join(Step, Step.id == LessonVersion.step_id)
        .join(Chapter, Chapter.id == Step.chapter_id)
        .where(LessonVersion.id == item.lesson_version_id, LessonVersion.status == "published")
    )
    lesson_row = lesson_result.one_or_none()
    if lesson_row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson version not found")
    lesson, _step, chapter = lesson_row

    enrollment_result = await db.execute(
        select(Enrollment.id).where(
            Enrollment.user_id == user_id,
            Enrollment.story_id == chapter.story_id,
        )
    )
    if enrollment_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must enroll in the course first")
    return item, lesson


async def _record_mastery_evidence(
    db: AsyncSession,
    user_id: int,
    item: AssessmentItem,
    correct: bool,
) -> None:
    for outcome_id in item.outcome_ids or []:
        if not isinstance(outcome_id, str) or not outcome_id:
            continue
        result = await db.execute(
            select(MasteryState).where(
                MasteryState.user_id == user_id,
                MasteryState.outcome_id == outcome_id,
            )
        )
        mastery = result.scalar_one_or_none()
        if mastery is None:
            mastery = MasteryState(user_id=user_id, outcome_id=outcome_id, mastery_level="not_started", evidence={})
            db.add(mastery)
            await db.flush()
        evidence = dict(mastery.evidence or {})
        evidence["attempts"] = int(evidence.get("attempts", 0)) + 1
        evidence["correctAttempts"] = int(evidence.get("correctAttempts", 0)) + int(correct)
        mastery.evidence = evidence
        mastery.mastery_level = "mastered" if evidence["correctAttempts"] >= 2 else "developing"


async def _load_lesson_for_user(
    db: AsyncSession,
    user_id: int,
    lesson_version_id: int,
) -> LessonVersion:
    result = await db.execute(
        select(LessonVersion, Chapter)
        .join(Step, Step.id == LessonVersion.step_id)
        .join(Chapter, Chapter.id == Step.chapter_id)
        .where(LessonVersion.id == lesson_version_id, LessonVersion.status == "published")
    )
    row = result.one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson version not found")
    lesson, chapter = row
    enrollment_result = await db.execute(
        select(Enrollment.id).where(
            Enrollment.user_id == user_id,
            Enrollment.story_id == chapter.story_id,
        )
    )
    if enrollment_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You must enroll in the course first")
    return lesson


@router.post("/assessment/attempts", response_model=AssessmentAttemptResponse)
async def submit_assessment_attempt(
    request: AssessmentAttemptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AssessmentAttemptResponse:
    item, lesson = await _load_item_for_user(db, current_user.id, request.assessment_item_id)
    existing_result = await db.execute(
        select(AssessmentAttempt).where(
            AssessmentAttempt.user_id == current_user.id,
            AssessmentAttempt.client_attempt_id == request.client_attempt_id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        if existing.assessment_item_id != item.id:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="client_attempt_id is already used")
        return AssessmentAttemptResponse(
            attempt_id=existing.id,
            assessment_item_id=existing.assessment_item_id,
            correct=existing.is_correct,
            score=existing.score,
            normalized_answer=existing.normalized_answer,
            grader_version=existing.grader_version,
        )

    result = grade_answer(item.item_type, request.answer, item.answer_key)
    attempt = AssessmentAttempt(
        user_id=current_user.id,
        assessment_item_id=item.id,
        lesson_version_id=lesson.id,
        client_attempt_id=request.client_attempt_id,
        answer=request.answer,
        normalized_answer=result.get("normalized_answer"),
        is_correct=result["correct"],
        score=1 if result["correct"] else 0,
        grader_version=result.get("grader_version", GRADER_VERSION),
    )
    db.add(attempt)
    await db.flush()
    await _record_mastery_evidence(db, current_user.id, item, result["correct"])
    await db.commit()
    await db.refresh(attempt)
    return AssessmentAttemptResponse(
        attempt_id=attempt.id,
        assessment_item_id=attempt.assessment_item_id,
        correct=attempt.is_correct,
        score=attempt.score,
        normalized_answer=attempt.normalized_answer,
        grader_version=attempt.grader_version,
    )


@router.post("/lessons/{lesson_version_id}/complete", response_model=SandboxCompletionResponse)
async def complete_sandbox_lesson(
    lesson_version_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> SandboxCompletionResponse:
    lesson = await _load_lesson_for_user(db, current_user.id, lesson_version_id)
    item_result = await db.execute(
        select(AssessmentItem).where(
            AssessmentItem.lesson_version_id == lesson.id,
            AssessmentItem.is_active.is_(True),
        )
    )
    items = item_result.scalars().all()
    item_ids = [item.id for item in items]
    correct_ids: set[int] = set()
    if item_ids:
        attempts_result = await db.execute(
            select(AssessmentAttempt.assessment_item_id).where(
                AssessmentAttempt.user_id == current_user.id,
                AssessmentAttempt.lesson_version_id == lesson.id,
                AssessmentAttempt.is_correct.is_(True),
                AssessmentAttempt.assessment_item_id.in_(item_ids),
            )
        )
        correct_ids = set(attempts_result.scalars().all())

    outcome_ids = {outcome for item in items for outcome in (item.outcome_ids or []) if isinstance(outcome, str)}
    mastery: dict[str, str] = {}
    if outcome_ids:
        mastery_result = await db.execute(
            select(MasteryState).where(
                MasteryState.user_id == current_user.id,
                MasteryState.outcome_id.in_(outcome_ids),
            )
        )
        mastery = {state.outcome_id: state.mastery_level for state in mastery_result.scalars().all()}

    score = len(correct_ids) / len(items) if items else 0.0
    completed = bool(items) and score >= 0.8 and all(mastery.get(outcome) == "mastered" for outcome in outcome_ids)
    return SandboxCompletionResponse(
        lesson_version_id=lesson.id,
        completed=completed,
        score=score,
        mastery=mastery,
    )


@router.post("/events")
async def ingest_sandbox_events(
    request: SandboxEventBatch,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, int]:
    event_ids = [event.id for event in request.events]
    existing_result = await db.execute(
        select(SandboxEvent.event_id).where(
            SandboxEvent.user_id == current_user.id,
            SandboxEvent.event_id.in_(event_ids),
        )
    )
    existing_ids = set(existing_result.scalars().all())
    seen_ids = set(existing_ids)
    accepted = 0
    for event in request.events:
        if event.id in seen_ids:
            continue
        seen_ids.add(event.id)
        db.add(
            SandboxEvent(
                user_id=current_user.id,
                event_id=event.id,
                session_id=event.sessionId,
                manifest_id=event.manifestId,
                manifest_version=event.manifestVersion,
                event_type=event.type,
                sequence=event.sequence,
                payload=event.payload,
                occurred_at=event.occurredAt,
            )
        )
        accepted += 1
    await db.commit()
    return {"accepted": accepted, "ignored": len(request.events) - accepted}

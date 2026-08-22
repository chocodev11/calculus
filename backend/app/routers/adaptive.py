from __future__ import annotations

from copy import deepcopy
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.adaptive_contracts import AdaptiveAttemptRequest, AdaptiveSessionStartRequest
from app.adaptive_learning import (
    DELIVERY_TYPES,
    TYPE_QUOTAS,
    band_mix,
    bonus_xp,
    delivery_type,
    next_band,
    score_percent,
    select_next_item,
    session_summary,
    update_recovery_state,
)
from app.auth import get_current_user
from app.content_service import get_published_version
from app.database import get_db
from app.lesson_contract import _strip_answer_fields
from app.models import (
    Chapter,
    Enrollment,
    ShopItem,
    Step,
    StepProgress,
    StreakWeek,
    User,
    UserInventory,
)
from app.routers.quests import tick_quest_progress
from app.routers.steps import check_and_award_user_achievements, update_streak
from app.sandbox_grading import grade_answer
from app.sandbox_models import (
    AdaptiveSession,
    AdaptiveSessionItem,
    AssessmentAttempt,
    AssessmentItem,
    LessonVersion,
    MasteryState,
)


router = APIRouter(prefix="/adaptive", tags=["adaptive-learning"])
TOTAL_QUESTIONS = 9


async def _load_step_for_user(db: AsyncSession, user_id: int, step_id: int) -> Step:
    result = await db.execute(
        select(Step)
        .options(selectinload(Step.chapter).selectinload(Chapter.story))
        .where(Step.id == step_id)
    )
    step = result.scalar_one_or_none()
    if step is None:
        raise HTTPException(status_code=404, detail="Step not found")
    enrollment = await db.execute(
        select(Enrollment.id).where(
            Enrollment.user_id == user_id,
            Enrollment.story_id == step.chapter.story_id,
        )
    )
    if enrollment.scalar_one_or_none() is None:
        raise HTTPException(status_code=403, detail="You must enroll in the course first")
    return step


async def _load_session(
    db: AsyncSession,
    user_id: int,
    session_id: int,
    *,
    for_update: bool = False,
) -> AdaptiveSession:
    statement = select(AdaptiveSession).where(
        AdaptiveSession.id == session_id,
        AdaptiveSession.user_id == user_id,
    )
    if for_update:
        statement = statement.with_for_update()
    result = await db.execute(statement)
    session = result.scalar_one_or_none()
    if session is None:
        raise HTTPException(status_code=404, detail="Adaptive session not found")
    return session


async def _load_items(db: AsyncSession, lesson_version_id: int) -> list[AssessmentItem]:
    result = await db.execute(
        select(AssessmentItem)
        .where(
            AssessmentItem.lesson_version_id == lesson_version_id,
            AssessmentItem.is_active.is_(True),
        )
        .order_by(AssessmentItem.id)
    )
    items = result.scalars().all()
    if not items:
        raise HTTPException(status_code=422, detail="Published lesson has no adaptive assessment pool")
    return items


async def _load_history(db: AsyncSession, session_id: int) -> list[AdaptiveSessionItem]:
    result = await db.execute(
        select(AdaptiveSessionItem)
        .where(AdaptiveSessionItem.session_id == session_id)
        .order_by(AdaptiveSessionItem.sequence)
    )
    return list(result.scalars().all())


def _history_payload(rows: list[AdaptiveSessionItem]) -> list[dict[str, Any]]:
    return [
        {
            "item_key": str(row.assessment_item_id),
            "difficulty": row.difficulty,
            "item_type": row.item_type,
            "is_correct": row.is_correct,
        }
        for row in rows
    ]


def _item_candidate(item: AssessmentItem, last_seen: dict[int, int]) -> dict[str, Any]:
    return {
        "id": item.id,
        "item_key": str(item.id),
        "item_type": item.item_type,
        "difficulty": item.difficulty,
        "outcome_ids": item.outcome_ids or [],
        "last_seen_sequence": last_seen.get(item.id),
    }


def _public_item(item: AssessmentItem, sequence: int) -> dict[str, Any]:
    payload = _strip_answer_fields(deepcopy(item.public_payload or {}))
    return {
        "id": item.id,
        "itemKey": item.item_key,
        "sequence": sequence,
        "itemType": item.item_type,
        "quizType": payload.get("quiz_type", item.item_type),
        "difficulty": item.difficulty,
        "outcomeIds": list(item.outcome_ids or []),
        "misconceptionIds": list(item.misconception_ids or []),
        "sourceMapping": deepcopy(item.source_mapping or {}),
        "payload": payload,
    }


async def _current_item(
    db: AsyncSession,
    session_id: int,
) -> tuple[AdaptiveSessionItem, AssessmentItem] | None:
    result = await db.execute(
        select(AdaptiveSessionItem, AssessmentItem)
        .join(AssessmentItem, AssessmentItem.id == AdaptiveSessionItem.assessment_item_id)
        .where(
            AdaptiveSessionItem.session_id == session_id,
            AdaptiveSessionItem.is_correct.is_(None),
        )
        .order_by(AdaptiveSessionItem.sequence)
        .limit(1)
    )
    return result.one_or_none()


async def _last_seen_items(
    db: AsyncSession,
    user_id: int,
    item_ids: list[int],
) -> dict[int, int]:
    if not item_ids:
        return {}
    result = await db.execute(
        select(AssessmentAttempt.assessment_item_id, func.max(AssessmentAttempt.id))
        .where(
            AssessmentAttempt.user_id == user_id,
            AssessmentAttempt.assessment_item_id.in_(item_ids),
        )
        .group_by(AssessmentAttempt.assessment_item_id)
    )
    return {int(item_id): int(last_id) for item_id, last_id in result.all()}


async def _mastery_for_items(
    db: AsyncSession,
    user_id: int,
    items: list[AssessmentItem],
) -> dict[str, dict[str, Any]]:
    outcome_ids = {
        outcome_id
        for item in items
        for outcome_id in (item.outcome_ids or [])
        if isinstance(outcome_id, str) and outcome_id
    }
    if not outcome_ids:
        return {}
    result = await db.execute(
        select(MasteryState).where(
            MasteryState.user_id == user_id,
            MasteryState.outcome_id.in_(outcome_ids),
        )
    )
    return {
        state.outcome_id: {
            **(state.evidence or {}),
            "accuracy": (
                (state.evidence or {}).get("correctAttempts", 0)
                / max(1, (state.evidence or {}).get("attempts", 0))
            ),
        }
        for state in result.scalars().all()
    }


async def _serve_next_item(
    db: AsyncSession,
    session: AdaptiveSession,
    items: list[AssessmentItem],
    history_rows: list[AdaptiveSessionItem],
) -> AdaptiveSessionItem:
    last_seen = await _last_seen_items(db, session.user_id, [item.id for item in items])
    mastery = await _mastery_for_items(db, session.user_id, items)
    candidates = [_item_candidate(item, last_seen) for item in items]
    history = _history_payload(history_rows)
    state = dict(session.state or {})
    selected = select_next_item(candidates, history, session.band, state, mastery)
    if selected is None:
        raise HTTPException(status_code=422, detail="Adaptive pool cannot satisfy the session quotas")
    next_sequence = len(history_rows) + 1
    row = AdaptiveSessionItem(
        session_id=session.id,
        assessment_item_id=int(selected["id"]),
        sequence=next_sequence,
        difficulty=str(selected["difficulty"]),
        item_type=str(selected["item_type"]),
    )
    db.add(row)
    await db.flush()
    return row


def _progress_payload(rows: list[AdaptiveSessionItem]) -> dict[str, Any]:
    answered = [row for row in rows if row.is_correct is not None]
    correct = sum(bool(row.is_correct) for row in answered)
    return {
        "answered": len(answered),
        "total": TOTAL_QUESTIONS,
        "correct": correct,
        "score": round(correct / TOTAL_QUESTIONS * 100) if answered else 0,
        "current": min(TOTAL_QUESTIONS, len(answered) + 1),
    }


async def _serialize_session(
    db: AsyncSession,
    session: AdaptiveSession,
    rows: list[AdaptiveSessionItem] | None = None,
) -> dict[str, Any]:
    rows = rows if rows is not None else await _load_history(db, session.id)
    current = await _current_item(db, session.id) if session.status == "active" else None
    current_payload = _public_item(current[1], current[0].sequence) if current else None
    targets = dict(session.target_counts or {})
    target_counts = {key: int(value) for key, value in targets.items() if key in {"easy", "medium", "hard"}}
    return {
        "session_id": session.id,
        "step_id": session.step_id,
        "lesson_version_id": session.lesson_version_id,
        "status": session.status,
        "band": session.band,
        "target_counts": target_counts,
        "progress": _progress_payload(rows),
        "current_item": current_payload,
        "summary": (session.state or {}).get("summary") if session.status == "completed" else None,
    }


async def _record_mastery(
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
            mastery = MasteryState(
                user_id=user_id,
                outcome_id=outcome_id,
                mastery_level="not_started",
                evidence={},
            )
            db.add(mastery)
            await db.flush()
        evidence = dict(mastery.evidence or {})
        evidence["attempts"] = int(evidence.get("attempts", 0)) + 1
        evidence["correctAttempts"] = int(evidence.get("correctAttempts", 0)) + int(correct)
        evidence["lastDifficulty"] = item.difficulty
        mastery.evidence = evidence
        accuracy = evidence["correctAttempts"] / max(1, evidence["attempts"])
        mastery.mastery_level = "mastered" if accuracy >= 0.8 and evidence["attempts"] >= 3 else "developing"


async def _complete_streak_week(
    db: AsyncSession,
    user: User,
    tz_offset: int | None,
) -> None:
    local_now = datetime.utcnow() + timedelta(minutes=tz_offset or 0)
    today = local_now.date() if tz_offset is not None else date.today()
    monday = today - timedelta(days=today.weekday())
    week_start = monday.isoformat()
    result = await db.execute(
        select(StreakWeek).where(
            StreakWeek.user_id == user.id,
            StreakWeek.week_start == week_start,
        )
    )
    row = result.scalar_one_or_none()
    days = list(row.days or [False] * 7) if row else [False] * 7
    days[today.weekday()] = True
    if row is None:
        db.add(StreakWeek(user_id=user.id, week_start=week_start, days=days))
    else:
        row.days = days


async def _apply_reward(
    db: AsyncSession,
    user: User,
    step: Step,
    base_xp: int,
    base_coins: int,
) -> tuple[int, int, bool]:
    boost_result = await db.execute(
        select(UserInventory)
        .join(ShopItem, UserInventory.item_id == ShopItem.id)
        .where(
            UserInventory.user_id == user.id,
            ShopItem.item_type == "xp_boost",
            UserInventory.quantity > 0,
        )
    )
    boost = boost_result.scalar_one_or_none()
    xp_boost_active = boost is not None
    xp = base_xp * 2 if boost else base_xp
    if boost:
        boost.quantity -= 1
    user.xp = (user.xp or 0) + xp
    user.coins = (user.coins or 0) + base_coins
    return xp, base_coins, xp_boost_active


async def _attempt_response(
    db: AsyncSession,
    session: AdaptiveSession,
    attempt: AssessmentAttempt,
    item: AssessmentItem,
) -> dict[str, Any]:
    rows = await _load_history(db, session.id)
    current = await _current_item(db, session.id) if session.status == "active" else None
    key = item.answer_key if isinstance(item.answer_key, dict) else {}
    return {
        "session_id": session.id,
        "attempt_id": attempt.id,
        "assessment_item_id": attempt.assessment_item_id,
        "sequence": attempt.sequence,
        "correct": attempt.is_correct,
        "score": attempt.score,
        "difficulty": item.difficulty,
        "xp_earned": 0,
        "feedback": key.get("explanation", "") if attempt.is_correct is not None else "",
        "progress": _progress_payload(rows),
        "next_item": _public_item(current[1], current[0].sequence) if current else None,
        "ready_to_complete": len(rows) == TOTAL_QUESTIONS and all(row.is_correct is not None for row in rows),
    }


@router.post("/sessions")
async def create_or_resume_session(
    request: AdaptiveSessionStartRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    step = await _load_step_for_user(db, current_user.id, request.step_id)
    version = await get_published_version(db, step.id)
    if version is None:
        raise HTTPException(status_code=404, detail="Lesson content is not published")
    items = await _load_items(db, version.id)

    active_result = await db.execute(
        select(AdaptiveSession)
        .where(
            AdaptiveSession.user_id == current_user.id,
            AdaptiveSession.step_id == step.id,
            AdaptiveSession.status == "active",
        )
        .order_by(AdaptiveSession.id.desc())
        .limit(1)
    )
    session = active_result.scalar_one_or_none()
    if session is not None and session.lesson_version_id != version.id:
        session.status = "abandoned"
        session = None

    if session is None:
        previous_result = await db.execute(
            select(AdaptiveSession)
            .where(
                AdaptiveSession.user_id == current_user.id,
                AdaptiveSession.step_id == step.id,
                AdaptiveSession.status == "completed",
            )
            .order_by(AdaptiveSession.id.desc())
            .limit(1)
        )
        previous = previous_result.scalar_one_or_none()
        band = int((previous.state or {}).get("next_band", 0)) if previous else 0
        session = AdaptiveSession(
            user_id=current_user.id,
            step_id=step.id,
            lesson_version_id=version.id,
            band=max(0, min(4, band)),
            target_counts={**band_mix(band), **TYPE_QUOTAS},
            state={"consecutive_wrong": 0, "recovery_active": False, "recovery_triggered": 0},
        )
        db.add(session)
        await db.flush()
        await _serve_next_item(db, session, items, [])
        await db.commit()
    else:
        await db.commit()

    return await _serialize_session(db, session)


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    session = await _load_session(db, current_user.id, session_id)
    await _load_step_for_user(db, current_user.id, session.step_id)
    return await _serialize_session(db, session)


@router.post("/sessions/{session_id}/attempts")
async def submit_attempt(
    session_id: int,
    request: AdaptiveAttemptRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    session = await _load_session(db, current_user.id, session_id, for_update=True)
    if session.status != "active":
        existing_result = await db.execute(
            select(AssessmentAttempt).where(
                AssessmentAttempt.user_id == current_user.id,
                AssessmentAttempt.adaptive_session_id == session.id,
                AssessmentAttempt.client_attempt_id == request.client_attempt_id,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing is not None:
            item = await db.get(AssessmentItem, existing.assessment_item_id)
            return await _attempt_response(db, session, existing, item)
        raise HTTPException(status_code=409, detail="Adaptive session is no longer active")

    existing_result = await db.execute(
        select(AssessmentAttempt).where(
            AssessmentAttempt.user_id == current_user.id,
            AssessmentAttempt.client_attempt_id == request.client_attempt_id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        if existing.adaptive_session_id != session.id:
            raise HTTPException(status_code=409, detail="client_attempt_id is already used")
        item = await db.get(AssessmentItem, existing.assessment_item_id)
        return await _attempt_response(db, session, existing, item)

    current = await _current_item(db, session.id)
    if current is None:
        raise HTTPException(status_code=409, detail="There is no unanswered item in this session")
    session_item, item = current
    if session_item.sequence != request.sequence or session_item.assessment_item_id != request.assessment_item_id:
        raise HTTPException(status_code=409, detail="The submitted item is not the current session item")

    result = grade_answer(item.item_type, request.answer, item.answer_key)
    attempt = AssessmentAttempt(
        user_id=current_user.id,
        assessment_item_id=item.id,
        lesson_version_id=session.lesson_version_id,
        adaptive_session_id=session.id,
        sequence=session_item.sequence,
        client_attempt_id=request.client_attempt_id,
        answer=request.answer,
        normalized_answer=result.get("normalized_answer"),
        is_correct=bool(result["correct"]),
        score=1 if result["correct"] else 0,
        grader_version=result.get("grader_version", "sandbox-v1"),
    )
    db.add(attempt)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        existing_result = await db.execute(
            select(AssessmentAttempt).where(
                AssessmentAttempt.user_id == current_user.id,
                AssessmentAttempt.client_attempt_id == request.client_attempt_id,
            )
        )
        existing = existing_result.scalar_one_or_none()
        if existing is None:
            raise
        item = await db.get(AssessmentItem, existing.assessment_item_id)
        session = await _load_session(db, current_user.id, session_id)
        return await _attempt_response(db, session, existing, item)

    session_item.is_correct = bool(result["correct"])
    session_item.answered_at = datetime.utcnow()
    state = update_recovery_state(session.state, item.difficulty, bool(result["correct"]))
    session.state = state
    await _record_mastery(db, current_user.id, item, bool(result["correct"]))

    rows = await _load_history(db, session.id)
    next_row = None
    if len(rows) < TOTAL_QUESTIONS:
        pool_items = await _load_items(db, session.lesson_version_id)
        next_row = await _serve_next_item(db, session, pool_items, rows)
        rows.append(next_row)
    await db.commit()

    feedback = (item.answer_key or {}).get("explanation", "") if isinstance(item.answer_key, dict) else ""
    return {
        "session_id": session.id,
        "attempt_id": attempt.id,
        "assessment_item_id": item.id,
        "sequence": session_item.sequence,
        "correct": attempt.is_correct,
        "score": attempt.score,
        "difficulty": item.difficulty,
        "xp_earned": 0,
        "feedback": feedback,
        "progress": _progress_payload(rows),
        "next_item": _public_item(
            await db.get(AssessmentItem, next_row.assessment_item_id),
            next_row.sequence,
        ) if next_row else None,
        "ready_to_complete": len(rows) == TOTAL_QUESTIONS and all(row.is_correct is not None for row in rows),
    }


@router.post("/sessions/{session_id}/complete")
async def complete_session(
    session_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict[str, Any]:
    session = await _load_session(db, current_user.id, session_id, for_update=True)
    step = await _load_step_for_user(db, current_user.id, session.step_id)
    if session.status == "completed":
        summary = dict((session.state or {}).get("summary", {}))
        return {
            "success": True,
            "session_id": session.id,
            "completed": True,
            "xp_earned": int((session.state or {}).get("xp_earned", 0)),
            "coins_earned": int((session.state or {}).get("coins_earned", 0)),
            "total_xp": current_user.xp,
            "total_coins": current_user.coins or 0,
            "score": score_percent(summary),
            "correct": summary.get("correct", 0),
            "total": TOTAL_QUESTIONS,
            "band": session.band,
            "next_band": (session.state or {}).get("next_band", session.band),
            "xp_boost_active": bool((session.state or {}).get("xp_boost_active", False)),
            "newly_earned_achievements": [],
        }
    if session.status != "active":
        raise HTTPException(status_code=409, detail="Adaptive session is not active")

    rows = await _load_history(db, session.id)
    if len(rows) != TOTAL_QUESTIONS or any(row.is_correct is None for row in rows):
        raise HTTPException(status_code=409, detail="Answer all 9 questions before completing the lesson")

    history = _history_payload(rows)
    summary = session_summary(history)
    state = dict(session.state or {})
    summary["consecutive_wrong"] = int(state.get("consecutive_wrong", 0) or 0)
    previous_result = await db.execute(
        select(AdaptiveSession)
        .where(
            AdaptiveSession.user_id == current_user.id,
            AdaptiveSession.step_id == step.id,
            AdaptiveSession.status == "completed",
            AdaptiveSession.id != session.id,
        )
        .order_by(AdaptiveSession.id.desc())
        .limit(1)
    )
    previous = previous_result.scalar_one_or_none()
    previous_state = dict(previous.state or {}) if previous else {}
    stable_sessions = int(previous_state.get("stable_sessions", 0) or 0)
    stable_conditions = (
        summary["easy_accuracy"] >= 0.85
        and summary["medium_accuracy"] >= 0.75
        and summary["overall_accuracy"] >= 0.70
        and summary["hard_accuracy"] >= 0.60
    )
    stable_sessions = stable_sessions + 1 if session.band >= 3 and stable_conditions else 0
    recovery_streak = int(previous_state.get("recovery_streak", 0) or 0)
    recovery_streak = recovery_streak + 1 if summary.get("recovery_triggered") else 0
    promoted_band = next_band(
        session.band,
        summary,
        stable_sessions=stable_sessions,
        recent_recovery_sessions=recovery_streak,
    )

    rewardable_result = await db.execute(
        select(StepProgress).where(
            StepProgress.user_id == current_user.id,
            StepProgress.step_id == step.id,
        )
    )
    progress = rewardable_result.scalar_one_or_none()
    rewardable = progress is None or not progress.is_completed
    xp_earned = 0
    coins_earned = 0
    xp_boost_active = False
    if rewardable:
        base_xp = int(step.xp_reward or 0) + bonus_xp(history)
        xp_earned, coins_earned, xp_boost_active = await _apply_reward(
            db,
            current_user,
            step,
            base_xp,
            int(step.coin_reward or 0),
        )
        if progress is None:
            progress = StepProgress(user_id=current_user.id, step_id=step.id)
            db.add(progress)
        progress.is_completed = True
        progress.score = score_percent(summary)
        progress.completed_at = datetime.utcnow()
        tz_offset = None
        try:
            value = request.headers.get("x-user-tz-offset") or request.headers.get("x-tz-offset")
            tz_offset = int(value) if value is not None else None
        except (TypeError, ValueError):
            tz_offset = None
        update_streak(current_user, tz_offset)
        await _complete_streak_week(db, current_user, tz_offset)
        try:
            await tick_quest_progress(current_user.id, "lessons", 1, db)
            await tick_quest_progress(current_user.id, "quizzes", summary["correct"], db)
            if summary["correct"] == TOTAL_QUESTIONS:
                await tick_quest_progress(current_user.id, "perfect_quiz", 1, db)
        except Exception:
            pass

    state.update(
        {
            "summary": summary,
            "next_band": promoted_band,
            "stable_sessions": stable_sessions,
            "recovery_streak": recovery_streak,
            "xp_earned": xp_earned,
            "coins_earned": coins_earned,
            "xp_boost_active": xp_boost_active,
        }
    )
    session.state = state
    session.status = "completed"
    session.completed_at = datetime.utcnow()
    newly_earned = await check_and_award_user_achievements(db, current_user) if rewardable else []
    await db.commit()
    return {
        "success": True,
        "session_id": session.id,
        "completed": True,
        "xp_earned": xp_earned,
        "coins_earned": coins_earned,
        "total_xp": current_user.xp,
        "total_coins": current_user.coins or 0,
        "hearts": current_user.hearts if current_user.hearts is not None else 5,
        "score": score_percent(summary),
        "correct": summary["correct"],
        "total": TOTAL_QUESTIONS,
        "band": session.band,
        "next_band": promoted_band,
        "xp_boost_active": xp_boost_active,
        "newly_earned_achievements": newly_earned,
    }

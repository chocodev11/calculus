"""Draft, validation and publication primitives for JSON lessons."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.lesson_contract import (
    LessonDocument,
    document_payload,
    lesson_checksum,
    public_document_payload,
    validate_lesson_document,
)
from app.models import Chapter, Slide, Step
from app.sandbox_models import LessonVersion
from app.sandbox_models import AssessmentItem
from app.sandbox_grading import GRADER_VERSION


def validation_error(error: Exception) -> HTTPException:
    """Convert contract failures into a stable API validation response."""

    detail: Any
    if hasattr(error, "errors"):
        detail = error.errors()
    else:
        detail = str(error)
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
        detail={"code": "lesson_validation_error", "errors": detail},
    )


def parse_lesson_content(content: Any) -> LessonDocument:
    try:
        return validate_lesson_document(content)
    except Exception as error:
        raise validation_error(error) from error


async def get_step_for_authoring(db: AsyncSession, step_id: int) -> Step:
    result = await db.execute(
        select(Step)
        .where(Step.id == step_id)
    )
    step = result.scalar_one_or_none()
    if step is None:
        raise HTTPException(status_code=404, detail="Step not found")
    return step


async def get_published_version(db: AsyncSession, step_id: int) -> LessonVersion | None:
    result = await db.execute(
        select(LessonVersion)
        .join(Step, Step.published_version_id == LessonVersion.id)
        .where(Step.id == step_id, LessonVersion.status == "published")
    )
    return result.scalar_one_or_none()


async def get_latest_draft(db: AsyncSession, step_id: int) -> LessonVersion | None:
    result = await db.execute(
        select(LessonVersion)
        .where(LessonVersion.step_id == step_id, LessonVersion.status == "draft")
        .order_by(LessonVersion.id.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


async def get_version_for_step(
    db: AsyncSession,
    step_id: int,
    version_id: int,
) -> LessonVersion:
    result = await db.execute(
        select(LessonVersion).where(
            LessonVersion.id == version_id,
            LessonVersion.step_id == step_id,
        )
    )
    version = result.scalar_one_or_none()
    if version is None:
        raise HTTPException(status_code=404, detail="Lesson version not found")
    return version


def next_published_version(versions: list[LessonVersion]) -> str:
    numbers = []
    for version in versions:
        try:
            numbers.append(int(version.version))
        except (TypeError, ValueError):
            continue
    return str(max(numbers, default=0) + 1)


def _slide_key(step: Step, slide: dict[str, Any], index: int) -> str:
    return str(
        slide.get("content_key")
        or f"{step.content_key}/s{index + 1:02d}"
    )


def _assessment_item_type(quiz_type: str) -> str:
    return {
        "multiple_choice": "choice",
        "true_false_group": "boolean_group",
        "short_answer": "short_answer",
    }.get(quiz_type, quiz_type)


def _boolean_value(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    return str(value).strip().casefold() in {"true", "đúng", "dung", "1", "yes"}


def _assessment_answer_key(item: dict[str, Any], quiz_type: str) -> Any:
    explanation = item.get("explanation", "")
    if quiz_type == "multiple_choice":
        return {"value": item.get("correct"), "explanation": explanation}
    if quiz_type == "true_false_group":
        return {
            "values": [_boolean_value(statement.get("correct")) for statement in item.get("items", [])],
            "explanation": explanation,
        }
    accepted = item.get("correct_answers")
    if not isinstance(accepted, list):
        accepted = [item.get("correct")]
    return {
        "accepted": [value for value in accepted if value is not None],
        "explanation": explanation,
    }


def _assessment_public_payload(item: dict[str, Any], quiz_type: str) -> dict[str, Any]:
    answer_fields = {"correct", "correct_answers", "expected", "explanation", "answer_key"}

    def strip(value: Any) -> Any:
        if isinstance(value, list):
            return [strip(child) for child in value]
        if not isinstance(value, dict):
            return value
        return {key: strip(child) for key, child in value.items() if key not in answer_fields}

    payload = strip(item)
    payload["quiz_type"] = quiz_type
    return payload


async def materialize_assessment_items(
    db: AsyncSession,
    version_id: int,
    document: dict[str, Any],
) -> None:
    """Persist answer keys privately and expose only answer-free item payloads."""

    existing_result = await db.execute(
        select(AssessmentItem).where(AssessmentItem.lesson_version_id == version_id)
    )
    existing_by_key = {item.item_key: item for item in existing_result.scalars().all()}
    seen_keys: set[str] = set()
    for slide in document.get("slides", []):
        for block in slide.get("blocks", []):
            if block.get("block_type") != "assessment_pool":
                continue
            content = block.get("content", {})
            pool_id = str(content["poolId"])
            quiz_type = str(content.get("quiz_type") or content.get("item_type"))
            item_type = _assessment_item_type(quiz_type)
            for item in content.get("items", []):
                item_key = f"{pool_id}:{item['id']}"
                seen_keys.add(item_key)
                row = existing_by_key.get(item_key)
                if row is None:
                    row = AssessmentItem(lesson_version_id=version_id, item_key=item_key)
                    db.add(row)
                row.pool_id = pool_id
                row.item_type = item_type
                row.difficulty = item["difficulty"]
                row.public_payload = _assessment_public_payload(item, quiz_type)
                row.answer_key = _assessment_answer_key(item, quiz_type)
                row.grader_version = GRADER_VERSION
                row.outcome_ids = list(item.get("outcomeIds", []))
                row.misconception_ids = list(item.get("misconceptionIds", []))
                row.source_mapping = dict(item["sourceMapping"])
                row.is_active = True

    for item_key, row in existing_by_key.items():
        if item_key not in seen_keys:
            row.is_active = False


async def materialize_published_step(
    db: AsyncSession,
    step: Step,
    content: LessonDocument | dict[str, Any],
    version_id: int,
) -> None:
    """Mirror one published JSON version into legacy progress-addressable rows."""

    document = document_payload(content)
    public_document = public_document_payload(document)
    if document["content_key"] != step.content_key:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "lesson_identity_mismatch",
                "expected": step.content_key,
                "received": document["content_key"],
            },
        )

    step.title = document["title"] or step.title
    step.description = document.get("description", step.description)
    step.xp_reward = document.get("xp_reward", step.xp_reward)
    step.coin_reward = document.get("coin_reward", step.coin_reward)
    step.published_version_id = version_id
    await materialize_assessment_items(db, version_id, document)

    existing_result = await db.execute(
        select(Slide).where(Slide.step_id == step.id).order_by(Slide.order_index)
    )
    existing_rows = existing_result.scalars().all()
    existing_by_key = {row.content_key: row for row in existing_rows if row.content_key}
    legacy_by_order = {row.order_index: row for row in existing_rows}
    for row in existing_rows:
        row.is_active = False

    for index, slide_data in enumerate(public_document["slides"]):
        key = _slide_key(step, slide_data, index)
        slide = existing_by_key.get(key) or legacy_by_order.get(index)
        if slide is None:
            slide = Slide(step_id=step.id)
            db.add(slide)
        slide.content_key = key
        slide.order_index = int(slide_data.get("order_index", index))
        slide.blocks = slide_data.get("blocks", [])
        slide.is_active = True


async def publish_version(
    db: AsyncSession,
    step: Step,
    draft: LessonVersion,
) -> LessonVersion:
    document = parse_lesson_content(draft.content)
    versions_result = await db.execute(
        select(LessonVersion)
        .where(LessonVersion.step_id == step.id)
        .order_by(LessonVersion.id)
    )
    versions = versions_result.scalars().all()
    version = LessonVersion(
        step_id=step.id,
        manifest_id=step.content_key or document.content_key,
        version=next_published_version(versions),
        checksum=lesson_checksum(document),
        content=document_payload(document),
        status="published",
        published_at=datetime.now(timezone.utc).replace(tzinfo=None),
    )
    db.add(version)
    await db.flush()

    for existing in versions:
        if existing.status == "published":
            existing.status = "archived"
    draft.status = "archived"
    await materialize_published_step(db, step, document, version.id)
    return version


async def rollback_to_version(
    db: AsyncSession,
    step: Step,
    target: LessonVersion,
) -> LessonVersion:
    if target.status not in {"published", "archived"}:
        raise HTTPException(status_code=409, detail="Only published versions can be restored")
    document = parse_lesson_content(target.content)

    current = await get_published_version(db, step.id)
    if current is not None and current.id != target.id:
        current.status = "archived"
    target.status = "published"
    target.published_at = datetime.now(timezone.utc).replace(tzinfo=None)
    await materialize_published_step(db, step, document, target.id)
    return target

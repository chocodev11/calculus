"""Authenticated draft/preview/publish APIs for lesson JSON."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_admin
from app.content_service import (
    get_latest_draft,
    get_published_version,
    get_step_for_authoring,
    get_version_for_step,
    lesson_checksum,
    parse_lesson_content,
    publish_version,
    rollback_to_version,
)
from app.database import get_db
from app.lesson_contract import document_payload
from app.models import User
from app.sandbox_models import LessonVersion
from app.schemas import (
    LessonDraftRequest,
    LessonPublishRequest,
    LessonRollbackRequest,
    LessonValidateRequest,
    LessonVersionResponse,
)


router = APIRouter(prefix="/admin/lessons", tags=["lesson-authoring"])


def serialize_version(version: LessonVersion | None) -> dict | None:
    if version is None:
        return None
    return LessonVersionResponse.model_validate(version).model_dump(mode="json")


@router.get("/{step_id}")
async def get_lesson_versions(
    step_id: int,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> dict:
    step = await get_step_for_authoring(db, step_id)
    draft = await get_latest_draft(db, step.id)
    published = await get_published_version(db, step.id)
    versions_result = await db.execute(
        select(LessonVersion)
        .where(LessonVersion.step_id == step.id)
        .order_by(LessonVersion.id.desc())
    )
    versions = versions_result.scalars().all()
    return {
        "step": {
            "id": step.id,
            "content_key": step.content_key,
            "title": step.title,
            "description": step.description,
        },
        "draft": serialize_version(draft),
        "published": serialize_version(published),
        "versions": [serialize_version(version) for version in versions],
    }


@router.get("/{step_id}/preview")
async def preview_lesson(
    step_id: int,
    version_id: int | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> dict:
    step = await get_step_for_authoring(db, step_id)
    version = (
        await get_version_for_step(db, step.id, version_id)
        if version_id is not None
        else await get_latest_draft(db, step.id) or await get_published_version(db, step.id)
    )
    if version is None:
        raise HTTPException(status_code=404, detail="No draft or published lesson version exists")
    return {
        "step_id": step.id,
        "version": serialize_version(version),
        "content": version.content,
    }


@router.patch("/{step_id}/draft")
async def save_lesson_draft(
    step_id: int,
    request: LessonDraftRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> dict:
    step = await get_step_for_authoring(db, step_id)
    document = parse_lesson_content(request.content)
    if document.content_key != step.content_key:
        raise HTTPException(
            status_code=422,
            detail={
                "code": "lesson_identity_mismatch",
                "expected": step.content_key,
                "received": document.content_key,
            },
        )

    checksum = lesson_checksum(document)
    draft = await get_latest_draft(db, step.id)
    if draft is not None and request.expected_checksum and draft.checksum != request.expected_checksum:
        raise HTTPException(
            status_code=409,
            detail={
                "code": "draft_conflict",
                "message": "Draft đã được cập nhật ở nơi khác",
                "current_checksum": draft.checksum,
            },
        )

    if draft is None:
        draft = LessonVersion(
            step_id=step.id,
            manifest_id=step.content_key or document.content_key,
            version="draft",
            checksum=checksum,
            content=document_payload(document),
            status="draft",
        )
        db.add(draft)
    else:
        draft.manifest_id = step.content_key or document.content_key
        draft.checksum = checksum
        draft.content = document_payload(document)
    await db.commit()
    await db.refresh(draft)
    return {"saved": True, "draft": serialize_version(draft)}


@router.post("/{step_id}/validate")
async def validate_lesson(
    step_id: int,
    request: LessonValidateRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> dict:
    step = await get_step_for_authoring(db, step_id)
    draft = await get_latest_draft(db, step.id)
    content = request.content if request.content is not None else (draft.content if draft else None)
    if content is None:
        raise HTTPException(status_code=404, detail="No lesson draft to validate")
    document = parse_lesson_content(content)
    if document.content_key != step.content_key:
        raise HTTPException(status_code=422, detail="Lesson content_key does not match the step")
    return {
        "valid": True,
        "content_key": document.content_key,
        "checksum": lesson_checksum(document),
        "slides": len(document.slides),
    }


@router.post("/{step_id}/publish")
async def publish_lesson(
    step_id: int,
    request: LessonPublishRequest | None = None,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> dict:
    step = await get_step_for_authoring(db, step_id)
    draft = await get_latest_draft(db, step.id)
    if draft is None:
        raise HTTPException(status_code=404, detail="No lesson draft to publish")
    if request and request.expected_checksum and request.expected_checksum != draft.checksum:
        raise HTTPException(
            status_code=409,
            detail={"code": "draft_conflict", "current_checksum": draft.checksum},
        )

    version = await publish_version(db, step, draft)
    await db.commit()
    await db.refresh(version)
    return {"published": True, "version": serialize_version(version)}


@router.post("/{step_id}/rollback")
async def rollback_lesson(
    step_id: int,
    request: LessonRollbackRequest,
    db: AsyncSession = Depends(get_db),
    _admin: User = Depends(get_current_admin),
) -> dict:
    step = await get_step_for_authoring(db, step_id)
    target = await get_version_for_step(db, step.id, request.version_id)
    version = await rollback_to_version(db, step, target)
    await db.commit()
    await db.refresh(version)
    return {"published": True, "rolled_back": True, "version": serialize_version(version)}

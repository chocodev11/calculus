"""Canonical declarative lesson contract.

Lesson content is data, not executable Python or JavaScript.  LLM output and
editor drafts pass through this module before they can be stored or published.
"""

from __future__ import annotations

from copy import deepcopy
from hashlib import sha256
import json
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, model_validator


LESSON_SCHEMA_VERSION = "lesson-1"

ALLOWED_BLOCK_TYPES = frozenset(
    {
        "text",
        "math",
        "callout",
        "image",
        "quiz",
        "assessment_pool",
        "assessment_ref",
        "interaction",
        "video",
        "code",
        "reveal",
        "fill_blank",
        "ordering",
        "drag_drop",
        "interactive_graph",
    }
)


class LessonBlock(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1, max_length=160)
    block_type: str = Field(min_length=1, max_length=80)
    content: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def normalize_legacy_block(cls, value: Any) -> Any:
        if not isinstance(value, dict):
            raise ValueError("block must be an object")
        normalized = dict(value)
        if "block_type" not in normalized and "type" in normalized:
            normalized["block_type"] = normalized["type"]
        if "content" not in normalized and "block_data" in normalized:
            normalized["content"] = normalized["block_data"]
        if normalized.get("content") is None:
            normalized["content"] = {}
        return normalized

    @model_validator(mode="after")
    def validate_block_type(self) -> "LessonBlock":
        if self.block_type not in ALLOWED_BLOCK_TYPES:
            raise ValueError(f"unsupported block_type: {self.block_type}")
        return self


class LessonSlide(BaseModel):
    model_config = ConfigDict(extra="allow")

    id: str = Field(min_length=1, max_length=160)
    content_key: str | None = None
    order_index: int = Field(ge=0)
    title: str = ""
    subtitle: str | None = None
    blocks: list[LessonBlock] = Field(default_factory=list)


class LessonDocument(BaseModel):
    model_config = ConfigDict(extra="allow")

    schema_version: str = LESSON_SCHEMA_VERSION
    id: str = Field(min_length=1, max_length=160)
    content_key: str = Field(min_length=1, max_length=255)
    title: str = ""
    description: str = ""
    xp_reward: int = Field(default=10, ge=0)
    coin_reward: int = Field(default=5, ge=0)
    order_index: int = Field(default=0, ge=0)
    course_slug: str = Field(min_length=1, max_length=100)
    chapter_slug: str = Field(min_length=1, max_length=100)
    slides: list[LessonSlide] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_document(self) -> "LessonDocument":
        if self.schema_version != LESSON_SCHEMA_VERSION:
            raise ValueError(f"unsupported schema_version: {self.schema_version}")

        slide_ids = [slide.id for slide in self.slides]
        if len(slide_ids) != len(set(slide_ids)):
            raise ValueError("slide ids must be unique within a lesson")

        pools: dict[str, dict[str, Any]] = {}
        references: list[LessonBlock] = []
        for slide in self.slides:
            block_ids: set[str] = set()
            for block in slide.blocks:
                if block.id in block_ids:
                    raise ValueError(f"duplicate block id: {block.id}")
                block_ids.add(block.id)
                content = block.content
                if block.block_type == "assessment_pool":
                    pool_id = content.get("poolId")
                    items = content.get("items")
                    if not isinstance(pool_id, str) or not pool_id:
                        raise ValueError(f"assessment_pool {block.id} is missing poolId")
                    if pool_id in pools:
                        raise ValueError(f"duplicate assessment pool: {pool_id}")
                    if not isinstance(items, list) or not items:
                        raise ValueError(f"assessment_pool {pool_id} must contain items")
                    item_ids: set[str] = set()
                    for item in items:
                        if not isinstance(item, dict) or not isinstance(item.get("id"), str) or not item["id"]:
                            raise ValueError(f"assessment_pool {pool_id} contains an item without id")
                        if item["id"] in item_ids:
                            raise ValueError(f"assessment_pool {pool_id} duplicates item {item['id']}")
                        item_ids.add(item["id"])
                    pools[pool_id] = content
                elif block.block_type == "assessment_ref":
                    references.append(block)

        for reference in references:
            content = reference.content
            pool_id = content.get("poolId")
            item_id = content.get("itemId")
            phase = content.get("phase")
            pool = pools.get(pool_id)
            if pool is None:
                raise ValueError(f"assessment_ref {reference.id} points to unknown pool {pool_id}")
            item_ids = {item.get("id") for item in pool.get("items", []) if isinstance(item, dict)}
            if item_id not in item_ids:
                raise ValueError(f"assessment_ref {reference.id} points to unknown item {item_id}")
            if not isinstance(phase, str) or not phase:
                raise ValueError(f"assessment_ref {reference.id} is missing phase")

        return self


def validate_lesson_document(content: Any) -> LessonDocument:
    """Parse and validate untrusted lesson data using the canonical contract."""

    return LessonDocument.model_validate(content)


def lesson_checksum(content: LessonDocument | dict[str, Any]) -> str:
    """Return a deterministic checksum for optimistic saves and versions."""

    payload = content.model_dump(mode="json") if isinstance(content, LessonDocument) else document_payload(content)
    encoded = json.dumps(payload, ensure_ascii=False, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return sha256(encoded).hexdigest()


def document_payload(content: LessonDocument | dict[str, Any]) -> dict[str, Any]:
    """Return normalized JSON suitable for storage in a JSON/JSONB column."""

    document = content if isinstance(content, LessonDocument) else validate_lesson_document(content)
    return document.model_dump(mode="json", exclude_none=True)


def public_document_payload(content: LessonDocument | dict[str, Any]) -> dict[str, Any]:
    """Return learner-safe content while retaining the existing quiz contract.

    Assessment pools are authoring data and are never delivered.  Until the
    server-assessment UI is fully switched over, assessment references are
    materialized from their pool into the existing quiz shape.  This helper is
    intentionally the single boundary where that transformation occurs.
    """

    document = document_payload(content)
    pools: dict[str, dict[str, Any]] = {}
    for slide in document["slides"]:
        for block in slide.get("blocks", []):
            if block.get("block_type") == "assessment_pool":
                pool_content = block.get("content", {})
                pools[str(pool_content["poolId"])] = pool_content

    public = deepcopy(document)
    for slide in public["slides"]:
        blocks: list[dict[str, Any]] = []
        for block in slide.get("blocks", []):
            block_type = block.get("block_type")
            if block_type == "assessment_pool":
                continue
            if block_type == "assessment_ref":
                content = block.get("content", {})
                pool = pools[str(content["poolId"])]
                item = next(item for item in pool["items"] if item["id"] == content["itemId"])
                blocks.append(
                    {
                        "id": block["id"],
                        "block_type": "quiz",
                        "content": {
                            **item,
                            "phase": content["phase"],
                            "poolId": content["poolId"],
                            "poolItemId": content["itemId"],
                        },
                    }
                )
                continue
            blocks.append(block)
        slide["blocks"] = blocks
    return public

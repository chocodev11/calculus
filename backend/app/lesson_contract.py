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
SOURCE_DOCUMENT = "chuyen-de-menh-de-va-tap-hop-toan-10.pdf"
SOURCE_SHA256 = "6f41eaf9891d0d35cf567a9b1503e5f5c26376d24406c8b687d83ac7bb4d58f3"
ADAPTIVE_QUESTION_COUNT = 9
ADAPTIVE_POOL_REQUIREMENTS = {
    "multiple_choice": {"minimum": 21, "difficulty_counts": {"easy": 7, "medium": 7, "hard": 7}},
    "true_false_group": {"minimum": 6, "difficulty_counts": {"easy": 3, "hard": 3}},
    "short_answer": {"minimum": 6, "difficulty_counts": {"easy": 3, "hard": 3}},
}

ALLOWED_BLOCK_TYPES = frozenset(
    {
        "text",
        "math",
        "callout",
        "image",
        "quiz",
        "assessment_pool",
        "assessment_ref",
        "adaptive_assessment",
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
        adaptive_blocks: list[LessonBlock] = []
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
                elif block.block_type == "adaptive_assessment":
                    adaptive_blocks.append(block)

        if pools:
            if len(adaptive_blocks) != 1:
                raise ValueError("an adaptive lesson must contain exactly one adaptive_assessment block")
            question_count = adaptive_blocks[0].content.get("questionCount", ADAPTIVE_QUESTION_COUNT)
            if question_count != ADAPTIVE_QUESTION_COUNT:
                raise ValueError(f"adaptive_assessment questionCount must be {ADAPTIVE_QUESTION_COUNT}")

            pool_types: dict[str, dict[str, Any]] = {}
            for pool_id, pool in pools.items():
                quiz_type = pool.get("quiz_type") or pool.get("item_type")
                if quiz_type not in ADAPTIVE_POOL_REQUIREMENTS:
                    raise ValueError(f"assessment_pool {pool_id} has unsupported adaptive quiz_type")
                if quiz_type in pool_types:
                    raise ValueError(f"adaptive lesson contains more than one {quiz_type} pool")
                pool_types[quiz_type] = pool

                requirement = ADAPTIVE_POOL_REQUIREMENTS[quiz_type]
                items = pool.get("items", [])
                if len(items) < requirement["minimum"]:
                    raise ValueError(
                        f"assessment_pool {pool_id} needs at least {requirement['minimum']} items"
                    )
                difficulty_counts = {difficulty: 0 for difficulty in requirement["difficulty_counts"]}
                for item in items:
                    difficulty = item.get("difficulty")
                    if difficulty not in requirement["difficulty_counts"]:
                        allowed = ", ".join(requirement["difficulty_counts"])
                        raise ValueError(f"item {item.get('id')} in {pool_id} has invalid difficulty; expected {allowed}")
                    difficulty_counts[difficulty] += 1
                    outcome_ids = item.get("outcomeIds")
                    if not isinstance(outcome_ids, list) or not outcome_ids or not all(
                        isinstance(outcome_id, str) and outcome_id for outcome_id in outcome_ids
                    ):
                        raise ValueError(f"item {item.get('id')} in {pool_id} needs outcomeIds")
                    misconception_ids = item.get("misconceptionIds")
                    if not isinstance(misconception_ids, list) or not all(
                        isinstance(value, str) and value for value in misconception_ids
                    ):
                        raise ValueError(f"item {item.get('id')} in {pool_id} needs misconceptionIds")
                    source_mapping = item.get("sourceMapping")
                    if not isinstance(source_mapping, dict):
                        raise ValueError(f"item {item.get('id')} in {pool_id} needs sourceMapping")
                    if source_mapping.get("document") != SOURCE_DOCUMENT:
                        raise ValueError(f"item {item.get('id')} has an unexpected source document")
                    if source_mapping.get("sha256") != SOURCE_SHA256:
                        raise ValueError(f"item {item.get('id')} has an unexpected source checksum")
                    source_ids = source_mapping.get("sourceQuestionIds")
                    if not isinstance(source_ids, list) or not source_ids or not all(
                        isinstance(source_id, str) and source_id for source_id in source_ids
                    ):
                        raise ValueError(f"item {item.get('id')} needs sourceQuestionIds")
                    if not isinstance(source_mapping.get("page"), int) or source_mapping["page"] < 1:
                        raise ValueError(f"item {item.get('id')} needs a positive PDF page")
                    if not isinstance(source_mapping.get("section"), str) or not source_mapping["section"]:
                        raise ValueError(f"item {item.get('id')} needs a source section")

                missing = [
                    difficulty
                    for difficulty, minimum in requirement["difficulty_counts"].items()
                    if difficulty_counts[difficulty] < minimum
                ]
                if missing:
                    raise ValueError(f"assessment_pool {pool_id} is missing difficulty coverage: {', '.join(missing)}")

            missing_types = sorted(set(ADAPTIVE_POOL_REQUIREMENTS) - set(pool_types))
            if missing_types:
                raise ValueError(f"adaptive lesson is missing pools: {', '.join(missing_types)}")
        elif adaptive_blocks:
            raise ValueError("adaptive_assessment requires assessment pools")

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


def _strip_answer_fields(value: Any) -> Any:
    if isinstance(value, list):
        return [_strip_answer_fields(item) for item in value]
    if not isinstance(value, dict):
        return value
    answer_fields = {
        "correct",
        "correct_answers",
        "answer_key",
        "acceptedPaths",
        "accepted_paths",
        "expected",
    }
    return {
        key: _strip_answer_fields(item)
        for key, item in value.items()
        if key not in answer_fields
    }


def public_document_payload(content: LessonDocument | dict[str, Any]) -> dict[str, Any]:
    """Return learner-safe content without materializing answer-bearing pools."""

    document = document_payload(content)
    public = deepcopy(document)
    for slide in public["slides"]:
        blocks: list[dict[str, Any]] = []
        for block in slide.get("blocks", []):
            block_type = block.get("block_type")
            if block_type in {"assessment_pool", "assessment_ref"}:
                continue
            if block_type == "adaptive_assessment":
                blocks.append(
                    {
                        "id": block["id"],
                        "block_type": "adaptive_assessment",
                        "content": {
                            "sessionType": "lesson",
                            "questionCount": ADAPTIVE_QUESTION_COUNT,
                        },
                    }
                )
                continue
            if block_type == "quiz":
                block = deepcopy(block)
                block["content"] = _strip_answer_fields(block.get("content", {}))
            blocks.append(block)
        slide["blocks"] = blocks
    return public

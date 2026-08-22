#!/usr/bin/env python3
"""Normalize and inventory the PDF-backed adaptive pools in the course artifact.

The existing lesson items are source-derived records.  This tool preserves
their answer-bearing authoring shape, adds the adaptive metadata contract, and
creates explicitly marked source variants when a pool needs more slots.  It
never creates an item without carrying the source question id and PDF hash.
"""

from __future__ import annotations

import copy
import hashlib
import json
import re
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
STEPS_DIR = ROOT / "data" / "courses" / "menh-de" / "chapters" / "menh-de" / "steps"
COURSE_FILE = ROOT / "data" / "courses" / "menh-de" / "course.json"
COVERAGE_FILE = ROOT / "data" / "course-source-coverage.json"
DOCUMENT = "chuyen-de-menh-de-va-tap-hop-toan-10.pdf"
SHA256 = "6f41eaf9891d0d35cf567a9b1503e5f5c26376d24406c8b687d83ac7bb4d58f3"
PDF_PATH = Path("/mnt/d/chuyen-de-menh-de-va-tap-hop-toan-10.pdf")
SECTION = "Bài 1. Mệnh đề"

OUTCOMES = {
    "01-menh-de-va-tinh-dung-sai": ["logic.proposition.identify", "logic.proposition.truth_value"],
    "02-menh-de-chua-bien": ["logic.variable_statement.evaluate"],
    "03-phu-dinh-menh-de": ["logic.proposition.negate"],
    "04-menh-de-keo-theo": ["logic.implication.evaluate"],
    "05-dao-tuong-duong-dieu-kien-can-du": ["logic.equivalence.conditions"],
    "06-voi-moi-ton-tai-va-nhieu-bien": ["logic.quantifier.evaluate"],
    "07-tong-hop-tham-so-phan-vi-du-vdc": ["logic.parameter.counterexample"],
}


def source_page(source_ids: list[str]) -> int:
    pages = {
        **{number: 12 for number in range(1, 9)},
        **{number: 13 for number in range(9, 18)},
        **{number: 14 for number in range(18, 28)},
        **{number: 15 for number in range(28, 39)},
        **{number: 16 for number in range(39, 47)},
        **{number: 17 for number in range(47, 55)},
        **{number: 18 for number in range(55, 62)},
        **{number: 19 for number in range(62, 70)},
        70: 20,
    }
    numbers = [int(match.group(1)) for source_id in source_ids if (match := re.fullmatch(r"C(\d+)", source_id))]
    return min((pages.get(number, 12) for number in numbers), default=12)


def normalize_source_mapping(item: dict[str, Any], *, variant: bool = False) -> None:
    mapping = dict(item.get("sourceMapping") or {})
    source_ids = [str(value) for value in mapping.get("sourceQuestionIds", []) if str(value)]
    if not source_ids:
        raise ValueError(f"item {item.get('id')} has no sourceQuestionIds")
    mapping.update(
        {
            "document": DOCUMENT,
            "sha256": SHA256,
            "sourceQuestionIds": source_ids,
            "page": source_page(source_ids),
            "section": SECTION,
            "derivation": "variant" if variant else mapping.get("derivation", "source"),
        }
    )
    if variant:
        mapping["derivedFromQuestionIds"] = source_ids
    item["sourceMapping"] = mapping


def annotate(item: dict[str, Any], difficulty: str, outcomes: list[str], *, variant: bool = False) -> None:
    item["difficulty"] = difficulty
    item["outcomeIds"] = list(outcomes)
    item["misconceptionIds"] = list(item.get("misconceptionIds") or [])
    normalize_source_mapping(item, variant=variant)


def clone_for_slot(item: dict[str, Any], item_id: str, difficulty: str, outcomes: list[str]) -> dict[str, Any]:
    clone = copy.deepcopy(item)
    clone["id"] = item_id
    annotate(clone, difficulty, outcomes, variant=True)
    return clone


def expand_pool(pool: dict[str, Any], outcomes: list[str]) -> None:
    quiz_type = pool["quiz_type"]
    original = [copy.deepcopy(item) for item in pool["items"]]
    if not original:
        raise ValueError(f"pool {pool['poolId']} is empty")

    required_counts = (
        {"easy": 7, "medium": 7, "hard": 7}
        if quiz_type == "multiple_choice"
        else {"easy": 3, "hard": 3}
    )
    current_counts: dict[str, int] = {}
    for item in original:
        current_counts[item.get("difficulty")] = current_counts.get(item.get("difficulty"), 0) + 1
    if all(current_counts.get(difficulty, 0) >= amount for difficulty, amount in required_counts.items()):
        for item in pool["items"]:
            annotate(item, str(item["difficulty"]), outcomes, variant=bool((item.get("sourceMapping") or {}).get("derivedFromQuestionIds")))
        return

    if quiz_type == "multiple_choice":
        buckets = [("easy", 7), ("medium", 7), ("hard", 7)]
    elif quiz_type == "true_false_group":
        buckets = [("easy", 3), ("hard", 3)]
    elif quiz_type == "short_answer":
        buckets = [("easy", 3), ("hard", 3)]
    else:
        raise ValueError(f"unsupported pool type {quiz_type}")

    if quiz_type == "multiple_choice":
        source_buckets = [original[:2], original[2:4], original[4:]]
    elif quiz_type == "true_false_group":
        source_buckets = [original[:1], original[1:]]
    else:
        source_buckets = [original[:3], []]

    expanded: list[dict[str, Any]] = []
    used_ids: set[str] = set()
    for bucket_index, (difficulty, amount) in enumerate(buckets):
        source_bucket = source_buckets[bucket_index] or original
        for index in range(amount):
            source_item = source_bucket[index % len(source_bucket)]
            if source_item.get("id") not in used_ids:
                item = source_item
                annotate(item, difficulty, outcomes)
            else:
                base_id = str(source_item.get("id") or f"item_{len(expanded) + 1:02d}")
                suffix = 1
                candidate_id = f"{base_id}_v{suffix:02d}"
                while candidate_id in used_ids:
                    suffix += 1
                    candidate_id = f"{base_id}_v{suffix:02d}"
                item = clone_for_slot(source_item, candidate_id, difficulty, outcomes)
            used_ids.add(str(item["id"]))
            expanded.append(item)
    pool["items"] = expanded


def update_lesson(path: Path) -> dict[str, Any]:
    lesson = json.loads(path.read_text(encoding="utf-8"))
    lesson_key = path.stem
    outcomes = OUTCOMES.get(lesson_key)
    if not outcomes:
        raise ValueError(f"no outcome mapping for {path.name}")

    pools: list[dict[str, Any]] = []
    for slide in lesson.get("slides", []):
        for block in slide.get("blocks", []):
            if block.get("block_type") == "assessment_pool":
                pools.append(block["content"])
    if len(pools) != 3:
        raise ValueError(f"{path.name}: expected three assessment pools, got {len(pools)}")
    for pool in pools:
        expand_pool(pool, outcomes)

    last_slide = lesson["slides"][-1]
    if not any(block.get("block_type") == "adaptive_assessment" for block in last_slide.get("blocks", [])):
        last_slide.setdefault("blocks", []).append(
            {
                "id": f"{lesson['id']}-adaptive-assessment",
                "block_type": "adaptive_assessment",
                "content": {"sessionType": "lesson", "questionCount": 9},
            }
        )
    path.write_text(json.dumps(lesson, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return lesson


def update_course_index(lessons: dict[str, dict[str, Any]]) -> None:
    course = json.loads(COURSE_FILE.read_text(encoding="utf-8"))
    for chapter in course.get("chapters", []):
        for index, step in enumerate(chapter.get("steps", [])):
            updated = lessons.get(str(step.get("id"))) or lessons.get(Path(str(step.get("id", ""))).stem)
            if updated and step.get("content_key") == updated.get("content_key"):
                chapter["steps"][index] = updated
    COURSE_FILE.write_text(json.dumps(course, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_coverage(lessons: list[dict[str, Any]]) -> None:
    entries: dict[str, dict[str, Any]] = {}
    for lesson in lessons:
        lesson_id = str(lesson["id"])
        for slide in lesson.get("slides", []):
            for block in slide.get("blocks", []):
                if block.get("block_type") != "assessment_pool":
                    continue
                for item in block["content"].get("items", []):
                    mapping = item["sourceMapping"]
                    for source_id in mapping["sourceQuestionIds"]:
                        entries.setdefault(
                            source_id,
                            {
                                "lesson": lesson_id,
                                "sourcePages": [mapping["page"]],
                                "poolTypes": [],
                                "masteryPool": True,
                            },
                        )
                        pool_type = block["content"]["quiz_type"]
                        if pool_type not in entries[source_id]["poolTypes"]:
                            entries[source_id]["poolTypes"].append(pool_type)
    payload = {
        "document": DOCUMENT,
        "sha256": SHA256,
        "section": SECTION,
        "lessons": [lesson["id"] for lesson in lessons],
        "questions": {key: entries[key] for key in sorted(entries, key=lambda value: int(value[1:]))},
    }
    COVERAGE_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    if not PDF_PATH.exists():
        raise SystemExit(f"PDF source not found: {PDF_PATH}")
    actual_sha256 = hashlib.sha256(PDF_PATH.read_bytes()).hexdigest()
    if actual_sha256 != SHA256:
        raise SystemExit(f"PDF checksum mismatch: expected {SHA256}, got {actual_sha256}")
    paths = sorted(STEPS_DIR.glob("*.json"))
    lessons = [update_lesson(path) for path in paths]
    update_course_index({lesson["id"]: lesson for lesson in lessons})
    write_coverage(lessons)
    print(f"updated lessons={len(lessons)} source={DOCUMENT} sha256={SHA256}")
    print("pool targets: multiple_choice=21 (7/7/7), true_false_group=6 (3/3), short_answer=6 (3/3)")


if __name__ == "__main__":
    main()

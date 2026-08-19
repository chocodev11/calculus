#!/usr/bin/env python3
"""Put one delivered assessment reference on each learner-facing slide."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
STEPS_DIR = ROOT / "data/raw_courses/menh-de/chapters/menh-de/steps"
LAYOUT = "one_assessment_ref_per_slide"


def block_type(block: dict[str, Any]) -> str | None:
    return block.get("type") or block.get("block_type")


def block_content(block: dict[str, Any]) -> dict[str, Any]:
    content = block.get("content") or block.get("block_data") or {}
    return content if isinstance(content, dict) else {}


def ref_title(base: str, ref_block: dict[str, Any], index: int) -> str:
    content = block_content(ref_block)
    phase = content.get("phase")
    labels = {
        "guided_practice": "Luyện tập có hướng dẫn",
        "independent_check": "Kiểm tra độc lập",
        "transfer": "Transfer",
    }
    return f"{labels.get(phase, phase or 'Luyện tập')} · Câu {index}"


def split_step(data: dict[str, Any]) -> bool:
    scheme = data.get("learning_scheme")
    if not isinstance(scheme, dict):
        return False

    if scheme.get("delivery_layout") == LAYOUT:
        changed = False
    else:
        scheme["delivery_layout"] = LAYOUT
        changed = True

    new_slides: list[dict[str, Any]] = []
    delivered_index = 0
    for slide in data.get("slides", []):
        blocks = slide.get("blocks", [])
        refs = [block for block in blocks if block_type(block) == "assessment_ref"]
        if len(refs) <= 1:
            new_slides.append(copy.deepcopy(slide))
            continue

        pools = [block for block in blocks if block_type(block) == "assessment_pool"]
        other_blocks = [
            block for block in blocks
            if block_type(block) not in {"assessment_pool", "assessment_ref"}
        ]
        if other_blocks:
            raise ValueError(f"{data.get('id')}: assessment slide contains unexpected blocks")

        for ref_offset, ref in enumerate(refs):
            split_slide = copy.deepcopy(slide)
            split_slide["blocks"] = ([*pools] if ref_offset == 0 else []) + [copy.deepcopy(ref)]
            split_slide["title"] = ref_title(slide.get("title", "Luyện tập"), ref, delivered_index + 1)
            new_slides.append(split_slide)
            delivered_index += 1
        changed = True

    for index, slide in enumerate(new_slides):
        if slide.get("order_index") != index or slide.get("slide_number") != index + 1:
            changed = True
        slide["order_index"] = index
        slide["slide_number"] = index + 1

    if changed:
        data["slides"] = new_slides
    return changed


def main() -> None:
    changed = 0
    for path in sorted(STEPS_DIR.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        if not split_step(data):
            continue
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        changed += 1
        print(path.relative_to(ROOT))
    print(f"split files: {changed}")


if __name__ == "__main__":
    main()

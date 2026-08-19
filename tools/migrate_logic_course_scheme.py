#!/usr/bin/env python3
"""Migrate the logic course to the pool/delivery lesson scheme.

The source files stay authoritative.  Assessment pools are stored once and
slides contain references to the deterministic learner path.  The frontend
materializes those references into ordinary quiz blocks at runtime.
"""

from __future__ import annotations

import argparse
import copy
import json
from pathlib import Path
from typing import Any

from split_logic_assessment_slides import split_step


ROOT = Path(__file__).resolve().parents[1]
STEPS_DIR = ROOT / "data/raw_courses/menh-de/chapters/menh-de/steps"


def mapping(source_ids: list[str], skills: list[str], archetypes: list[str]) -> dict[str, Any]:
    return {
        "document": "chuyen-de-menh-de-va-tap-hop-toan-10(1).pdf",
        "section": "Bài 1. Mệnh đề",
        "sourceQuestionIds": source_ids,
        "derivation": "variant",
        "skillIds": skills,
        "archetypeIds": archetypes,
        "contentTier": "core",
    }


def mc(
    item_id: str,
    question: str,
    options: list[tuple[str, str]],
    correct: str,
    explanation: str,
    source_ids: list[str],
    skills: list[str],
    archetypes: list[str],
) -> dict[str, Any]:
    return {
        "id": item_id,
        "quiz_type": "multiple_choice",
        "question": question,
        "options": [{"id": value, "text": text} for value, text in options],
        "correct": correct,
        "explanation": explanation,
        "sourceMapping": mapping(source_ids, skills, archetypes),
    }


def tf_group(
    item_id: str,
    question: str,
    items: list[tuple[str, str, bool]],
    explanation: str,
    source_ids: list[str],
    skills: list[str],
    archetypes: list[str],
) -> dict[str, Any]:
    return {
        "id": item_id,
        "quiz_type": "true_false_group",
        "question": question,
        "items": [
            {"id": item_id, "label": label, "correct": correct}
            for item_id, label, correct in items
        ],
        "explanation": explanation,
        "sourceMapping": mapping(source_ids, skills, archetypes),
    }


def short(
    item_id: str,
    question: str,
    correct: str,
    correct_answers: list[str],
    explanation: str,
    source_ids: list[str],
    skills: list[str],
    archetypes: list[str],
) -> dict[str, Any]:
    return {
        "id": item_id,
        "quiz_type": "short_answer",
        "question": question,
        "correct": correct,
        "correct_answers": correct_answers,
        "explanation": explanation,
        "sourceMapping": mapping(source_ids, skills, archetypes),
    }


def enrich_existing(
    block: dict[str, Any],
    item_id: str,
    source_ids: list[str],
    skills: list[str],
    archetypes: list[str],
) -> dict[str, Any]:
    item = copy.deepcopy(block["content"])
    item["id"] = item_id
    item["sourceMapping"] = mapping(source_ids, skills, archetypes)
    return item


def ref(block_id: str, pool_id: str, item_id: str, phase: str) -> dict[str, Any]:
    return {
        "id": block_id,
        "block_type": "assessment_ref",
        "content": {
            "poolId": pool_id,
            "itemId": item_id,
            "phase": phase,
        },
    }


def pool(block_id: str, pool_id: str, quiz_type: str, items: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "id": block_id,
        "block_type": "assessment_pool",
        "content": {
            "poolId": pool_id,
            "quiz_type": quiz_type,
            "items": items,
        },
    }


def find_quiz_blocks(step: dict[str, Any]) -> dict[str, dict[str, Any]]:
    found: dict[str, dict[str, Any]] = {}
    for slide in step["slides"]:
        for block in slide.get("blocks", []):
            if block.get("block_type") != "quiz":
                continue
            quiz_type = block.get("content", {}).get("quiz_type")
            if quiz_type in {"multiple_choice", "true_false_group", "short_answer"}:
                found[quiz_type] = block
    missing = {"multiple_choice", "true_false_group", "short_answer"} - found.keys()
    if missing:
        raise ValueError(f"{step['id']}: missing legacy quiz blocks: {sorted(missing)}")
    return found


def lesson_scheme(delivery: dict[str, dict[str, list[str]]]) -> dict[str, Any]:
    counts = {
        "multiple_choice": 6,
        "true_false_group": 2,
        "short_answer": 3,
    }
    delivery_counts: dict[str, dict[str, int]] = {}
    for phase, types in delivery.items():
        delivery_counts[phase] = {
            quiz_type: len(item_ids)
            for quiz_type, item_ids in types.items()
        }
    return {
        "version": "1.0",
        "authoring_pool": {
            "theory": {"min": 1, "max": 2},
            "sandbox": {"min": 1, "max": 2},
            "multiple_choice": counts["multiple_choice"],
            "true_false_group": counts["true_false_group"],
            "short_answer": counts["short_answer"],
            "media": {"min": 0, "max": 2},
        },
        "delivery": delivery_counts,
        "interaction_policy": {
            "required_evidence": [
                "state_change",
                "derived_evidence",
                "pass_condition",
                "hint_transition",
            ],
            "drag_only": False,
        },
        "delivery_layout": "one_assessment_ref_per_slide",
    }


def replace_quiz_block(slide: dict[str, Any], replacements: list[dict[str, Any]]) -> None:
    blocks = slide.get("blocks", [])
    for index, block in enumerate(blocks):
        if block.get("block_type") == "quiz":
            slide["blocks"] = blocks[:index] + replacements + blocks[index + 1 :]
            return
    raise ValueError(f"slide {slide.get('slide_number')} has no legacy quiz block")


def build_pools(quiz_blocks: dict[str, dict[str, Any]], lesson_id: str) -> dict[str, list[dict[str, Any]]]:
    mc_base = enrich_existing(quiz_blocks["multiple_choice"], "mc_01", ["C1"], ["S1"], ["A01"])
    tf_base = enrich_existing(quiz_blocks["true_false_group"], "tf_01", ["C52"], ["S2"], ["A02"])
    short_base = enrich_existing(quiz_blocks["short_answer"], "short_01", ["C3"], ["S1"], ["A01"])

    if lesson_id == "01-menh-de-va-tinh-dung-sai":
        return {
            "multiple_choice": [
                mc_base,
                mc("mc_02", "Câu nào sau đây **không phải là mệnh đề**?", [("A", "$2+3=5$"), ("B", "Số 7 là số nguyên tố."), ("C", "Bạn có khỏe không?"), ("D", "Hà Nội là thủ đô của Việt Nam.")], "C", "Câu hỏi không có giá trị đúng hoặc sai nên không phải mệnh đề.", ["C2"], ["S1"], ["A01"]),
                mc("mc_03", "Câu nào là **mệnh đề chứa biến**?", [("A", "$2x+1=5$"), ("B", "$2+1=3$"), ("C", "Số 9 là số chính phương."), ("D", "Hãy tính $x+1$.")], "A", "Biến x chưa được gán giá trị và chưa có lượng từ nên câu chưa có chân trị xác định.", ["C4"], ["S1"], ["A01"]),
                mc("mc_04", "Mệnh đề nào sau đây là **mệnh đề sai**?", [("A", "$5^2=25$"), ("B", "Số 15 là số nguyên tố."), ("C", "Tam giác đều có ba cạnh bằng nhau."), ("D", "$0<1$")], "B", "15 không phải số nguyên tố vì có ước 3 và 5.", ["C5"], ["S2"], ["A02"]),
                mc("mc_05", "Phát biểu nào vẫn là mệnh đề dù người nói **chưa biết** nó đúng hay sai?", [("A", "Hôm nay ở Huế có mưa."), ("B", "Bạn có thích học Toán không?"), ("C", "Hãy mở sách."), ("D", "$x+1=2$")], "A", "Việc chưa biết chân trị không làm mất tính đúng hoặc sai của một câu khẳng định.", ["C6"], ["S2"], ["A02"]),
                mc("mc_06", "Trong bốn câu sau, có bao nhiêu câu là mệnh đề? (1) $2+2=4$; (2) $x+1=2$; (3) Bạn tên gì?; (4) Hãy tính $3+4$.", [("A", "1"), ("B", "2"), ("C", "3"), ("D", "4")], "A", "Chỉ câu (1) là câu khẳng định có chân trị xác định.", ["C3", "C8"], ["S1"], ["A01"]),
            ],
            "true_false_group": [
                tf_base,
                tf_group("tf_02", "Xét các phát biểu về nhận diện mệnh đề:", [("a", "Câu hỏi không có giá trị đúng hoặc sai nên không phải mệnh đề.", True), ("b", "$x+1=2$ với x chưa gán giá trị là một mệnh đề.", False), ("c", "Số 2 là số nguyên tố.", True), ("d", "Hãy giải phương trình $x^2-1=0$ là một mệnh đề.", False)], "Mệnh đề phải là câu khẳng định và có đúng một giá trị chân lý; câu chứa biến tự do, câu hỏi và mệnh lệnh không thỏa điều kiện này.", ["C7", "C9"], ["S1", "S2"], ["A01", "A02"]),
            ],
            "short_answer": [
                short_base,
                short("short_02", "Trong các câu sau có bao nhiêu câu là mệnh đề? (1) $4+5=9$; (2) $x^2=1$; (3) Mở cửa sổ!; (4) Tam giác đều có ba cạnh bằng nhau; (5) Bạn đang học gì?", "2", ["2", "hai", "2 câu"], "Chỉ (1) và (4) là câu khẳng định có chân trị xác định.", ["C10"], ["S1"], ["A01"]),
                short("short_03", "Trong năm câu sau, có bao nhiêu câu là mệnh đề? (1) $3<5$; (2) $x>0$; (3) $\\pi$ là số vô tỉ; (4) Hãy tính $2+2$; (5) Bạn có thích Toán không?", "2", ["2", "hai", "2 câu"], "Các câu (1) và (3) là mệnh đề; (2) là mệnh đề chứa biến, còn (4) và (5) không phải câu khẳng định.", ["C11"], ["S1"], ["A01"]),
            ],
        }

    if lesson_id == "02-menh-de-chua-bien":
        return {
            "multiple_choice": [
                mc_base,
                mc("mc_02", "Cho $P(x): x^2-4=0$ trên $\\mathbb{R}$. Giá trị nào làm $P(x)$ đúng?", [("A", "$x=-2$"), ("B", "$x=0$"), ("C", "$x=1$"), ("D", "$x=3$")], "A", "Thay $x=-2$ được $(-2)^2-4=0$.", ["C14"], ["S3"], ["A03"]),
                mc("mc_03", "Giá trị nào sau đây **không thuộc** miền xác định $\\mathbb{Z}$ của một vị từ?", [("A", "$-1$"), ("B", "$0$"), ("C", "$1$"), ("D", "$\\frac12$")], "D", "$\\frac12$ không phải là số nguyên nên không thuộc $\\mathbb{Z}$.", ["C43"], ["S4"], ["A05"]),
                mc("mc_04", "Cho $P(x): 2x-1=0$. Giá trị nào làm $P(x)$ đúng?", [("A", "$x=0$"), ("B", "$x=\\frac12$"), ("C", "$x=1$"), ("D", "$x=2$")], "B", "Từ $2x-1=0$ suy ra $x=\\frac12$.", ["C14"], ["S3"], ["A03"]),
                mc("mc_05", "Cho $P(x): x^2+1=0$ với $x\\in\\mathbb{R}$. Chân trị của $P(0)$ là gì?", [("A", "Đúng"), ("B", "Sai"), ("C", "Không xác định"), ("D", "Vừa đúng vừa sai")], "B", "$P(0)$ tương đương $1=0$, nên sai.", ["C53"], ["S3"], ["A03"]),
                mc("mc_06", "Cho $P(x): x+3>0$ trên $\\mathbb{R}$. Giá trị nào là một nhân chứng để $P(x)$ đúng?", [("A", "$x=-2$"), ("B", "$x=-4$"), ("C", "$x=-3$"), ("D", "$x=-5$")], "A", "Với $x=-2$, ta có $-2+3=1>0$.", ["C14", "C58"], ["S3"], ["A03"]),
            ],
            "true_false_group": [
                tf_base,
                tf_group("tf_02", "Cho $P(x): x^2=4$ trên $\\mathbb{R}$. Xét các khẳng định sau:", [("a", "$P(2)$ là mệnh đề đúng.", True), ("b", "$P(-2)$ là mệnh đề đúng.", True), ("c", "$P(0)$ là mệnh đề đúng.", False), ("d", "$P(3)$ là mệnh đề đúng.", False)], "Thay từng giá trị vào vị từ: chỉ $x=2$ và $x=-2$ cho kết quả đúng.", ["C53", "C58"], ["S3"], ["A03"]),
            ],
            "short_answer": [
                short_base,
                short("short_02", "Có bao nhiêu số tự nhiên $x\\in\\{0,1,2,3\\}$ làm $x^2-1=0$ đúng?", "1", ["1", "một", "1 giá trị"], "Chỉ $x=1$ thỏa mãn.", ["C65"], ["S16"], ["A19"]),
                short("short_03", "Trong tập $\\{-2,-1,0,1,2\\}$ có bao nhiêu giá trị làm $x^2\\le1$ đúng?", "3", ["3", "ba", "3 giá trị"], "Các giá trị là $-1,0,1$.", ["C65"], ["S16"], ["A19"]),
            ],
        }

    if lesson_id == "03-phu-dinh-menh-de":
        return {
            "multiple_choice": [
                mc_base,
                mc("mc_02", "Phủ định của $P: \\exists x\\in\\mathbb{R},\\;x^2=1$ là mệnh đề nào?", [("A", "$\\forall x\\in\\mathbb{R},\\;x^2\\ne1$"), ("B", "$\\exists x\\in\\mathbb{R},\\;x^2\\ne1$"), ("C", "$\\forall x\\in\\mathbb{R},\\;x^2=1$"), ("D", "$\\exists x\\in\\mathbb{R},\\;x^2\\le1$")], "A", "Phủ định lượng từ tồn tại bằng lượng từ với mọi, đồng thời phủ định mệnh đề bên trong.", ["C22", "C29"], ["S8"], ["A11"]),
                mc("mc_03", "Phủ định của mệnh đề $x\\ge2$ là gì?", [("A", "$x>2$"), ("B", "$x\\ne2$"), ("C", "$x<2$"), ("D", "$x\\le2$")], "C", "Phủ định của quan hệ $\\ge$ là quan hệ $<$.", ["C31"], ["S7"], ["A09"]),
                mc("mc_04", "Phủ định của phát biểu “Mọi số nguyên đều chẵn” là gì?", [("A", "Mọi số nguyên đều lẻ."), ("B", "Có một số nguyên lẻ."), ("C", "Không có số nguyên lẻ."), ("D", "Mọi số nguyên không chẵn.")], "B", "Phủ định của “mọi” là “tồn tại ít nhất một”, và phủ định của chẵn là lẻ.", ["C23", "C26"], ["S6"], ["A08"]),
                mc("mc_05", "Phủ định của $\\exists n\\in\\mathbb{N}: n^2=4$ là gì?", [("A", "$\\exists n\\in\\mathbb{N}:n^2\\ne4$"), ("B", "$\\forall n\\in\\mathbb{N}:n^2=4$"), ("C", "$\\exists n\\in\\mathbb{N}:n^2<4$"), ("D", "$\\forall n\\in\\mathbb{N}:n^2\\ne4$")], "D", "Đổi $\\exists$ thành $\\forall$ và đổi $=$ thành $\\ne$.", ["C30", "C34"], ["S8"], ["A11"]),
                mc("mc_06", "Phủ định của $\\forall x\\in\\mathbb{R},\\;x^2+1>0$ là gì?", [("A", "$\\exists x\\in\\mathbb{R},\\;x^2+1\\le0$"), ("B", "$\\forall x\\in\\mathbb{R},\\;x^2+1\\le0$"), ("C", "$\\exists x\\in\\mathbb{R},\\;x^2+1<0$"), ("D", "$\\forall x\\in\\mathbb{R},\\;x^2+1<0$")], "A", "Đổi $\\forall$ thành $\\exists$ và $>$ thành $\\le$.", ["C27", "C32"], ["S8"], ["A11"]),
            ],
            "true_false_group": [
                tf_base,
                tf_group("tf_02", "Xét các quy tắc phủ định:", [("a", "$\\neg(\\forall x, P(x))\\Leftrightarrow\\exists x,\\neg P(x)$.", True), ("b", "$\\neg(\\exists x, P(x))\\Leftrightarrow\\exists x,\\neg P(x)$.", False), ("c", "Phủ định của $>$ là $\\le$.", True), ("d", "Phủ định của “P và Q” là “không P và không Q”.", False)], "Lượng từ phải đổi theo De Morgan; phủ định của “P và Q” là “không P hoặc không Q”.", ["C31", "C33"], ["S7", "S8"], ["A09", "A11"]),
            ],
            "short_answer": [
                short_base,
                short("short_02", "Viết phủ định của mệnh đề $x>3$ dưới dạng bất đẳng thức. Đây là câu trả lời ngắn, nhập $x\\le3$.", "x≤3", ["x≤3", "x <= 3", "x<=3"], "Phủ định của $x>3$ là $x\\le3$.", ["C31"], ["S7"], ["A09"]),
                short("short_03", "Trong phủ định của $\\forall x\\in\\mathbb{R},\\;\\exists y\\in\\mathbb{R},\\;P(x,y)$ có bao nhiêu lượng từ bị đổi?", "2", ["2", "hai", "2 lượng từ"], "Cả $\\forall$ và $\\exists$ đều phải đổi khi phủ định.", ["C33", "C34"], ["S8"], ["A11"]),
            ],
        }

    if lesson_id == "04-menh-de-keo-theo":
        return {
            "multiple_choice": [
                mc_base,
                mc("mc_02", "Một phản ví dụ của mệnh đề $x>-3\\Rightarrow x^2>9$ là giá trị nào?", [("A", "$x=-4$"), ("B", "$x=0$"), ("C", "$x=4$"), ("D", "$x=10$")], "B", "Với $x=0$, vế trước đúng nhưng $0^2>9$ sai.", ["C21"], ["S10"], ["A13"]),
                mc("mc_03", "Mệnh đề nào sau đây là đúng?", [("A", "$n\\vdots6\\Rightarrow n\\vdots3$"), ("B", "$n\\vdots3\\Rightarrow n\\vdots6$"), ("C", "$n>0\\Rightarrow n^2>n$ với mọi $n\\in\\mathbb{R}$"), ("D", "$a>b\\Rightarrow a^2>b^2$ với mọi $a,b\\in\\mathbb{R}$")], "A", "Số chia hết cho 6 luôn chia hết cho 3.", ["C18"], ["S9"], ["A12"]),
                mc("mc_04", "Mệnh đề đảo của “Nếu một tứ giác là hình vuông thì nó là hình chữ nhật” là gì?", [("A", "Nếu là hình chữ nhật thì là hình vuông."), ("B", "Nếu không là hình vuông thì không là hình chữ nhật."), ("C", "Nếu là hình vuông thì không là hình chữ nhật."), ("D", "Nếu là hình chữ nhật thì không là hình vuông.")], "A", "Mệnh đề đảo đổi vị trí giả thiết và kết luận; mệnh đề đảo này không luôn đúng.", ["C39", "C40"], ["S9", "S11"], ["A12", "A14"]),
                mc("mc_05", "Mệnh đề $P\\Rightarrow Q$ sai trong trường hợp nào?", [("A", "$P$ sai, $Q$ sai"), ("B", "$P$ sai, $Q$ đúng"), ("C", "$P$ đúng, $Q$ sai"), ("D", "$P$ đúng, $Q$ đúng")], "C", "Đây là hàng duy nhất làm mệnh đề kéo theo sai.", ["C16"], ["S9"], ["A12"]),
                mc("mc_06", "Với $x\\in\\mathbb{Z}$, khẳng định nào đúng?", [("A", "$x^2\\text{ chẵn}\\Rightarrow x\\text{ lẻ}$"), ("B", "$x\\text{ lẻ}\\Rightarrow x^2\\text{ chẵn}$"), ("C", "$x\\text{ chẵn}\\Leftrightarrow x^2\\text{ chẵn}$"), ("D", "$x^2\\text{ lẻ}\\Rightarrow x\\text{ chẵn}$")], "C", "Một số nguyên chẵn khi và chỉ khi bình phương của nó chẵn.", ["C40", "C41"], ["S9"], ["A12"]),
            ],
            "true_false_group": [
                tf_base,
                tf_group("tf_02", "Xét các phát biểu về mệnh đề kéo theo:", [("a", "$P\\Rightarrow Q$ sai chỉ khi $P$ đúng và $Q$ sai.", True), ("b", "$P\\Rightarrow Q$ đúng thì $Q\\Rightarrow P$ cũng đúng.", False), ("c", "$P$ đúng và $Q$ sai thì $P\\Rightarrow Q$ sai.", True), ("d", "$\\neg Q\\Rightarrow\\neg P$ luôn cùng chân trị với $P\\Rightarrow Q$.", True)], "Mệnh đề phản đảo tương đương với mệnh đề kéo theo ban đầu, còn mệnh đề đảo thì không nhất thiết.", ["C21", "C64"], ["S9", "S10"], ["A12", "A13"]),
            ],
            "short_answer": [
                short_base,
                short("short_02", "Cho $U=\\{1,2,3,4,6\\}$. Có bao nhiêu phần tử là phản ví dụ của $x\\vdots2\\Rightarrow x\\vdots4$?", "2", ["2", "hai", "2 phần tử"], "Các phản ví dụ là $2$ và $6$: chia hết cho 2 nhưng không chia hết cho 4.", ["C21"], ["S10"], ["A13"]),
                short("short_03", "Trên $U=\\{-2,-1,1,2,3\\}$, có bao nhiêu giá trị làm $x>0\\Rightarrow x^2-4<0$ đúng?", "3", ["3", "ba", "3 giá trị"], "Các giá trị đúng là $-2,-1,1$? Với $x=-2,-1$ vế trước sai; với $x=1$ vế sau đúng. Vậy có 3 giá trị.", ["C21", "C64"], ["S10"], ["A13"]),
            ],
        }

    if lesson_id == "05-dao-tuong-duong-dieu-kien-can-du":
        return {
            "multiple_choice": [
                mc_base,
                mc("mc_02", "Với $P: a\\vdots6$ và $Q: (a\\vdots2\\text{ và }a\\vdots3)$ trên $\\mathbb{Z}$, khẳng định nào đúng?", [("A", "$P\\Rightarrow Q$ chỉ"), ("B", "$P\\Leftrightarrow Q$"), ("C", "$Q\\Rightarrow P$ chỉ"), ("D", "Không có chiều nào đúng")], "B", "Một số chia hết cho 6 khi và chỉ khi chia hết cho cả 2 và 3.", ["C19"], ["S12"], ["A15"]),
                mc("mc_03", "Mệnh đề đảo của “Nếu tam giác đều thì tam giác cân” là gì?", [("A", "Nếu tam giác cân thì tam giác đều."), ("B", "Nếu tam giác không đều thì không cân."), ("C", "Nếu tam giác đều thì không cân."), ("D", "Nếu tam giác không cân thì đều.")], "A", "Đảo mệnh đề bằng cách đổi vị trí giả thiết và kết luận; mệnh đề đảo này không luôn đúng.", ["C39"], ["S11"], ["A14"]),
                mc("mc_04", "Câu “$P$ là điều kiện cần của $Q$” tương đương với mệnh đề nào?", [("A", "$Q\\Rightarrow P$"), ("B", "$P\\Rightarrow Q$"), ("C", "$P\\Leftrightarrow Q$"), ("D", "$\\neg P\\Rightarrow Q$")], "A", "Điều kiện cần của Q phải được Q kéo theo.", ["C38"], ["S13"], ["A16"]),
                mc("mc_05", "Cặp mệnh đề nào tương đương trên $\\mathbb{R}$?", [("A", "$a=b$ và $a^2=b^2$"), ("B", "$x>0$ và $x^2>0$"), ("C", "$x=2$ và $x^2=4$"), ("D", "$a=b$ và $a+c=b+c$")], "D", "Cộng cùng một số vào hai vế là phép biến đổi tương đương.", ["C12", "C19"], ["S12"], ["A15"]),
                mc("mc_06", "Khẳng định “$Q$ là điều kiện đủ để có $P$” được viết bằng ký hiệu là gì?", [("A", "$P\\Rightarrow Q$"), ("B", "$Q\\Rightarrow P$"), ("C", "$P\\Leftrightarrow Q$"), ("D", "$\\neg Q\\Rightarrow P$")], "B", "Điều kiện đủ Q bảo đảm P, nên Q kéo theo P.", ["C38"], ["S13"], ["A16"]),
            ],
            "true_false_group": [
                tf_base,
                tf_group("tf_02", "Xét các phát biểu về điều kiện cần và đủ:", [("a", "Muốn $P\\Leftrightarrow Q$ đúng thì cả $P\\Rightarrow Q$ và $Q\\Rightarrow P$ phải đúng.", True), ("b", "$P$ là điều kiện đủ của $Q$ nghĩa là $Q\\Rightarrow P$.", False), ("c", "$Q$ là điều kiện cần của $P$ nghĩa là $P\\Rightarrow Q$.", True), ("d", "Chỉ cần một chiều đúng là đủ kết luận $P\\Leftrightarrow Q$.", False)], "Tương đương cần hai chiều; điều kiện đủ và cần được đọc theo chiều của mệnh đề kéo theo.", ["C38", "C39"], ["S11", "S13"], ["A14", "A16"]),
            ],
            "short_answer": [
                short_base,
                short("short_02", "Nếu $P\\Rightarrow Q$ đúng nhưng $Q\\Rightarrow P$ sai, có bao nhiêu chiều của $P\\Leftrightarrow Q$ đúng?", "1", ["1", "một", "1 chiều"], "Chỉ chiều $P\\Rightarrow Q$ đúng.", ["C12", "C39"], ["S11", "S12"], ["A14", "A15"]),
                short("short_03", "Trên $\\mathbb{Z}$, mệnh đề “$a\\vdots6$ khi và chỉ khi $a$ chia hết cho 2 và 3” là Đúng hay Sai?", "Đúng", ["Đúng", "Dung", "true", "1"], "Đây là tính chất chia hết: $6=2\\cdot3$ và 2, 3 nguyên tố cùng nhau.", ["C19"], ["S12"], ["A15"]),
            ],
        }

    if lesson_id == "06-voi-moi-ton-tai-va-nhieu-bien":
        return {
            "multiple_choice": [
                mc_base,
                mc("mc_02", "Mệnh đề nào sau đây là đúng?", [("A", "$\\exists x\\in\\mathbb{Q},\\;x^2=4$"), ("B", "$\\forall x\\in\\mathbb{R},\\;x^2>0$"), ("C", "$\\exists x\\in\\mathbb{R},\\;x^2+1=0$"), ("D", "$\\forall n\\in\\mathbb{N},\\;n^2+1\\text{ chia hết cho }3$")], "A", "Nhân chứng $x=2$ hoặc $x=-2$ làm mệnh đề tồn tại đúng.", ["C15", "C42"], ["S5"], ["A07"]),
                mc("mc_03", "Mệnh đề nào sau đây là đúng?", [("A", "$\\forall x\\in\\mathbb{R},\\;|x|<x$"), ("B", "$\\forall x\\in\\mathbb{R},\\;|x|\\ge x$"), ("C", "$\\exists x\\in\\mathbb{Q},\\;x^2=3$"), ("D", "$\\exists n\\in\\mathbb{N},\\;n(n+1)\\text{ là số lẻ}$")], "B", "Với mọi số thực, giá trị tuyệt đối không nhỏ hơn số đó.", ["C20", "C49"], ["S5"], ["A07"]),
                mc("mc_04", "Mệnh đề nào sau đây là sai?", [("A", "$\\exists x\\in\\mathbb{R},\\;x^2=0$"), ("B", "$\\forall x\\in\\mathbb{R},\\;x^2+1>0$"), ("C", "$\\exists x\\in\\mathbb{R},\\;x^2+1=0$"), ("D", "$\\exists x\\in\\mathbb{Q},\\;4x^2-1=0$")], "C", "Bình phương số thực luôn không âm nên không thể bằng $-1$.", ["C47", "C48"], ["S5"], ["A07"]),
                mc("mc_05", "Mệnh đề nào sau đây đúng trên $\\mathbb{R}$?", [("A", "$\\forall x\\;\\exists y: y=x+1$"), ("B", "$\\exists y\\;\\forall x: y=x+1$"), ("C", "$\\forall x\\;\\forall y: x+y=1$"), ("D", "$\\exists x\\;\\forall y: xy=0$")], "A", "Với mỗi x, chọn nhân chứng $y=x+1$.", ["C42", "C59"], ["S4", "S14"], ["A06", "A17"]),
                mc("mc_06", "Mệnh đề nào sau đây đúng trên $\\mathbb{R}$?", [("A", "$\\exists x\\;\\forall y: xy=0$"), ("B", "$\\exists x\\;\\forall y: xy=y$"), ("C", "$\\forall x\\;\\exists y: xy=1$"), ("D", "$\\forall x\\;\\forall y: xy=y$")], "B", "Chọn nhân chứng $x=1$, khi đó $xy=y$ với mọi y.", ["C59", "C62"], ["S14"], ["A17"]),
            ],
            "true_false_group": [
                tf_base,
                tf_group("tf_02", "Xét các mệnh đề nhiều biến trên $\\mathbb{R}$:", [("a", "$\\forall x\\forall y, x+y=1$ là mệnh đề sai.", True), ("b", "$\\exists x\\exists y, x+y=2$ là mệnh đề đúng.", True), ("c", "$\\exists x\\forall y, xy=y$ là mệnh đề đúng.", True), ("d", "$\\forall x\\exists y, x+y=0$ là mệnh đề sai.", False)], "Cần chú ý thứ tự lượng từ: với (c) chọn x=1; với (d), mỗi x có thể chọn y=-x.", ["C59", "C62", "C63"], ["S14"], ["A17"]),
            ],
            "short_answer": [
                short_base,
                short("short_02", "Trong biểu thức $\\forall x\\in\\mathbb{R},\\;\\exists y\\in\\mathbb{R},\\;\\forall z\\in\\mathbb{R},\\;P(x,y,z)$ có bao nhiêu lượng từ?", "3", ["3", "ba", "3 lượng từ"], "Có ba ký hiệu lượng từ: $\\forall,\\exists,\\forall$.", ["C42", "C59"], ["S4", "S14"], ["A06", "A17"]),
                short("short_03", "Chọn một nhân chứng dương cho mệnh đề $\\exists x\\in\\mathbb{Z}: x^2=1$. Nhập giá trị x.", "1", ["1", "x=1"], "$x=1$ là một nhân chứng hợp lệ.", ["C59"], ["S14"], ["A17"]),
            ],
        }

    if lesson_id == "07-tong-hop-tham-so-phan-vi-du-vdc":
        return {
            "multiple_choice": [
                mc_base,
                mc("mc_02", "Tìm điều kiện của m để $\\forall x\\in\\mathbb{R},\\;x^2-2x+m>0$ đúng.", [("A", "$m>1$"), ("B", "$m\\ge1$"), ("C", "$m<1$"), ("D", "$m\\le1$")], "A", "Ta có $(x-1)^2+m-1>0$ với mọi x khi và chỉ khi $m-1>0$.", ["C13", "C68"], ["S15"], ["A18"]),
                mc("mc_03", "Mệnh đề $\\exists x\\in\\mathbb{R}:x^2-4x+m=0$ đúng khi nào?", [("A", "$m<4$"), ("B", "$m\\le4$"), ("C", "$m>4$"), ("D", "$m\\ge4$")], "B", "Phương trình có nghiệm thực khi $\\Delta'=4-m\\ge0$, tức $m\\le4$.", ["C13"], ["S15"], ["A18"]),
                mc("mc_04", "Có bao nhiêu giá trị nguyên $m\\in[-3,3]$ để $\\forall x\\in\\mathbb{R},\\;x^2+m>0$?", [("A", "2"), ("B", "3"), ("C", "4"), ("D", "5")], "B", "Tại x=0 cần m>0; các giá trị là 1, 2, 3.", ["C66", "C68"], ["S15", "S16"], ["A18", "A19"]),
                mc("mc_05", "Với x nguyên, phản ví dụ của $x>0\\Rightarrow x^2-4<0$ là giá trị nào?", [("A", "$x=-1$"), ("B", "$x=1$"), ("C", "$x=2$"), ("D", "$x=0$")], "C", "Tại x=2, vế trước đúng còn $2^2-4<0$ sai.", ["C66", "C67"], ["S10", "S16"], ["A13", "A19"]),
                mc("mc_06", "Chiến lược phù hợp nhất cho bài $\\forall x, P_m(x)$ chứa tham số là gì?", [("A", "Chỉ thử vài giá trị x"), ("B", "Bỏ qua miền xác định"), ("C", "Chuyển thành điều kiện nghiệm hoặc dấu rồi biện luận m"), ("D", "Chọn m lớn nhất")], "C", "Cần biến mệnh đề lượng từ thành điều kiện đại số đúng trên toàn miền.", ["C13", "C68", "C70"], ["S15", "S17", "S18"], ["A18", "A20"]),
            ],
            "true_false_group": [
                tf_base,
                tf_group("tf_02", "Cho $Q(m): \\forall x\\in\\mathbb{R},\\;x^2-2mx+m+6>0$.", [("a", "$Q(0)$ là mệnh đề đúng.", True), ("b", "$Q(1)$ là mệnh đề đúng.", True), ("c", "$Q(3)$ là mệnh đề đúng.", False), ("d", "$Q(m)$ đúng khi $-2<m<3$.", True)], "Điều kiện là $-2<m<3$ từ $\\Delta'<0$.", ["C13", "C68"], ["S15"], ["A18"]),
            ],
            "short_answer": [
                short_base,
                short("short_02", "Có bao nhiêu số nguyên $m\\in[-3,3]$ thỏa mãn $m>1$?", "2", ["2", "hai", "2 giá trị"], "Hai giá trị là $m=2$ và $m=3$.", ["C66", "C68"], ["S16"], ["A19"]),
                short("short_03", "Trên $\\{-3,-2,-1,0,1,2,3\\}$, có bao nhiêu giá trị làm $x>0\\Rightarrow x^2-4<0$ đúng?", "5", ["5", "năm", "5 giá trị"], "Mệnh đề đúng với $x=-3,-2,-1,0,1$; sai tại $x=2,3$.", ["C66", "C67"], ["S16", "S18"], ["A19", "A20"]),
            ],
        }

    raise ValueError(f"No assessment pool definition for {lesson_id}")


DELIVERY: dict[str, dict[str, dict[str, list[str]]]] = {
    "01-menh-de-va-tinh-dung-sai": {
        "guided_practice": {"multiple_choice": ["mc_01", "mc_02"]},
        "independent_check": {"multiple_choice": ["mc_03"], "true_false_group": ["tf_01"]},
        "transfer": {"short_answer": ["short_01"]},
    },
    "02-menh-de-chua-bien": {
        "guided_practice": {"multiple_choice": ["mc_01", "mc_02"]},
        "independent_check": {"multiple_choice": ["mc_03"], "true_false_group": ["tf_01"]},
        "transfer": {"short_answer": ["short_01", "short_02"]},
    },
    "03-phu-dinh-menh-de": {
        "guided_practice": {"multiple_choice": ["mc_01", "mc_02"]},
        "independent_check": {"multiple_choice": ["mc_03", "mc_04"], "true_false_group": ["tf_01", "tf_02"]},
        "transfer": {"short_answer": ["short_01", "short_02"]},
    },
    "04-menh-de-keo-theo": {
        "guided_practice": {"multiple_choice": ["mc_01", "mc_02"]},
        "independent_check": {"multiple_choice": ["mc_03", "mc_04"], "true_false_group": ["tf_01"]},
        "transfer": {"short_answer": ["short_01", "short_02"]},
    },
    "05-dao-tuong-duong-dieu-kien-can-du": {
        "guided_practice": {"multiple_choice": ["mc_01", "mc_02"]},
        "independent_check": {"multiple_choice": ["mc_03", "mc_04"], "true_false_group": ["tf_01"]},
        "transfer": {"short_answer": ["short_01", "short_02"]},
    },
    "06-voi-moi-ton-tai-va-nhieu-bien": {
        "guided_practice": {"multiple_choice": ["mc_01", "mc_02"]},
        "independent_check": {"multiple_choice": ["mc_03", "mc_04"], "true_false_group": ["tf_01", "tf_02"]},
        "transfer": {"short_answer": ["short_01", "short_02"]},
    },
    "07-tong-hop-tham-so-phan-vi-du-vdc": {
        "guided_practice": {"multiple_choice": ["mc_01", "mc_02"]},
        "independent_check": {"multiple_choice": ["mc_03", "mc_04"], "true_false_group": ["tf_01", "tf_02"]},
        "transfer": {"multiple_choice": ["mc_05", "mc_06"], "short_answer": ["short_01", "short_02", "short_03"]},
    },
}


def migrate_step(path: Path, write: bool) -> bool:
    data = json.loads(path.read_text(encoding="utf-8"))
    if "learning_scheme" in data:
        return False

    lesson_id = path.stem
    if lesson_id not in DELIVERY:
        return False

    quiz_blocks = find_quiz_blocks(data)
    pools = build_pools(quiz_blocks, lesson_id)
    delivery = DELIVERY[lesson_id]
    data["learning_scheme"] = lesson_scheme(delivery)

    mc_pool_id = f"{lesson_id}.multiple_choice"
    tf_pool_id = f"{lesson_id}.true_false_group"
    short_pool_id = f"{lesson_id}.short_answer"

    mc_refs = [
        (phase, item_id)
        for phase, phase_data in delivery.items()
        for item_id in phase_data.get("multiple_choice", [])
    ]
    tf_refs = [
        (phase, item_id)
        for phase, phase_data in delivery.items()
        for item_id in phase_data.get("true_false_group", [])
    ]
    short_refs = [
        (phase, item_id)
        for phase, phase_data in delivery.items()
        for item_id in phase_data.get("short_answer", [])
    ]

    slides = sorted(data["slides"], key=lambda slide: slide.get("slide_number", 0))
    slide_by_number = {slide.get("slide_number"): slide for slide in slides}
    replace_quiz_block(
        slide_by_number[4],
        [pool("b4_assessment_pool_mc", mc_pool_id, "multiple_choice", pools["multiple_choice"])]
        + [ref(f"b4_ref_{item_id}", mc_pool_id, item_id, phase) for phase, item_id in mc_refs if phase != "transfer"],
    )
    replace_quiz_block(
        slide_by_number[5],
        [pool("b5_assessment_pool_tf", tf_pool_id, "true_false_group", pools["true_false_group"])]
        + [ref(f"b5_ref_{item_id}", tf_pool_id, item_id, phase) for phase, item_id in tf_refs],
    )
    replace_quiz_block(
        slide_by_number[6],
        [pool("b6_assessment_pool_short", short_pool_id, "short_answer", pools["short_answer"])]
        + [ref(f"b6_ref_{item_id}", short_pool_id, item_id, phase) for phase, item_id in short_refs]
        + [ref(f"b6_ref_{item_id}", mc_pool_id, item_id, phase) for phase, item_id in mc_refs if phase == "transfer"],
    )

    slide_by_number[4]["title"] = "Luyện tập có hướng dẫn & kiểm tra độc lập · Trắc nghiệm"
    slide_by_number[5]["title"] = "Kiểm tra độc lập · Đúng / Sai 4 ý"
    slide_by_number[6]["title"] = "Transfer · Trả lời ngắn và phản biện"
    summary = slide_by_number[7].get("blocks", [])
    for block in summary:
        content = block.get("content", {})
        if block.get("block_type") == "callout" and content.get("variant") == "theorem":
            content["title"] = "Bạn đã hoàn thành bài học"
            content["body"] = "Bạn vừa đi qua phần khái niệm, sandbox, kiểm tra độc lập và bài transfer. Các câu còn lại trong pool được giữ lại cho ôn tập thích ứng và lần luyện sau."

    split_step(data)

    if write:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--write", action="store_true", help="Write migrated raw lesson files")
    args = parser.parse_args()

    changed = []
    for path in sorted(STEPS_DIR.glob("*.json")):
        if migrate_step(path, args.write):
            changed.append(path)
    action = "migrated" if args.write else "planned"
    print(f"{action} files: {len(changed)}")
    for path in changed:
        print(f"  {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()

import unittest

from app.lesson_contract import (
    document_payload,
    lesson_checksum,
    public_document_payload,
    validate_lesson_document,
)


def lesson_content():
    def metadata(difficulty):
        return {
            "difficulty": difficulty,
            "outcomeIds": ["logic.test"],
            "misconceptionIds": [],
            "sourceMapping": {
                "document": "chuyen-de-menh-de-va-tap-hop-toan-10.pdf",
                "sha256": "6f41eaf9891d0d35cf567a9b1503e5f5c26376d24406c8b687d83ac7bb4d58f3",
                "sourceQuestionIds": ["C1"],
                "page": 12,
                "section": "Bài 1. Mệnh đề",
            },
        }

    multiple_choice = []
    for difficulty, count in (("easy", 7), ("medium", 7), ("hard", 7)):
        for index in range(count):
            multiple_choice.append({
                "id": f"mc_{len(multiple_choice) + 1:02d}",
                "quiz_type": "multiple_choice",
                "question": "1 + 1 = ?",
                "options": [{"value": "2", "label": "2"}],
                "correct": "2",
                **metadata(difficulty),
            })

    true_false = []
    for difficulty, count in (("easy", 3), ("hard", 3)):
        for index in range(count):
            true_false.append({
                "id": f"tf_{len(true_false) + 1:02d}",
                "quiz_type": "true_false_group",
                "question": "Xét khẳng định.",
                "items": [{"id": "a", "label": "1 + 1 = 2", "correct": True}] * 4,
                **metadata(difficulty),
            })

    short_answer = []
    for difficulty, count in (("easy", 3), ("hard", 3)):
        for index in range(count):
            short_answer.append({
                "id": f"short_{len(short_answer) + 1:02d}",
                "quiz_type": "short_answer",
                "question": "Tính 1 + 1.",
                "correct": "2",
                "correct_answers": ["2"],
                **metadata(difficulty),
            })

    return {
        "id": "01-demo",
        "content_key": "demo/chapter/01-demo",
        "title": "Demo",
        "course_slug": "demo",
        "chapter_slug": "chapter",
        "slides": [
            {
                "id": "s01",
                "order_index": 0,
                "blocks": [
                    {
                        "id": "text-1",
                        "block_type": "text",
                        "content": {"paragraphs": ["Hello"]},
                    },
                    {
                        "id": "pool-1",
                        "block_type": "assessment_pool",
                        "content": {
                            "poolId": "demo.pool",
                            "quiz_type": "multiple_choice",
                            "items": multiple_choice,
                        },
                    },
                    {
                        "id": "tf-pool-1",
                        "block_type": "assessment_pool",
                        "content": {
                            "poolId": "demo.true_false_group",
                            "quiz_type": "true_false_group",
                            "items": true_false,
                        },
                    },
                    {
                        "id": "short-pool-1",
                        "block_type": "assessment_pool",
                        "content": {
                            "poolId": "demo.short_answer",
                            "quiz_type": "short_answer",
                            "items": short_answer,
                        },
                    },
                    {
                        "id": "ref-1",
                        "block_type": "assessment_ref",
                        "content": {
                            "poolId": "demo.pool",
                            "itemId": "mc_01",
                            "phase": "guided_practice",
                        },
                    },
                    {
                        "id": "adaptive-1",
                        "block_type": "adaptive_assessment",
                        "content": {"questionCount": 9},
                    },
                ],
            }
        ],
    }


class LessonContractTests(unittest.TestCase):
    def test_accepts_legacy_type_and_normalizes_to_block_type(self):
        content = lesson_content()
        content["slides"][0]["blocks"][0] = {
            "id": "text-1",
            "type": "text",
            "block_data": {"paragraphs": ["Hello"]},
        }
        document = validate_lesson_document(content)
        self.assertEqual(document.slides[0].blocks[0].block_type, "text")
        self.assertEqual(document.slides[0].blocks[0].content["paragraphs"], ["Hello"])

    def test_public_payload_removes_pools_and_answer_keys(self):
        document = validate_lesson_document(lesson_content())
        public = public_document_payload(document)
        block_types = [block["block_type"] for block in public["slides"][0]["blocks"]]
        self.assertNotIn("assessment_pool", block_types)
        self.assertNotIn("assessment_ref", block_types)
        self.assertIn("adaptive_assessment", block_types)
        serialized = str(public)
        self.assertNotIn("'correct'", serialized)
        self.assertNotIn("correct_answers", serialized)

    def test_checksum_is_stable(self):
        content = lesson_content()
        self.assertEqual(lesson_checksum(content), lesson_checksum(document_payload(content)))

    def test_rejects_unknown_block_type(self):
        content = lesson_content()
        content["slides"][0]["blocks"][0]["block_type"] = "execute_js"
        with self.assertRaises(ValueError):
            validate_lesson_document(content)

    def test_rejects_broken_assessment_reference(self):
        content = lesson_content()
        reference = next(block for block in content["slides"][0]["blocks"] if block["block_type"] == "assessment_ref")
        reference["content"]["itemId"] = "missing"
        with self.assertRaises(ValueError):
            validate_lesson_document(content)


if __name__ == "__main__":
    unittest.main()

import unittest

from app.lesson_contract import (
    document_payload,
    lesson_checksum,
    public_document_payload,
    validate_lesson_document,
)


def lesson_content():
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
                            "items": [
                                {
                                    "id": "mc_01",
                                    "quiz_type": "multiple_choice",
                                    "question": "1 + 1 = ?",
                                    "options": [{"value": "2", "label": "2"}],
                                    "correct": "2",
                                }
                            ],
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

    def test_public_payload_removes_pools_and_materializes_reference(self):
        document = validate_lesson_document(lesson_content())
        public = public_document_payload(document)
        block_types = [block["block_type"] for block in public["slides"][0]["blocks"]]
        self.assertNotIn("assessment_pool", block_types)
        self.assertIn("quiz", block_types)
        quiz = next(block for block in public["slides"][0]["blocks"] if block["block_type"] == "quiz")
        self.assertEqual(quiz["content"]["correct"], "2")

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
        content["slides"][0]["blocks"][-1]["content"]["itemId"] = "missing"
        with self.assertRaises(ValueError):
            validate_lesson_document(content)


if __name__ == "__main__":
    unittest.main()

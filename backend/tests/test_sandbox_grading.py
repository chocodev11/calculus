import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.sandbox_grading import grade_answer


class SandboxGradingTests(unittest.TestCase):
    def test_sets_ignore_order_and_duplicates(self):
        result = grade_answer("set", [3, 1, 3], [1, 3])
        self.assertTrue(result["correct"])
        self.assertEqual(result["normalized_answer"], [1, 3])

    def test_interval_keeps_endpoint_semantics(self):
        result = grade_answer(
            "interval",
            {"kind": "interval", "left": 0, "right": 1, "leftClosed": True, "rightClosed": False},
            {"kind": "interval", "left": 0, "right": 1, "leftClosed": False, "rightClosed": False},
        )
        self.assertFalse(result["correct"])

    def test_expression_does_not_execute_python(self):
        result = grade_answer("expression", '__import__("os")', "0")
        self.assertFalse(result["correct"])

    def test_angle_tolerance_and_radian_period(self):
        result = grade_answer("angle", 2 * 3.141592653589793 + 0.1, {"value": 0.1, "unit": "radian", "tolerance": 1e-9})
        self.assertTrue(result["correct"])


if __name__ == "__main__":
    unittest.main()

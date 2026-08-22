import unittest

from app.adaptive_learning import (
    BAND_MIX,
    bonus_xp,
    next_band,
    select_next_item,
    session_summary,
    update_recovery_state,
)


def candidate_pool():
    items = []
    for item_type, amount in (("choice", 21), ("boolean_group", 6), ("short_answer", 6)):
        for index in range(amount):
            if item_type == "choice":
                difficulty = ("easy", "medium", "hard")[index // 7]
            else:
                difficulty = "easy" if index < 3 else "hard"
            items.append(
                {
                    "id": f"{item_type}-{index}",
                    "item_key": f"{item_type}-{index}",
                    "item_type": item_type,
                    "difficulty": difficulty,
                    "outcome_ids": ["logic.test"],
                }
            )
    return items


class AdaptiveLearningTests(unittest.TestCase):
    def test_band_mix_matches_nine_question_contract(self):
        self.assertEqual(BAND_MIX[0], {"easy": 6, "medium": 2, "hard": 1})
        self.assertEqual(sum(BAND_MIX[4].values()), 9)
        self.assertLessEqual(BAND_MIX[4]["hard"], 5)

    def test_selector_meets_type_and_band_mix_without_repeating_items(self):
        items = candidate_pool()
        history = []
        state = {"consecutive_wrong": 0, "recovery_active": False}
        for _ in range(9):
            selected = select_next_item(items, history, 0, state, {})
            self.assertIsNotNone(selected)
            history.append(
                {
                    "item_key": selected["item_key"],
                    "item_type": selected["item_type"],
                    "difficulty": selected["difficulty"],
                    "is_correct": True,
                }
            )
        summary = session_summary(history)
        self.assertEqual(summary["total"], 9)
        self.assertEqual(summary["by_type"]["multiple_choice"]["attempts"], 5)
        self.assertEqual(summary["by_type"]["true_false_group"]["attempts"], 2)
        self.assertEqual(summary["by_type"]["short_answer"]["attempts"], 2)
        self.assertEqual(
            {difficulty: summary["by_difficulty"][difficulty]["attempts"] for difficulty in ("easy", "medium", "hard")},
            {"easy": 6, "medium": 2, "hard": 1},
        )
        self.assertEqual(len({row["item_key"] for row in history}), 9)

    def test_recovery_forces_easy_until_easy_is_correct(self):
        state = update_recovery_state({}, "easy", False)
        state = update_recovery_state(state, "medium", False)
        self.assertTrue(state["recovery_active"])
        selected = select_next_item(candidate_pool(), [], 4, state, {})
        self.assertEqual(selected["difficulty"], "easy")
        state = update_recovery_state(state, "easy", True)
        self.assertFalse(state["recovery_active"])

    def test_recovery_and_hard_cap_hold_during_delivery(self):
        items = candidate_pool()
        history = []
        state = {}
        hard_streak = 0
        for _ in range(9):
            selected = select_next_item(items, history, 4, state, {})
            self.assertIsNotNone(selected)
            difficulty = selected["difficulty"]
            if difficulty == "hard":
                hard_streak += 1
            else:
                hard_streak = 0
            self.assertLessEqual(hard_streak, 2)
            history.append(
                {
                    "item_key": selected["item_key"],
                    "item_type": selected["item_type"],
                    "difficulty": difficulty,
                    "is_correct": True,
                }
            )
        self.assertLessEqual(sum(row["difficulty"] == "hard" for row in history), 5)

        recovery_state = {}
        recovery_history = []
        for _ in range(2):
            selected = select_next_item(items, recovery_history, 4, recovery_state, {})
            self.assertIsNotNone(selected)
            recovery_history.append(
                {
                    "item_key": selected["item_key"],
                    "item_type": selected["item_type"],
                    "difficulty": selected["difficulty"],
                    "is_correct": False,
                }
            )
            recovery_state = update_recovery_state(recovery_state, selected["difficulty"], False)
        selected = select_next_item(items, recovery_history, 4, recovery_state, {})
        self.assertEqual(selected["difficulty"], "easy")

    def test_promotion_and_demotion_are_bounded(self):
        strong = {
            "easy_accuracy": 1.0,
            "medium_accuracy": 1.0,
            "hard_accuracy": 1.0,
            "overall_accuracy": 1.0,
            "by_difficulty": {
                "easy": {"attempts": 6, "correct": 6},
                "medium": {"attempts": 2, "correct": 2},
                "hard": {"attempts": 1, "correct": 1},
            },
            "consecutive_wrong": 0,
        }
        self.assertEqual(next_band(0, strong), 1)
        self.assertEqual(next_band(1, strong), 2)
        self.assertEqual(next_band(2, strong), 3)
        self.assertEqual(next_band(3, strong, stable_sessions=1), 3)
        self.assertEqual(next_band(3, strong, stable_sessions=2), 4)
        self.assertEqual(next_band(4, {**strong, "easy_accuracy": 0.5}, stable_sessions=2), 3)
        self.assertEqual(next_band(4, {**strong, "consecutive_wrong": 2}), 4)

    def test_promotion_uses_the_current_band_question_mix(self):
        band_two = {
            "easy_accuracy": 1.0,
            "medium_accuracy": 1.0,
            "hard_accuracy": 0.0,
            "overall_accuracy": 8 / 9,
            "by_difficulty": {
                "easy": {"attempts": 4, "correct": 4},
                "medium": {"attempts": 2, "correct": 2},
                "hard": {"attempts": 3, "correct": 2},
            },
            "consecutive_wrong": 0,
        }
        self.assertEqual(next_band(2, band_two), 3)

        band_three = {
            **band_two,
            "easy_accuracy": 1.0,
            "medium_accuracy": 1.0,
            "hard_accuracy": 0.75,
            "overall_accuracy": 8 / 9,
            "by_difficulty": {
                "easy": {"attempts": 3, "correct": 3},
                "medium": {"attempts": 2, "correct": 2},
                "hard": {"attempts": 4, "correct": 3},
            },
        }
        self.assertEqual(next_band(3, band_three, stable_sessions=1), 3)
        self.assertEqual(next_band(3, band_three, stable_sessions=2), 4)

    def test_xp_uses_first_correct_attempt_difficulty(self):
        history = [
            {"difficulty": "easy", "is_correct": True},
            {"difficulty": "medium", "is_correct": True},
            {"difficulty": "hard", "is_correct": False},
        ]
        self.assertEqual(bonus_xp(history), 16)


if __name__ == "__main__":
    unittest.main()

"""Pure adaptive-learning rules shared by the session API and unit tests.

The module deliberately does not know about SQLAlchemy.  A session stores the
history produced here, while the router is responsible for persistence and
authorization.
"""

from __future__ import annotations

from collections import Counter
from functools import lru_cache
from itertools import product
from typing import Any, Iterable, Mapping


DIFFICULTIES = ("easy", "medium", "hard")
DELIVERY_TYPES = ("multiple_choice", "true_false_group", "short_answer")
TYPE_QUOTAS = {
    "multiple_choice": 5,
    "true_false_group": 2,
    "short_answer": 2,
}
BAND_MIX = {
    0: {"easy": 6, "medium": 2, "hard": 1},
    1: {"easy": 5, "medium": 2, "hard": 2},
    2: {"easy": 4, "medium": 2, "hard": 3},
    3: {"easy": 3, "medium": 2, "hard": 4},
    4: {"easy": 3, "medium": 1, "hard": 5},
}
MAX_HARD_PER_SESSION = 5
SESSION_QUESTION_COUNT = 9
XP_BY_DIFFICULTY = {"easy": 6, "medium": 10, "hard": 16}
ITEM_TYPE_TO_DELIVERY = {
    "choice": "multiple_choice",
    "multiple_choice": "multiple_choice",
    "boolean_group": "true_false_group",
    "true_false_group": "true_false_group",
    "short_answer": "short_answer",
    "text_input": "short_answer",
}


def normalize_band(band: int | None) -> int:
    return max(0, min(4, int(band or 0)))


def band_mix(band: int) -> dict[str, int]:
    return dict(BAND_MIX[normalize_band(band)])


def delivery_type(item: Mapping[str, Any]) -> str:
    item_type = item.get("item_type") or item.get("quiz_type")
    return ITEM_TYPE_TO_DELIVERY.get(str(item_type), str(item_type))


def _history_counts(history: Iterable[Mapping[str, Any]]) -> tuple[Counter[str], Counter[str]]:
    difficulty_counts: Counter[str] = Counter()
    type_counts: Counter[str] = Counter()
    for entry in history:
        difficulty = entry.get("difficulty")
        item_type = delivery_type(entry)
        if difficulty in DIFFICULTIES:
            difficulty_counts[difficulty] += 1
        if item_type in DELIVERY_TYPES:
            type_counts[item_type] += 1
    return difficulty_counts, type_counts


def _accuracy_for_outcome(mastery: Mapping[str, Any], outcome_id: str) -> float:
    value = mastery.get(outcome_id, {})
    if isinstance(value, Mapping):
        if value.get("accuracy") is not None:
            return max(0.0, min(1.0, float(value["accuracy"])))
        attempts = int(value.get("attempts", 0) or 0)
        correct = int(value.get("correct", value.get("correctAttempts", 0)) or 0)
        return correct / attempts if attempts else 0.5
    if isinstance(value, (int, float)):
        return max(0.0, min(1.0, float(value)))
    return 0.5


def _weakness_score(item: Mapping[str, Any], mastery: Mapping[str, Any]) -> float:
    outcomes = item.get("outcome_ids") or item.get("outcomeIds") or []
    accuracies = [_accuracy_for_outcome(mastery, str(outcome)) for outcome in outcomes]
    return 1.0 - (sum(accuracies) / len(accuracies) if accuracies else 0.5)


def _is_recovery(state: Mapping[str, Any]) -> bool:
    return bool(state.get("recovery_active")) or int(state.get("consecutive_wrong", 0) or 0) >= 2


def _can_cover_remaining(
    demand: Mapping[str, int],
    capacities: Mapping[str, int],
    available: Iterable[tuple[Mapping[str, Any], str, str, str]],
) -> bool:
    """Check that remaining type slots can still meet difficulty quotas."""

    available_by_type: dict[str, Counter[str]] = {}
    for _item, _key, item_type, difficulty in available:
        available_by_type.setdefault(item_type, Counter())[difficulty] += 1
    types = tuple(item_type for item_type in DELIVERY_TYPES if capacities.get(item_type, 0) > 0)
    demand_tuple = tuple(max(0, int(demand.get(difficulty, 0))) for difficulty in DIFFICULTIES)
    capacity_total = sum(int(capacities.get(item_type, 0)) for item_type in types)
    if sum(demand_tuple) != capacity_total:
        return False

    @lru_cache(maxsize=None)
    def visit(index: int, remaining: tuple[int, int, int]) -> bool:
        if index == len(types):
            return remaining == (0, 0, 0)
        item_type = types[index]
        capacity = int(capacities[item_type])
        limits = available_by_type.get(item_type, Counter())
        for assignment in product(*(range(min(remaining[pos], limits.get(difficulty, 0)) + 1) for pos, difficulty in enumerate(DIFFICULTIES))):
            if sum(assignment) != capacity:
                continue
            next_remaining = tuple(remaining[pos] - assignment[pos] for pos in range(3))
            if visit(index + 1, next_remaining):
                return True
        return False

    return visit(0, demand_tuple)


def select_next_item(
    candidates: Iterable[Mapping[str, Any]],
    history: Iterable[Mapping[str, Any]],
    band: int,
    state: Mapping[str, Any] | None = None,
    mastery: Mapping[str, Any] | None = None,
) -> Mapping[str, Any] | None:
    """Choose one unseen item while respecting quotas and overload recovery.

    Candidates are sorted deterministically.  This makes retries safe and
    keeps a session reproducible when two requests inspect the same state.
    """

    history_list = list(history)
    state = state or {}
    mastery = mastery or {}
    used_keys = {str(entry.get("item_key")) for entry in history_list}
    difficulty_counts, type_counts = _history_counts(history_list)
    targets = band_mix(band)
    remaining_difficulty = {
        difficulty: max(0, targets[difficulty] - difficulty_counts[difficulty])
        for difficulty in DIFFICULTIES
    }
    remaining_types = {
        item_type: max(0, TYPE_QUOTAS[item_type] - type_counts[item_type])
        for item_type in DELIVERY_TYPES
    }
    if not any(remaining_types.values()):
        return None

    recovery = _is_recovery(state)
    hard_streak = 0
    for entry in reversed(history_list):
        if entry.get("difficulty") != "hard":
            break
        hard_streak += 1
    force_easy = recovery or hard_streak >= 2
    preferred_difficulty = "easy" if force_easy else max(
        DIFFICULTIES,
        key=lambda difficulty: (remaining_difficulty[difficulty], -DIFFICULTIES.index(difficulty)),
    )

    available = []
    for item in candidates:
        item_key = str(item.get("item_key") or item.get("id") or "")
        item_type = delivery_type(item)
        difficulty = str(item.get("difficulty") or "")
        if not item_key or item_key in used_keys or remaining_types.get(item_type, 0) <= 0:
            continue
        if difficulty not in DIFFICULTIES:
            continue
        if difficulty == "hard" and (hard_streak >= 2 or difficulty_counts["hard"] >= MAX_HARD_PER_SESSION):
            continue
        if difficulty in {"medium", "hard"} and difficulty_counts[difficulty] >= targets[difficulty]:
            continue
        if force_easy and difficulty != "easy":
            continue
        available.append((item, item_key, item_type, difficulty))

    if not available and force_easy:
        # A valid lesson always has enough easy items.  This fallback keeps a
        # partially migrated lesson usable without breaking the hard cap.
        for item in candidates:
            item_key = str(item.get("item_key") or item.get("id") or "")
            item_type = delivery_type(item)
            difficulty = str(item.get("difficulty") or "")
            if item_key in used_keys or remaining_types.get(item_type, 0) <= 0:
                continue
            if difficulty == "hard" and (hard_streak >= 2 or difficulty_counts["hard"] >= MAX_HARD_PER_SESSION):
                continue
            if difficulty == "hard" and difficulty_counts["hard"] >= targets["hard"]:
                continue
            if difficulty in DIFFICULTIES:
                available.append((item, item_key, item_type, difficulty))

    if not available:
        return None

    feasible = []
    for entry in available:
        _item, _item_key, item_type, difficulty = entry
        capacities = dict(remaining_types)
        capacities[item_type] -= 1
        demand = dict(remaining_difficulty)
        demand[difficulty] = max(0, demand[difficulty] - 1)
        if force_easy or _can_cover_remaining(demand, capacities, available):
            feasible.append(entry)
    if feasible:
        available = feasible

    def rank(entry: tuple[Mapping[str, Any], str, str, str]) -> tuple[float, float, float, str]:
        item, item_key, item_type, difficulty = entry
        difficulty_fit = 1.0 if difficulty == preferred_difficulty else 0.0
        quota_fit = remaining_difficulty[difficulty] / max(1, targets[difficulty])
        weakness = _weakness_score(item, mastery)
        last_seen = item.get("last_seen_sequence")
        age = float(last_seen) if isinstance(last_seen, (int, float)) else -1.0
        # Unseen items and weak outcomes dominate tie-breaking; age favours
        # items that have not appeared for the longest time across sessions.
        return (difficulty_fit * 100 + quota_fit * 20, weakness * 30, 1.0 if last_seen is None else 0.0, -age, item_key)

    return max(available, key=rank)[0]


def update_recovery_state(state: Mapping[str, Any] | None, difficulty: str, correct: bool) -> dict[str, Any]:
    current = dict(state or {})
    consecutive_wrong = int(current.get("consecutive_wrong", 0) or 0)
    if correct:
        consecutive_wrong = 0
        if current.get("recovery_active") and difficulty == "easy":
            current["recovery_active"] = False
    else:
        consecutive_wrong += 1
        if consecutive_wrong >= 2:
            current["recovery_active"] = True
            current["recovery_triggered"] = int(current.get("recovery_triggered", 0) or 0) + 1
    current["consecutive_wrong"] = consecutive_wrong
    return current


def session_summary(history: Iterable[Mapping[str, Any]]) -> dict[str, Any]:
    rows = list(history)
    total = len(rows)
    correct = sum(bool(row.get("is_correct", row.get("correct", False))) for row in rows)
    by_difficulty: dict[str, dict[str, int]] = {
        difficulty: {"attempts": 0, "correct": 0} for difficulty in DIFFICULTIES
    }
    by_type: dict[str, dict[str, int]] = {
        item_type: {"attempts": 0, "correct": 0} for item_type in DELIVERY_TYPES
    }
    for row in rows:
        difficulty = row.get("difficulty")
        item_type = delivery_type(row)
        is_correct = bool(row.get("is_correct", row.get("correct", False)))
        if difficulty in by_difficulty:
            by_difficulty[difficulty]["attempts"] += 1
            by_difficulty[difficulty]["correct"] += int(is_correct)
        if item_type in by_type:
            by_type[item_type]["attempts"] += 1
            by_type[item_type]["correct"] += int(is_correct)
    return {
        "total": total,
        "correct": correct,
        "overall_accuracy": correct / total if total else 0.0,
        "by_difficulty": by_difficulty,
        "by_type": by_type,
        "easy_accuracy": _bucket_accuracy(by_difficulty["easy"]),
        "medium_accuracy": _bucket_accuracy(by_difficulty["medium"]),
        "hard_accuracy": _bucket_accuracy(by_difficulty["hard"]),
        "recovery_triggered": sum(
            1 for left, right in zip(rows, rows[1:])
            if not bool(left.get("is_correct", left.get("correct", False)))
            and not bool(right.get("is_correct", right.get("correct", False)))
        ),
    }


def _bucket_accuracy(bucket: Mapping[str, int]) -> float:
    attempts = int(bucket.get("attempts", 0) or 0)
    return int(bucket.get("correct", 0) or 0) / attempts if attempts else 0.0


def next_band(
    current_band: int,
    summary: Mapping[str, Any],
    *,
    stable_sessions: int = 1,
    recent_recovery_sessions: int = 0,
) -> int:
    """Return the next band after a completed session, bounded to one step."""

    band = normalize_band(current_band)
    easy_accuracy = float(summary.get("easy_accuracy", 0.0) or 0.0)
    medium_accuracy = float(summary.get("medium_accuracy", 0.0) or 0.0)
    hard_accuracy = float(summary.get("hard_accuracy", 0.0) or 0.0)
    overall_accuracy = float(summary.get("overall_accuracy", 0.0) or 0.0)
    easy_attempts = int(summary.get("by_difficulty", {}).get("easy", {}).get("attempts", 0) or 0)
    medium_attempts = int(summary.get("by_difficulty", {}).get("medium", {}).get("attempts", 0) or 0)
    consecutive_wrong = int(summary.get("consecutive_wrong", 0) or 0)
    recovery_sessions = int(recent_recovery_sessions or 0)
    if summary.get("recovery_triggered"):
        recovery_sessions += 1

    if band > 0 and (
        easy_accuracy < 0.60
        or overall_accuracy < 0.55
        or recovery_sessions >= 2
    ):
        return band - 1
    if consecutive_wrong >= 2 or int(summary.get("recovery_triggered", 0) or 0) > 0:
        return band

    if band in {0, 1}:
        required_easy_attempts = max(5, BAND_MIX[band]["easy"])
        can_promote = (
            easy_attempts >= required_easy_attempts
            and easy_accuracy >= 0.80
            and overall_accuracy >= 0.65
        )
    else:
        can_promote = (
            easy_attempts >= BAND_MIX[band]["easy"]
            and medium_attempts >= 2
            and easy_accuracy >= 0.85
            and medium_accuracy >= 0.75
            and overall_accuracy >= 0.70
        )
    if band == 3:
        can_promote = can_promote and hard_accuracy >= 0.60 and stable_sessions >= 2
    return min(4, band + 1) if can_promote else band


def score_percent(summary: Mapping[str, Any]) -> int:
    total = int(summary.get("total", 0) or 0)
    return round((int(summary.get("correct", 0) or 0) / total) * 100) if total else 0


def bonus_xp(history: Iterable[Mapping[str, Any]]) -> int:
    return sum(
        XP_BY_DIFFICULTY.get(str(row.get("difficulty")), 0)
        for row in history
        if bool(row.get("is_correct", row.get("correct", False)))
    )

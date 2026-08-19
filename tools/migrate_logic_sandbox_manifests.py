import argparse
import json
from pathlib import Path
from typing import Any


RECIPE_BY_MODE = {
    "proposition_classifier": "logic.proposition",
    "quantifier_negation": "logic.quantifier",
    "implication": "logic.implication",
    "parameter_implication": "logic.parameter_truth",
}

GOAL_EVIDENCE = {
    "classifier_accuracy": "logic.classifier_complete",
    "quantifier_negation_accuracy": "logic.quantifier_complete",
    "implication_accuracy": "logic.implication_complete",
    "parameter_root_accuracy": "logic.parameter_complete",
}

SAFE_PREDICATES = {
    ("a chia hết cho 6", "a chia hết cho 2"): ("divisible(x, 6)", "divisible(x, 2)"),
    ("Tứ giác ABCD là hình vuông", "Tứ giác ABCD là hình chữ nhật"): (
        "x == 0",
        "x == 0 || x == 1",
    ),
}


def records(value: Any):
    if isinstance(value, dict):
        if value.get("kind") == "math.sandbox":
            yield value
            return
        if value.get("interactionType") == "sandbox" and isinstance(value.get("lesson"), dict):
            yield from records(value["lesson"])
            return
        for child in value.values():
            yield from records(child)
    elif isinstance(value, list):
        for child in value:
            yield from records(child)


def controls_by_id(manifest: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {
        control["id"]: control
        for control in manifest.get("controls", [])
        if isinstance(control, dict) and isinstance(control.get("id"), str)
    }


def normalize_quantifier_items(activity: dict[str, Any], controls: dict[str, dict[str, Any]]) -> None:
    for item in activity.get("items", []):
        if not isinstance(item, dict):
            continue
        verdict_id = item.pop("controlVerdict", None)
        if verdict_id is not None:
            item["controlId"] = verdict_id

        response_id = item.pop("controlNegation", None)
        if response_id is None:
            continue

        options = controls.get(response_id, {}).get("options", [])
        expected_negation = item.get("expectedNegation")
        expected_witness = item.get("expectedWitness")
        if expected_negation in options:
            item["negationControlId"] = response_id
        if expected_witness in options:
            item["witnessControlId"] = response_id


def normalize_implication_activity(activity: dict[str, Any], controls: dict[str, dict[str, Any]]) -> None:
    forward_id = activity.pop("controlPToQ", None)
    backward_id = activity.pop("controlQToP", None)
    counterexample_id = activity.pop("controlCounterexample", None)
    if forward_id is not None:
        activity["pToQControlId"] = forward_id
    if backward_id is not None:
        activity["qToPControlId"] = backward_id

    expected_counterexamples = activity.get("expectedCounterexamples")
    if counterexample_id is not None and isinstance(expected_counterexamples, list):
        options = controls.get(counterexample_id, {}).get("options", [])
        candidates = [
            option for option in options
            if option != "none"
            and all(str(expected).lower() in str(option).lower() for expected in expected_counterexamples)
        ]
        if candidates:
            activity["qToPCounterexampleControlId"] = counterexample_id
            activity["expectedQToPCounterexample"] = candidates[0]
            activity.pop("expectedCounterexamples", None)


def normalize_implication_controls(manifest: dict[str, Any], activity: dict[str, Any]) -> None:
    ids = {
        activity.get("pToQControlId"),
        activity.get("qToPControlId"),
    }
    for control in manifest.get("controls", []):
        if not isinstance(control, dict) or control.get("id") not in ids:
            continue
        if control.get("type") != "choice" or control.get("options") != ["true", "false"]:
            continue
        control["options"] = ["Đúng", "Sai"]
        control["initial"] = "Đúng" if control.get("initial") == "true" else "Sai"
        control["optionLabels"] = {"Đúng": "Đúng (Đ)", "Sai": "Sai (S)"}


def normalize_manifest(manifest: dict[str, Any]) -> None:
    mode = manifest.pop("mode", None)
    activity = manifest.pop("activity", None)
    if not isinstance(mode, str) or not isinstance(activity, dict):
        return

    archetype_id = manifest.get("archetypeId")
    recipe = RECIPE_BY_MODE[mode]
    if mode == "implication" and archetype_id == "logic.necessary_sufficient":
        recipe = "logic.necessary_sufficient"

    controls = controls_by_id(manifest)
    if mode == "quantifier_negation":
        normalize_quantifier_items(activity, controls)
    elif mode == "implication":
        normalize_implication_activity(activity, controls)
        p_expression = activity.get("pExpression")
        q_expression = activity.get("qExpression")
        safe_pair = SAFE_PREDICATES.get((p_expression, q_expression))
        if safe_pair:
            activity["pExpressionLabel"] = p_expression
            activity["qExpressionLabel"] = q_expression
            activity["pExpression"], activity["qExpression"] = safe_pair
            if archetype_id == "logic.necessary_sufficient":
                activity["domainValues"] = [0, 1, 2]
        normalize_implication_controls(manifest, activity)
    elif mode == "parameter_implication":
        if "c_conclude" in controls:
            activity["strategyControlId"] = "c_conclude"
            activity["expectedStrategy"] = "true"

    manifest["version"] = str(manifest.get("version", "1.0.0"))
    manifest["recipe"] = recipe
    scene = manifest.setdefault("scene", {})
    scene["space"] = "condition_graph"
    manifest["config"] = {"mode": mode, "activity": activity}
    accessibility = manifest.setdefault("accessibility", {})
    accessibility["highContrast"] = True

    for goal in manifest.get("goals", []):
        if isinstance(goal, dict) and goal.get("evidence") in GOAL_EVIDENCE:
            goal["evidence"] = GOAL_EVIDENCE[goal["evidence"]]


def migrate_course(course_dir: Path, write: bool) -> int:
    changed_files = 0
    for path in sorted(course_dir.rglob("*.json")):
        document = json.loads(path.read_text(encoding="utf-8"))
        manifests = list(records(document))
        if not manifests:
            continue
        before = json.dumps(document, ensure_ascii=False, sort_keys=True)
        for manifest in manifests:
            normalize_manifest(manifest)
        after = json.dumps(document, ensure_ascii=False, sort_keys=True)
        if before == after:
            continue
        changed_files += 1
        if write:
            path.write_text(
                json.dumps(document, ensure_ascii=False, indent=2) + "\n",
                encoding="utf-8",
                newline="\n",
            )
        print(("migrated " if write else "would migrate ") + str(path))
    return changed_files


def main() -> None:
    parser = argparse.ArgumentParser(description="Migrate legacy logic sandbox envelopes to schema 1.0.")
    parser.add_argument("course", type=Path)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    changed = migrate_course(args.course, args.write)
    print(("migrated" if args.write else "planned") + " files: " + str(changed))


if __name__ == "__main__":
    main()

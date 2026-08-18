"""Validate the source-of-truth catalog for the first Math Sandbox release."""

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / "data" / "raw_courses" / "toan10_sandbox_catalog.json"
DOMAINS = {"logic", "set", "trigonometry"}
LEVELS = {"recognition", "understanding", "application", "advanced_application"}
REQUIRED = {
    "id", "domainId", "outcomeIds", "levels", "prerequisites", "misconceptions",
    "representations", "expectedAnswerTypes", "strategies",
}


def validate() -> list[str]:
    data = json.loads(CATALOG.read_text(encoding="utf-8"))
    issues: list[str] = []
    if data.get("schemaVersion") != "1.0":
        issues.append("catalog schemaVersion must be 1.0")
    if set(data.get("domains", [])) != DOMAINS:
        issues.append("catalog domains must be logic, set and trigonometry")

    ids: set[str] = set()
    domain_counts = {domain: 0 for domain in DOMAINS}
    for index, entry in enumerate(data.get("archetypes", [])):
        path = f"archetypes[{index}]"
        missing = REQUIRED - set(entry)
        if missing:
            issues.append(f"{path} missing {sorted(missing)}")
        entry_id = entry.get("id")
        if entry_id in ids:
            issues.append(f"duplicate archetype id: {entry_id}")
        ids.add(entry_id)
        domain = entry.get("domainId")
        if domain not in DOMAINS:
            issues.append(f"{path}.domainId is invalid")
        else:
            domain_counts[domain] += 1
        if not entry.get("outcomeIds"):
            issues.append(f"{path}.outcomeIds must not be empty")
        if not set(entry.get("levels", [])).issubset(LEVELS) or not entry.get("levels"):
            issues.append(f"{path}.levels is invalid")
        for field in ("representations", "expectedAnswerTypes", "strategies"):
            if not entry.get(field):
                issues.append(f"{path}.{field} must not be empty")

    if any(count == 0 for count in domain_counts.values()):
        issues.append(f"missing domain coverage: {domain_counts}")
    return issues


if __name__ == "__main__":
    problems = validate()
    if problems:
        raise SystemExit("\n".join(problems))
    print(f"sandbox catalog valid: {len(json.loads(CATALOG.read_text(encoding='utf-8'))['archetypes'])} archetypes")

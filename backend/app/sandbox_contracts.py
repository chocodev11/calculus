from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


def _bounded_json(value: Any, max_nodes: int = 512, max_string: int = 4_000) -> Any:
    nodes = 0

    def visit(item: Any, depth: int) -> None:
        nonlocal nodes
        nodes += 1
        if nodes > max_nodes or depth > 32:
            raise ValueError("JSON value is too complex")
        if isinstance(item, str) and len(item) > max_string:
            raise ValueError("JSON string is too long")
        if isinstance(item, list):
            for child in item:
                visit(child, depth + 1)
        elif isinstance(item, dict):
            for key, child in item.items():
                if not isinstance(key, str) or len(key) > 200:
                    raise ValueError("JSON object key is invalid")
                visit(child, depth + 1)

    visit(value, 0)
    return value


class SandboxManifestContract(StrictModel):
    schemaVersion: Literal["1.0"]
    kind: Literal["math.sandbox"]
    id: str = Field(min_length=1)
    version: str = Field(min_length=1)
    domainId: Literal["logic", "set", "trigonometry"]
    archetypeId: str = Field(min_length=1)
    level: Literal["recognition", "understanding", "application", "advanced_application"]
    recipe: str = Field(min_length=1)
    outcomeIds: list[str]
    prerequisites: list[str]
    misconceptions: list[str]
    scene: dict[str, Any]
    controls: list[dict[str, Any]]
    goals: list[dict[str, Any]]
    solutionGraph: dict[str, Any] | None = None
    assessment: list[dict[str, Any]]
    accessibility: dict[str, Any]
    config: dict[str, Any]
    feedback: dict[str, Any] | None = None
    analytics: list[str] = Field(default_factory=list)


class AssessmentAttemptRequest(StrictModel):
    assessment_item_id: int = Field(gt=0)
    client_attempt_id: str = Field(min_length=1, max_length=120)
    answer: Any

    @field_validator("answer")
    @classmethod
    def validate_answer_size(cls, value: Any) -> Any:
        return _bounded_json(value)


class AssessmentAttemptResponse(StrictModel):
    attempt_id: int
    assessment_item_id: int
    correct: bool
    score: int
    normalized_answer: Any
    grader_version: str


class SandboxCompletionResponse(StrictModel):
    lesson_version_id: int
    completed: bool
    score: float
    mastery: dict[str, str]


class SandboxEventInput(StrictModel):
    id: str = Field(min_length=1, max_length=120)
    sessionId: str = Field(min_length=1, max_length=120)
    manifestId: str = Field(min_length=1, max_length=200)
    manifestVersion: str = Field(min_length=1, max_length=40)
    type: str = Field(min_length=1, max_length=80)
    sequence: int = Field(ge=0)
    payload: dict[str, Any] = Field(default_factory=dict)
    occurredAt: datetime

    @field_validator("payload")
    @classmethod
    def validate_payload_size(cls, value: dict[str, Any]) -> dict[str, Any]:
        return _bounded_json(value, max_nodes=256, max_string=2_000)


class SandboxEventBatch(StrictModel):
    events: list[SandboxEventInput] = Field(min_length=1, max_length=100)

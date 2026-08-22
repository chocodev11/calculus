from typing import Any

from pydantic import Field, field_validator

from app.sandbox_contracts import StrictModel, _bounded_json


class AdaptiveSessionStartRequest(StrictModel):
    step_id: int = Field(gt=0)


class AdaptiveAttemptRequest(StrictModel):
    assessment_item_id: int = Field(gt=0)
    sequence: int = Field(ge=1, le=9)
    client_attempt_id: str = Field(min_length=1, max_length=120)
    answer: Any

    @field_validator("answer")
    @classmethod
    def validate_answer_size(cls, value: Any) -> Any:
        return _bounded_json(value)


class AdaptiveSessionResponse(StrictModel):
    session_id: int
    step_id: int
    lesson_version_id: int
    status: str
    band: int
    target_counts: dict[str, int]
    progress: dict[str, Any]
    current_item: dict[str, Any] | None = None
    summary: dict[str, Any] | None = None

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint
from sqlalchemy.sql import func

from app.database import Base


class LessonVersion(Base):
    __tablename__ = "lesson_versions"

    id = Column(Integer, primary_key=True, index=True)
    step_id = Column(Integer, ForeignKey("steps.id"), nullable=False, index=True)
    manifest_id = Column(String(200), nullable=False, index=True)
    version = Column(String(40), nullable=False)
    checksum = Column(String(128), nullable=False)
    content = Column(JSON, nullable=False)
    status = Column(String(20), nullable=False, default="draft")
    created_at = Column(DateTime, server_default=func.now())
    published_at = Column(DateTime, nullable=True)


class AssessmentItem(Base):
    __tablename__ = "assessment_items"
    __table_args__ = (UniqueConstraint("lesson_version_id", "item_key", name="uq_assessment_item_key"),)

    id = Column(Integer, primary_key=True, index=True)
    lesson_version_id = Column(Integer, ForeignKey("lesson_versions.id"), nullable=False, index=True)
    item_key = Column(String(120), nullable=False)
    item_type = Column(String(40), nullable=False)
    public_payload = Column(JSON, nullable=False)
    answer_key = Column(JSON, nullable=False)
    grader_version = Column(String(40), nullable=False)
    outcome_ids = Column(JSON, nullable=False, default=list)
    misconception_ids = Column(JSON, nullable=False, default=list)
    is_active = Column(Boolean, nullable=False, default=True)


class AssessmentAttempt(Base):
    __tablename__ = "assessment_attempts"
    __table_args__ = (UniqueConstraint("user_id", "client_attempt_id", name="uq_assessment_attempt_client_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    assessment_item_id = Column(Integer, ForeignKey("assessment_items.id"), nullable=False, index=True)
    lesson_version_id = Column(Integer, ForeignKey("lesson_versions.id"), nullable=False, index=True)
    client_attempt_id = Column(String(120), nullable=False)
    answer = Column(JSON, nullable=False)
    normalized_answer = Column(JSON, nullable=True)
    is_correct = Column(Boolean, nullable=False)
    score = Column(Integer, nullable=False, default=0)
    grader_version = Column(String(40), nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class SandboxEvent(Base):
    __tablename__ = "sandbox_events"
    __table_args__ = (UniqueConstraint("user_id", "event_id", name="uq_sandbox_event_user_id"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    event_id = Column(String(120), nullable=False)
    session_id = Column(String(120), nullable=False, index=True)
    manifest_id = Column(String(200), nullable=False)
    manifest_version = Column(String(40), nullable=False)
    event_type = Column(String(80), nullable=False)
    sequence = Column(Integer, nullable=False)
    payload = Column(JSON, nullable=False, default=dict)
    occurred_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, server_default=func.now())


class MasteryState(Base):
    __tablename__ = "mastery_states"
    __table_args__ = (UniqueConstraint("user_id", "outcome_id", name="uq_mastery_user_outcome"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    outcome_id = Column(String(160), nullable=False)
    mastery_level = Column(String(30), nullable=False, default="not_started")
    evidence = Column(JSON, nullable=False, default=dict)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class ContentReview(Base):
    __tablename__ = "content_reviews"

    id = Column(Integer, primary_key=True, index=True)
    lesson_version_id = Column(Integer, ForeignKey("lesson_versions.id"), nullable=False, index=True)
    reviewer_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    status = Column(String(30), nullable=False, default="pending")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class GenerationRecord(Base):
    __tablename__ = "generation_records"

    id = Column(Integer, primary_key=True, index=True)
    lesson_version_id = Column(Integer, ForeignKey("lesson_versions.id"), nullable=True, index=True)
    generator = Column(String(120), nullable=False)
    prompt_hash = Column(String(128), nullable=False)
    schema_version = Column(String(40), nullable=False)
    provenance = Column(JSON, nullable=False, default=dict)
    created_at = Column(DateTime, server_default=func.now())

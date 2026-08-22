"""Add adaptive assessment sessions and source-aware assessment metadata."""

from __future__ import annotations

from alembic import op
from sqlalchemy import Boolean, Column, ForeignKey, Integer, JSON, String, DateTime, inspect


revision = "20260822_0003"
down_revision = "20260821_0002"
branch_labels = None
depends_on = None


def _columns(connection, table_name: str) -> set[str]:
    return {column["name"] for column in inspect(connection).get_columns(table_name)}


def _indexes(connection, table_name: str) -> set[str]:
    return {index.get("name") for index in inspect(connection).get_indexes(table_name) if index.get("name")}


def _add_column_if_missing(connection, table_name: str, column: Column) -> None:
    if column.name not in _columns(connection, table_name):
        op.add_column(table_name, column)


def upgrade() -> None:
    connection = op.get_bind()
    table_names = set(inspect(connection).get_table_names())

    if "adaptive_sessions" not in table_names:
        op.create_table(
            "adaptive_sessions",
            Column("id", Integer(), primary_key=True),
            Column("user_id", Integer(), ForeignKey("users.id"), nullable=False),
            Column("step_id", Integer(), ForeignKey("steps.id"), nullable=False),
            Column("lesson_version_id", Integer(), ForeignKey("lesson_versions.id"), nullable=False),
            Column("band", Integer(), nullable=False, server_default="0"),
            Column("status", String(20), nullable=False, server_default="active"),
            Column("target_counts", JSON(), nullable=False, server_default="{}"),
            Column("state", JSON(), nullable=False, server_default="{}"),
            Column("started_at", DateTime(), nullable=True),
            Column("last_activity_at", DateTime(), nullable=True),
            Column("completed_at", DateTime(), nullable=True),
        )
    if "adaptive_session_items" not in table_names:
        op.create_table(
            "adaptive_session_items",
            Column("id", Integer(), primary_key=True),
            Column("session_id", Integer(), ForeignKey("adaptive_sessions.id"), nullable=False),
            Column("assessment_item_id", Integer(), ForeignKey("assessment_items.id"), nullable=False),
            Column("sequence", Integer(), nullable=False),
            Column("difficulty", String(20), nullable=False),
            Column("item_type", String(40), nullable=False),
            Column("served_at", DateTime(), nullable=True),
            Column("answered_at", DateTime(), nullable=True),
            Column("is_correct", Boolean(), nullable=True),
        )

    for table_name, index_name, columns in (
        ("adaptive_sessions", "ix_adaptive_sessions_user_id", ["user_id"]),
        ("adaptive_sessions", "ix_adaptive_sessions_step_id", ["step_id"]),
        ("adaptive_sessions", "ix_adaptive_sessions_lesson_version_id", ["lesson_version_id"]),
        ("adaptive_sessions", "ix_adaptive_sessions_status", ["status"]),
        ("adaptive_session_items", "ix_adaptive_session_items_session_id", ["session_id"]),
        ("adaptive_session_items", "ix_adaptive_session_items_assessment_item_id", ["assessment_item_id"]),
    ):
        if index_name not in _indexes(connection, table_name):
            op.create_index(index_name, table_name, columns)

    _add_column_if_missing(connection, "assessment_items", Column("pool_id", String(160), nullable=True))
    _add_column_if_missing(
        connection,
        "assessment_items",
        Column("difficulty", String(20), nullable=False, server_default="easy"),
    )
    _add_column_if_missing(
        connection,
        "assessment_items",
        Column("source_mapping", JSON(), nullable=False, server_default="{}"),
    )
    attempt_columns = _columns(connection, "assessment_attempts")
    missing_attempt_columns = [
        column
        for column in (
            Column(
                "adaptive_session_id",
                Integer(),
                ForeignKey("adaptive_sessions.id", name="fk_assessment_attempts_adaptive_session_id"),
                nullable=True,
            ),
            Column("sequence", Integer(), nullable=True),
        )
        if column.name not in attempt_columns
    ]
    if missing_attempt_columns and connection.dialect.name == "sqlite":
        with op.batch_alter_table("assessment_attempts", recreate="always") as batch:
            for column in missing_attempt_columns:
                batch.add_column(column)
    else:
        for column in missing_attempt_columns:
            op.add_column("assessment_attempts", column)

    if "ix_assessment_items_pool_id" not in _indexes(connection, "assessment_items"):
        op.create_index("ix_assessment_items_pool_id", "assessment_items", ["pool_id"])
    if "ix_assessment_attempts_adaptive_session_id" not in _indexes(connection, "assessment_attempts"):
        op.create_index(
            "ix_assessment_attempts_adaptive_session_id",
            "assessment_attempts",
            ["adaptive_session_id"],
        )
    if "uq_adaptive_session_sequence" not in _indexes(connection, "adaptive_session_items"):
        op.create_index(
            "uq_adaptive_session_sequence",
            "adaptive_session_items",
            ["session_id", "sequence"],
            unique=True,
        )
    if "uq_adaptive_session_item" not in _indexes(connection, "adaptive_session_items"):
        op.create_index(
            "uq_adaptive_session_item",
            "adaptive_session_items",
            ["session_id", "assessment_item_id"],
            unique=True,
        )
    if "uq_adaptive_attempt_sequence" not in _indexes(connection, "assessment_attempts"):
        op.create_index(
            "uq_adaptive_attempt_sequence",
            "assessment_attempts",
            ["adaptive_session_id", "sequence"],
            unique=True,
        )


def downgrade() -> None:
    connection = op.get_bind()
    for table_name, index_name in (
        ("assessment_attempts", "uq_adaptive_attempt_sequence"),
        ("assessment_attempts", "ix_assessment_attempts_adaptive_session_id"),
        ("assessment_items", "ix_assessment_items_pool_id"),
        ("adaptive_session_items", "uq_adaptive_session_item"),
        ("adaptive_session_items", "uq_adaptive_session_sequence"),
        ("adaptive_session_items", "ix_adaptive_session_items_assessment_item_id"),
        ("adaptive_session_items", "ix_adaptive_session_items_session_id"),
        ("adaptive_sessions", "ix_adaptive_sessions_status"),
        ("adaptive_sessions", "ix_adaptive_sessions_lesson_version_id"),
        ("adaptive_sessions", "ix_adaptive_sessions_step_id"),
        ("adaptive_sessions", "ix_adaptive_sessions_user_id"),
    ):
        if table_name in inspect(connection).get_table_names() and index_name in _indexes(connection, table_name):
            op.drop_index(index_name, table_name=table_name)

    if "assessment_attempts" in inspect(connection).get_table_names():
        for column_name in ("sequence", "adaptive_session_id"):
            if column_name in _columns(connection, "assessment_attempts"):
                op.drop_column("assessment_attempts", column_name)
    if "assessment_items" in inspect(connection).get_table_names():
        for column_name in ("source_mapping", "difficulty", "pool_id"):
            if column_name in _columns(connection, "assessment_items"):
                op.drop_column("assessment_items", column_name)
    if "adaptive_session_items" in inspect(connection).get_table_names():
        op.drop_table("adaptive_session_items")
    if "adaptive_sessions" in inspect(connection).get_table_names():
        op.drop_table("adaptive_sessions")

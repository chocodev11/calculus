"""Add JSON lesson publishing pointers and editor authorization."""

from __future__ import annotations

from alembic import op
from sqlalchemy import Boolean, Column, Integer, inspect, text


revision = "20260821_0002"
down_revision = "20260821_0001"
branch_labels = None
depends_on = None


def _unique_names(connection, table_name: str) -> set[str]:
    inspector = inspect(connection)
    names = {item.get("name") for item in inspector.get_unique_constraints(table_name)}
    names.update(item.get("name") for item in inspector.get_indexes(table_name) if item.get("unique"))
    return {name for name in names if name}


def _add_column_if_missing(connection, table_name: str, column: Column) -> None:
    inspector = inspect(connection)
    existing = {item["name"] for item in inspector.get_columns(table_name)}
    if column.name not in existing:
        op.add_column(table_name, column)


def _assert_no_duplicate_versions(connection) -> None:
    duplicate = connection.execute(
        text(
            "SELECT step_id, version, COUNT(*) FROM lesson_versions "
            "GROUP BY step_id, version HAVING COUNT(*) > 1 LIMIT 1"
        )
    ).first()
    if duplicate is not None:
        raise RuntimeError(
            "Cannot add lesson version uniqueness: "
            f"step_id={duplicate[0]}, version={duplicate[1]} is duplicated"
        )


def upgrade() -> None:
    connection = op.get_bind()
    _add_column_if_missing(
        connection,
        "users",
        Column("is_admin", Boolean(), nullable=False, server_default="0"),
    )
    _add_column_if_missing(
        connection,
        "steps",
        Column("published_version_id", Integer(), nullable=True),
    )

    inspector = inspect(connection)
    if "ix_steps_published_version_id" not in {
        item.get("name") for item in inspector.get_indexes("steps")
    }:
        op.create_index("ix_steps_published_version_id", "steps", ["published_version_id"])

    if "uq_lesson_version_step_version" not in _unique_names(connection, "lesson_versions"):
        _assert_no_duplicate_versions(connection)
        if connection.dialect.name == "sqlite":
            with op.batch_alter_table("lesson_versions", recreate="always") as batch:
                batch.create_unique_constraint(
                    "uq_lesson_version_step_version",
                    ["step_id", "version"],
                )
        else:
            op.create_unique_constraint(
                "uq_lesson_version_step_version",
                "lesson_versions",
                ["step_id", "version"],
            )


def downgrade() -> None:
    connection = op.get_bind()
    if "uq_lesson_version_step_version" in _unique_names(connection, "lesson_versions"):
        if connection.dialect.name == "sqlite":
            with op.batch_alter_table("lesson_versions", recreate="always") as batch:
                batch.drop_constraint("uq_lesson_version_step_version", type_="unique")
        else:
            op.drop_constraint("uq_lesson_version_step_version", "lesson_versions", type_="unique")
    inspector = inspect(connection)
    if "ix_steps_published_version_id" in {
        item.get("name") for item in inspector.get_indexes("steps")
    }:
        op.drop_index("ix_steps_published_version_id", table_name="steps")
    if "published_version_id" in {item["name"] for item in inspect(connection).get_columns("steps")}:
        op.drop_column("steps", "published_version_id")
    if "is_admin" in {item["name"] for item in inspect(connection).get_columns("users")}:
        op.drop_column("users", "is_admin")

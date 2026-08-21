"""Create the complete application schema and repair legacy SQLite databases.

This is intentionally the first revision because the project previously used
``create_all`` plus ad-hoc ALTER statements without an Alembic version table.
It is safe to run against a fresh database and against the existing local
database: existing tables are preserved and only missing columns/constraints
are added.
"""

from __future__ import annotations

from alembic import op
from sqlalchemy import inspect, text

from app.database import Base
from app import models  # noqa: F401
from app import sandbox_models  # noqa: F401


revision = "20260821_0001"
down_revision = None
branch_labels = None
depends_on = None


_UNIQUE_CONSTRAINTS = (
    ("steps", "uq_steps_content_key", ("content_key",)),
    ("slides", "uq_slides_content_key", ("content_key",)),
    ("enrollments", "uq_enrollments_user_story", ("user_id", "story_id")),
    ("step_progress", "uq_step_progress_user_step", ("user_id", "step_id")),
    ("slide_progress", "uq_slide_progress_user_slide", ("user_id", "slide_id")),
)


def _existing_unique_names(connection, table_name: str) -> set[str]:
    inspector = inspect(connection)
    names = {item.get("name") for item in inspector.get_unique_constraints(table_name)}
    names.update(
        item.get("name")
        for item in inspector.get_indexes(table_name)
        if item.get("unique")
    )
    return {name for name in names if name}


def _assert_no_duplicates(connection, table_name: str, columns: tuple[str, ...]) -> None:
    grouped = ", ".join(columns)
    non_null = " AND ".join(f"{column} IS NOT NULL" for column in columns)
    query = text(
        f"SELECT {grouped}, COUNT(*) AS duplicate_count "
        f"FROM {table_name} WHERE {non_null} "
        f"GROUP BY {grouped} HAVING COUNT(*) > 1 LIMIT 1"
    )
    duplicate = connection.execute(query).first()
    if duplicate is not None:
        values = ", ".join(str(value) for value in duplicate[:-1])
        raise RuntimeError(
            f"Cannot add {table_name} unique constraint for ({grouped}); "
            f"duplicate values: {values}. Run the migration preflight first."
        )


def _add_missing_columns(connection) -> None:
    inspector = inspect(connection)
    additions = {
        "steps": ["content_key"],
        "slides": ["content_key", "is_active"],
    }
    for table_name, column_names in additions.items():
        existing = {column["name"] for column in inspector.get_columns(table_name)}
        table = Base.metadata.tables[table_name]
        for column_name in column_names:
            if column_name not in existing:
                op.add_column(table_name, table.c[column_name].copy())


def _add_missing_unique_constraints(connection) -> None:
    for table_name, constraint_name, columns in _UNIQUE_CONSTRAINTS:
        if constraint_name in _existing_unique_names(connection, table_name):
            continue
        _assert_no_duplicates(connection, table_name, columns)
        if connection.dialect.name == "sqlite":
            with op.batch_alter_table(table_name, recreate="always") as batch:
                batch.create_unique_constraint(constraint_name, list(columns))
        else:
            op.create_unique_constraint(constraint_name, table_name, list(columns))


def upgrade() -> None:
    connection = op.get_bind()
    # Alembic owns schema creation. Calling metadata.create_all here is only
    # part of this one-time baseline; application startup never performs DDL.
    Base.metadata.create_all(bind=connection)
    _add_missing_columns(connection)
    _add_missing_unique_constraints(connection)


def downgrade() -> None:
    Base.metadata.drop_all(bind=op.get_bind())

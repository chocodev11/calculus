"""Migrate the authoritative local SQLite database to PostgreSQL.

The command is a dry-run unless ``--apply`` is supplied. It refuses to merge
into a non-empty target and quarantines slide progress whose slide no longer
exists instead of guessing a replacement.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sqlite3
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

from sqlalchemy import JSON, inspect, text
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy.engine import make_url


REPO_ROOT = Path(__file__).resolve().parents[1]
SOURCE_DEFAULT = REPO_ROOT / "backend" / "calculus.db"

# Importing the application metadata should not depend on an inherited DEBUG
# value from an unrelated shell when this standalone migration command is used.
os.environ.setdefault("APP_ENV", "local")
os.environ.setdefault("DEBUG", "false")
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.database import Base  # noqa: E402
from app import models  # noqa: F401,E402
from app import sandbox_models  # noqa: F401,E402


TABLE_ORDER = [table.name for table in Base.metadata.sorted_tables]
TABLE_ORDER.remove("slide_progress_quarantine") if "slide_progress_quarantine" in TABLE_ORDER else None
TABLE_ORDER.append("slide_progress_quarantine")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=SOURCE_DEFAULT)
    parser.add_argument("--target-url", help="PostgreSQL DATABASE_URL")
    parser.add_argument("--apply", action="store_true", help="write to the target database")
    return parser.parse_args()


def normalize_target_url(value: str) -> str:
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+asyncpg://", 1)
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+asyncpg://", 1)
    return value


def safe_url(value: str | None) -> str:
    if not value:
        return "<not provided>"
    return make_url(value).render_as_string(hide_password=True)


def parse_datetime(value: Any) -> Any:
    if value is None or isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return value
    return value


def decode_value(column, value: Any) -> Any:
    if value is None:
        return None
    if isinstance(column.type, JSON):
        if isinstance(value, (bytes, bytearray)):
            value = value.decode("utf-8")
        if isinstance(value, str):
            try:
                return json.loads(value)
            except json.JSONDecodeError:
                return value
    if column.type.__class__.__name__ in {"DateTime", "TIMESTAMP"}:
        return parse_datetime(value)
    if column.type.__class__.__name__ == "Boolean":
        return bool(value)
    return value


def read_source(source_path: Path) -> tuple[dict[str, list[dict[str, Any]]], dict[str, int]]:
    if not source_path.is_file():
        raise FileNotFoundError(f"SQLite source does not exist: {source_path}")

    metadata = Base.metadata
    source = sqlite3.connect(source_path)
    source.row_factory = sqlite3.Row
    try:
        available = {
            row[0]
            for row in source.execute("SELECT name FROM sqlite_master WHERE type='table'")
        }
        rows_by_table: dict[str, list[dict[str, Any]]] = {}
        counts: dict[str, int] = {}
        for table_name in TABLE_ORDER:
            if table_name == "slide_progress_quarantine" or table_name not in available:
                continue
            table = metadata.tables[table_name]
            rows = []
            for raw in source.execute(f'SELECT * FROM "{table_name}"'):
                row = {}
                for key in raw.keys():
                    if key in table.c:
                        row[key] = decode_value(table.c[key], raw[key])
                rows.append(row)
            rows_by_table[table_name] = rows
            counts[table_name] = len(rows)
        return rows_by_table, counts
    finally:
        source.close()


def migration_report(rows_by_table: dict[str, list[dict[str, Any]]]) -> dict[str, Any]:
    user_ids = {row.get("id") for row in rows_by_table.get("users", [])}
    slide_ids = {row.get("id") for row in rows_by_table.get("slides", [])}
    slide_progress = rows_by_table.get("slide_progress", [])
    valid = [row for row in slide_progress if row.get("user_id") in user_ids and row.get("slide_id") in slide_ids]
    orphaned = [row for row in slide_progress if row not in valid]

    duplicate_groups: dict[tuple[Any, Any], int] = {}
    for row in rows_by_table.get("enrollments", []):
        key = (row.get("user_id"), row.get("story_id"))
        duplicate_groups[key] = duplicate_groups.get(key, 0) + 1
    for row in rows_by_table.get("step_progress", []):
        key = (row.get("user_id"), row.get("step_id"))
        duplicate_groups[("step",) + key] = duplicate_groups.get(("step",) + key, 0) + 1
    for row in valid:
        key = (row.get("user_id"), row.get("slide_id"))
        duplicate_groups[("slide",) + key] = duplicate_groups.get(("slide",) + key, 0) + 1

    duplicates = {str(key): count for key, count in duplicate_groups.items() if count > 1}
    return {
        "slide_progress_valid": len(valid),
        "slide_progress_quarantine": len(orphaned),
        "duplicates": duplicates,
        "orphan_rows": orphaned,
    }


def print_report(source_path: Path, counts: dict[str, int], report: dict[str, Any], target_url: str | None) -> None:
    print(f"source={source_path}")
    print(f"target={safe_url(target_url)}")
    for table_name in sorted(counts):
        print(f"{table_name}: {counts[table_name]}")
    print(f"slide_progress_valid: {report['slide_progress_valid']}")
    print(f"slide_progress_quarantine: {report['slide_progress_quarantine']}")
    if report["duplicates"]:
        print("duplicate_progress_keys:")
        for key, count in report["duplicates"].items():
            print(f"  {key}: {count}")


def target_engine(url: str):
    connect_args = {"ssl": "require", "statement_cache_size": 0}
    return create_async_engine(url, pool_pre_ping=True, connect_args=connect_args)


def target_table_rows(connection, table_name: str) -> int:
    return int(connection.execute(text(f'SELECT COUNT(*) FROM "{table_name}"')).scalar_one())


async def apply_migration(
    target_url: str,
    rows_by_table: dict[str, list[dict[str, Any]]],
    report: dict[str, Any],
) -> None:
    if not target_url.startswith("postgresql+asyncpg://"):
        raise ValueError("--apply requires a PostgreSQL URL")
    if report["duplicates"]:
        raise RuntimeError("Duplicate progress keys must be resolved before applying the migration")

    engine = target_engine(target_url)
    metadata = Base.metadata
    try:
        async with engine.begin() as connection:
            table_names = await connection.run_sync(lambda sync: set(inspect(sync).get_table_names()))
            missing = [name for name in metadata.tables if name not in table_names]
            if missing:
                raise RuntimeError(
                    "Target schema is incomplete; run 'alembic upgrade head' first: "
                    + ", ".join(missing)
                )

            non_empty = await connection.run_sync(
                lambda sync: {
                    name: target_table_rows(sync, name)
                    for name in rows_by_table
                    if target_table_rows(sync, name) > 0
                }
            )
            if non_empty:
                raise RuntimeError(
                    "Refusing to merge into a non-empty target: "
                    + ", ".join(f"{name}={count}" for name, count in non_empty.items())
                )

            for table_name in TABLE_ORDER:
                if table_name == "slide_progress_quarantine":
                    continue
                rows = rows_by_table.get(table_name, [])
                if table_name == "slide_progress":
                    user_ids = {row.get("id") for row in rows_by_table.get("users", [])}
                    slide_ids = {row.get("id") for row in rows_by_table.get("slides", [])}
                    rows = [
                        row
                        for row in rows
                        if row.get("user_id") in user_ids and row.get("slide_id") in slide_ids
                    ]
                if not rows:
                    continue
                table = metadata.tables[table_name]
                for index in range(0, len(rows), 500):
                    await connection.execute(table.insert(), rows[index : index + 500])

            quarantine = metadata.tables["slide_progress_quarantine"]
            for row in report["orphan_rows"]:
                await connection.execute(
                    quarantine.insert().values(
                        source_id=row.get("id"),
                        user_id=row.get("user_id"),
                        slide_id=row.get("slide_id"),
                        xp_earned=row.get("xp_earned"),
                        completed_at=row.get("completed_at"),
                        reason="missing_user_or_slide",
                        payload=row,
                    )
                )

            await connection.run_sync(reset_postgres_sequences)
    finally:
        await engine.dispose()


def reset_postgres_sequences(connection) -> None:
    for table in Base.metadata.sorted_tables:
        if "id" not in table.c:
            continue
        connection.execute(
            text(
                f"SELECT setval(pg_get_serial_sequence(:table_name, 'id'), "
                f"COALESCE(MAX(id), 1), MAX(id) IS NOT NULL) FROM \"{table.name}\""
            ),
            {"table_name": table.name},
        )


async def main() -> None:
    args = parse_args()
    source_path = args.source if args.source.is_absolute() else REPO_ROOT / args.source
    rows_by_table, counts = read_source(source_path)
    report = migration_report(rows_by_table)
    target_value = args.target_url or os.environ.get("DATABASE_URL")
    target_url = normalize_target_url(target_value) if target_value else None
    print_report(source_path, counts, report, target_url)

    if not args.apply:
        print("dry_run=true; no PostgreSQL data was written")
        return
    if not target_url:
        raise ValueError("--apply requires --target-url or DATABASE_URL")
    await apply_migration(target_url, rows_by_table, report)
    print("migration=applied")


if __name__ == "__main__":
    asyncio.run(main())

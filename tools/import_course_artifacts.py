"""One-time import of generated lesson JSON into published LessonVersions.

This is a migration tool, not part of the authoring loop.  It is dry-run by
default and only mirrors existing stable slide keys, so user progress remains
attached to the same Slide rows.
"""

from __future__ import annotations

import argparse
import asyncio
from datetime import datetime, timezone
import json
from pathlib import Path
import sys

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker


REPO_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(REPO_ROOT / "backend"))

from app.config import settings  # noqa: E402
from app.content_service import (  # noqa: E402
    get_published_version,
    lesson_checksum,
    materialize_published_step,
    parse_lesson_content,
)
from app.lesson_contract import document_payload  # noqa: E402
from app.models import Step  # noqa: E402
from app.sandbox_models import LessonVersion  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--source",
        type=Path,
        default=REPO_ROOT / "data" / "courses",
        help="Directory containing generated course JSON artifacts",
    )
    parser.add_argument("--course", help="Only import one course slug")
    parser.add_argument("--apply", action="store_true", help="Write imported versions")
    return parser.parse_args()


def step_files(source: Path, course: str | None) -> list[Path]:
    root = source / course if course else source
    pattern = "chapters/*/steps/*.json" if course else "*/chapters/*/steps/*.json"
    return sorted(
        path
        for path in root.glob(pattern)
        if path.is_file()
    )


async def run(args: argparse.Namespace) -> None:
    files = step_files(args.source, args.course)
    if not files:
        raise SystemExit(f"No lesson artifacts found under {args.source}")

    engine = create_async_engine(settings.database_url, echo=False)
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    imported = 0
    skipped = 0
    errors: list[str] = []

    async with async_session() as db:
        for path in files:
            try:
                content = json.loads(path.read_text(encoding="utf-8"))
                document = parse_lesson_content(content)
                result = await db.execute(select(Step).where(Step.content_key == document.content_key))
                step = result.scalar_one_or_none()
                if step is None:
                    raise ValueError(f"step content_key not found in database: {document.content_key}")

                checksum = lesson_checksum(document)
                published = await get_published_version(db, step.id)
                if published is not None and published.checksum == checksum:
                    skipped += 1
                    continue
                if published is not None:
                    raise ValueError(
                        f"step already has a different published version: {document.content_key}"
                    )

                version = LessonVersion(
                    step_id=step.id,
                    manifest_id=document.content_key,
                    version="1",
                    checksum=checksum,
                    content=document_payload(document),
                    status="published",
                    published_at=datetime.now(timezone.utc).replace(tzinfo=None),
                )
                db.add(version)
                await db.flush()
                await materialize_published_step(db, step, document, version.id)
                imported += 1
                print(f"{'IMPORT' if args.apply else 'PLAN'} {path.relative_to(REPO_ROOT)}")
            except Exception as error:
                errors.append(f"{path}: {error}")

        if errors:
            await db.rollback()
            for error in errors:
                print(f"ERROR {error}")
            raise SystemExit(f"Import stopped with {len(errors)} error(s)")

        if args.apply:
            await db.commit()
        else:
            await db.rollback()

    await engine.dispose()
    print(f"imported={imported} skipped={skipped} apply={args.apply}")
    if not args.apply:
        print("dry-run only; no database rows were written")


if __name__ == "__main__":
    asyncio.run(run(parse_args()))

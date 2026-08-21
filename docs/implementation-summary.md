# Implementation Summary

## Current architecture

Calculus now treats `frontend/src/content/courses` as the canonical course
source. The MDX compiler produces deterministic JSON artifacts in
`data/courses`; `backend/sync_data.py` consumes only those artifacts. Course
content is no longer built or seeded from the FastAPI lifespan.

The runtime database contract is:

| Environment | Configuration | Database |
| --- | --- | --- |
| Local | `APP_ENV=local` | `backend/calculus.db` |
| Production | `APP_ENV=production`, `DEBUG=false`, PostgreSQL `DATABASE_URL` | PostgreSQL |

`backend/alembic` owns schema changes. The first baseline creates the complete
SQLAlchemy model schema, adds `content_key`/`is_active`, and adds unique keys
for enrollment, step progress, and slide progress. The `/ready` endpoint
executes `SELECT 1` and returns `503 database_unavailable` when the configured
database is not ready.

## Content pipeline

The seven `menh-de` MDX steps compile with slide counts:

`BT`text
9 / 10 / 12 / 11 / 11 / 12 / 15
`BT`

Each slide has a stable ID (`s01`, `s02`, ...), and each generated slide has a
stable `content_key`. Rebuilding the same source preserves the keys. Sync
updates existing rows by key, deactivates removed slides, and preserves
progress rows instead of deleting/reinserting slides.

The compiler is AST-only. It allowlists `Slide`, `Callout`, `Sandbox`,
`Quiz`, and declarative JSON blocks. JavaScript imports, expressions, dynamic
attributes, and executable lesson payloads fail validation with a source
location. `npm run validate:course` checks MDX compilation, sandbox manifests,
assessment pool/reference integrity, and source/generated parity.

## Progress and frontend runtime hardening

`Step.jsx` now distinguishes loading, not-enrolled, not-found, unauthorized,
API, and content-validation states. Requests use `AbortController` and request
identity checks so an old route response cannot overwrite a newer Step.

Slide progress is marked complete only after the POST succeeds. In-flight
requests are deduplicated, failed awards can be retried, and navigation waits
for completion. Step completion remains on the completion screen when the POST
fails and can be retried. Quit navigation is immediate and logs a failed quit
request without breaking the page.

Math, MDX/interaction blocks, Studio previews, and the application root have
error boundaries. Broken images show a placeholder, clipboard failures stay
handled, and legacy blocks render a readable preview-only fallback. The API
client accepts the current bare-array slide response and the legacy envelope
during migration, while preserving HTTP status and endpoint details for error
UI.

`InteractionSlide` accepts both direct props and legacy `content` payloads.
`claimQuest` is the single quest reward contract used by Home and QuestShop.

## Migration and rollout

The authoritative local source is `backend/calculus.db`. The root-level
`calculus.db` is not merged because it contains no valid user/progress dataset.
`tools/migrate_sqlite_to_postgres.py` is dry-run by default, refuses a non-empty
target, preserves IDs, resets PostgreSQL sequences, and archives unmatched
legacy slide progress in `slide_progress_quarantine`. The current source
preflight reports 50 valid slide-progress rows and 17 quarantine rows.

Recommended rollout:

1. Back up `backend/calculus.db`.
2. Run `alembic upgrade head` on staging PostgreSQL.
3. Run the migration tool without `--apply` and compare row counts.
4. Apply the migration, then run course sync and browser smoke tests.
5. Set production `APP_ENV`, `DEBUG`, and `DATABASE_URL`.
6. Retain the SQLite backup for rollback.

## Verification

The current frontend verification gates are:

- `npm run test:run`: 9 files, 32 tests passed.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed on Linux after adding platform-specific Rollup
  optional dependencies.
- `npm run validate:course`: passed with zero errors and zero warnings.
- backend `unittest`: 8 tests passed.
- SQLite Alembic upgrade preserved users, enrollment, step progress, and valid
  slide progress counts.

Warnings that remain non-blocking are the existing Browserslist freshness
notice, KaTeX font-character warnings, and the large frontend bundle. They do
not prevent rendering or deployment.

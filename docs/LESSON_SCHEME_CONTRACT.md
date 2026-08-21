# Lesson Scheme Contract

## Canonical source and delivery

Course authors edit MDX under `frontend/src/content/courses`. The runtime
delivery path is:

`BT`text
MDX
  -> tools/mdx_course_compiler.ts
  -> data/courses/<course>/.../*.json
  -> backend/sync_data.py
  -> PostgreSQL (production) or backend/calculus.db (local)
  -> /api/v1/steps/{id}/slides
`BT`

Generated JSON is an artifact. It is never hand-edited and the backend never
compiles MDX or seeds course content during application startup. Schema changes
are applied by Alembic before `sync_data.py` is run.

## Allowed MDX

The compiler uses `remark-mdx` and accepts only declarative content:

- top-level `<Slide id="..." title="...">` elements;
- `<Callout>` and `<Sandbox>` inside a slide;
- `<Quiz id="b4_ref_mc_01" />` references;
- JSON code fences with an allowlisted `block_type` such as
  `assessment_pool`, `assessment_ref`, `math`, `text`, `callout`, `image`,
  `reveal`, `fill_blank`, `ordering`, `interaction`, `video`, or `code`;
- ordinary Markdown text, lists, blockquotes, fenced code, and math.

Imports, JSX expressions, dynamic attributes, spread attributes, arbitrary JSX
components, and executable lesson payloads are rejected with a source
location. Sandbox manifests remain JSON data and are validated by the shared
registry/manifest validator.

Every slide requires a stable ID:

`BT`mdx
<Slide id="s04" title="Phản ví dụ">
  Nội dung slide.
</Slide>
`BT`

The generated step uses a stable `content_key`:

`menh-de/menh-de/04-menh-de-keo-theo/s04`

The sync process matches steps and slides by `content_key`, falls back to
legacy order only for an existing row without a key, marks removed slides
inactive, and does not delete/reinsert rows. This preserves progress IDs.

## Assessment pools and delivery references

`assessment_pool` is authoring-only data. It contains the complete pool and
stable item IDs. `<Quiz>` compiles to an `assessment_ref` and only that
referenced item is materialized into a learner-facing `quiz` block:

`BT`json
{
  "id": "b5_ref_tf_01",
  "block_type": "assessment_ref",
  "content": {
    "poolId": "menh-de.05.tf",
    "itemId": "tf_01",
    "phase": "independent_check"
  }
}
`BT`

At most one assessment reference is delivered on a slide. References must
point to an existing pool/item and use a declared phase. The frontend validates
and materializes references at load time; invalid content produces a
content-validation error with Retry instead of a blank page.

## Validation commands

Run these commands from the repository root:

`BT`bash
cd frontend
npm run build:course
npm run validate:course
npm run test:run
npx tsc --noEmit
npm run build
`BT`

`npm run validate:course` compiles MDX in memory, validates sandbox manifests,
checks assessment pool/reference integrity, and compares source output with
`data/courses`. `validate_all.py` remains a legacy JSON validator for unrelated
data and should not be used as the MDX build step.

## Compatibility blocks

`drag_drop`, `interactive_graph`, `fill_blank`, `ordering`, and other legacy
blocks must render readable data through the safe preview-only fallback. They
must not crash the learner page and are not treated as graded interactions until
a new contract is explicitly added.

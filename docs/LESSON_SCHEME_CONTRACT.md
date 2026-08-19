# Lesson Scheme Contract

The lesson scheme separates authoring coverage from one learner delivery path.
It is intentionally declarative: no lesson JSON may contain executable model
instructions, and the runtime may only materialize allowlisted references.

## Canonical shape

Each lesson that uses the scheme has a top-level `learning_scheme`:

```json
{
  "version": "1.0",
  "authoring_pool": {
    "theory": {"min": 1, "max": 2},
    "sandbox": {"min": 1, "max": 2},
    "multiple_choice": 6,
    "true_false_group": 2,
    "short_answer": 3,
    "media": {"min": 0, "max": 2}
  },
  "delivery": {
    "guided_practice": {"multiple_choice": 2},
    "independent_check": {"multiple_choice": 1, "true_false_group": 1},
    "transfer": {"short_answer": 1}
  },
  "interaction_policy": {
    "required_evidence": [
      "state_change",
      "derived_evidence",
      "pass_condition",
      "hint_transition"
    ],
    "drag_only": false
  },
  "delivery_layout": "one_assessment_ref_per_slide"
}
```

`assessment_pool` stores the complete authoring pool. It is never rendered.
Each item must have its own `id`, `quiz_type`, question, answer data, source
mapping and explanation. `assessment_ref` selects one item for a named delivery
phase:

```json
{
  "id": "b5_ref_tf_01",
  "block_type": "assessment_ref",
  "content": {
    "poolId": "lesson.true_false_group",
    "itemId": "tf_01",
    "phase": "independent_check"
  }
}
```

The frontend materializes only refs into ordinary `quiz` blocks. This keeps the
rendering path shared by multiple choice, four-statement true/false and short
answer while leaving unselected pool items available for later review routing.
At most one delivered ref is placed on a learner-facing slide. A true/false
group remains one exercise because its four statements are the exercise's
single reasoning unit; separate MC/short-answer items never share a slide.

## Validation and build order

Both raw and generated artifacts must pass:

```text
validate_all.py
npm run validate:course
```

The validators check pool counts, unique pool/item IDs, item shape, ref targets,
delivery counts, interaction policy and raw/generated parity for sandbox
manifests. Generated courses are rebuilt only through
`tools/build_course_from_chapters.py`; they must not be hand-edited.

The current menh-de baseline is a target, not a fixed screen count: 1–2 theory
blocks, 1–2 sandboxes, 6 MC, 2 true/false groups of four statements, 3 short
answers and up to 2 encouragement media blocks. Delivery can vary by lesson as
long as the declared phases and source coverage remain valid.

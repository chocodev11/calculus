---
name: math-course-generator
description: Generate or revise Vietnamese mathematics courses and lesson steps for the calculus app as validated JSON in data/raw_courses, including Math Sandbox manifests for Toán 10 logic, sets, and trigonometry. Use when creating a course, chapter, lesson batch, lesson plan, Sandbox interaction, or migrating legacy generator output; validate and rebuild artifacts before handoff.
---

# Math Course Generator

Generate curriculum content as repository-native JSON through the agent workflow. Do not call an external LLM API or maintain a separate generator runtime.

## Mission and source of truth

- **Primary Source of Truth**: Treat `frontend/src/content/courses/` (`.mdx` + `meta.json`) as the primary Content-as-Code format with instantaneous Vite HMR (<50ms).
- **Authoring Studio**: Use `/studio` or `/studio/:courseSlug/:stepId` in the browser for live, isolated authoring preview with full math typesetting, quizzes, and canvas sandboxes.
- **Legacy Compatibility**: `data/raw_courses` can still be migrated to MDX at any time via `python tools/migrate_json_to_mdx.py`.
- Keep all authored text in Vietnamese and all files UTF-8 without BOM.

## Workflow

1. Translate the request into course, chapter, step IDs, learning outcomes, prerequisites, level, misconceptions, representation, and expected evidence.
2. Author or update the `.mdx` lesson file in `frontend/src/content/courses/<course-slug>/<step-id>.mdx`.
3. Use clean MDX components:
   - `<Slide title="...">`: Wraps slide content.
   - `<Callout variant="theorem|definition|tip|warning|example" title="...">`: Highlights key concepts.
   - `<Quiz question="..." explanation="..."> <Option value="..." correct>...</Option> </Quiz>`: Interactive quizzes.
   - `<Sandbox archetype="..." ... />`: Live interactive math sandboxes.
   - Standard $\LaTeX$ with `$ ... $` and `$$ ... $$` directly without double-escaping.
4. Preview immediately in browser via Vite HMR at `http://localhost:3000/studio`.
5. Run the frontend build test:
   ```bash
   npm --prefix frontend run build
   ```

## Lesson authoring rules

- Keep each step to 3–5 slides unless the subject requires a shorter sequence.
- Prefer: concept → worked example → interaction or representation → quiz/transfer task.
- Use at most one interaction block per step.
- Make every block ID unique within the step and every step ID stable and kebab-case.
- Use mathematically valid examples at the declared grade level. State domains, units, endpoint conventions, and assumptions explicitly.
- Include a misconception-aware explanation, not only the correct option.
- For advanced application, require a strategy, multiple constraints or cases, a counterexample/invariant, and a structured conclusion. Do not make it merely a longer numeric exercise.
- Keep `outcomeIds`, prerequisites, level, accessibility, goals, assessment, and solution contract present for Sandbox lessons.
- Do not place executable JavaScript, Python, `eval`, `new Function`, or answer-generation logic in lesson payloads.

## Batch and plan requests

- For a plan, first inspect the catalog and dependency graph, then present or save a concrete ordered list of steps with outcomes, prerequisites, misconceptions, representation, level, and assessment evidence.
- For a batch, create all requested raw step files in one controlled patch, validate the complete source tree, then rebuild the course once.
- Do not recreate the removed `generator/` directory, `config.py`, OpenRouter client, prompt-file switch, or `plan.json` convention unless the user explicitly requests a compatibility artifact.

## References

Read only the reference needed for the task:

- [lesson-schema.md](references/lesson-schema.md) for raw course and slide JSON.
- [legacy-interactions.md](references/legacy-interactions.md) when extending an existing calculus lesson that still uses A/B/C/E.
- [sandbox-contract.md](references/sandbox-contract.md) for manifest fields, plugin recipes, safe expressions, and interaction authoring.

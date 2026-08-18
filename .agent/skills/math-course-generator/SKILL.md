---
name: math-course-generator
description: Generate or revise Vietnamese mathematics courses and lesson steps for the calculus app as validated JSON in data/raw_courses, including Math Sandbox manifests for Toán 10 logic, sets, and trigonometry. Use when creating a course, chapter, lesson batch, lesson plan, Sandbox interaction, or migrating legacy generator output; validate and rebuild artifacts before handoff.
---

# Math Course Generator

Generate curriculum content as repository-native JSON through the agent workflow. Do not call an external LLM API or maintain a separate generator runtime.

## Mission and source of truth

- Treat `data/raw_courses` as the editable source of truth.
- Treat `data/courses` as generated artifacts only.
- Inspect the existing course, neighboring lessons, `data/raw_courses/toan10_sandbox_catalog.json`, `validate_all.py`, and the relevant frontend plugin before authoring.
- Keep all authored text in Vietnamese and all files UTF-8 without BOM.

## Workflow

1. Translate the request into course, chapter, step IDs, learning outcomes, prerequisites, level, misconceptions, representation, and expected evidence.
2. Choose the representation:
   - Use `math.sandbox` for new Toán 10 content in logic, set, or trigonometry.
   - Use a legacy interaction only when extending an existing legacy course or when the user explicitly requests it. Do not introduce another interaction engine.
3. Author or update `course.json`, `chapter.json`, and one `steps/*.json` file per lesson. Use `apply_patch` for edits.
4. Run the validation gate before calling the lesson complete:

   ```bash
   python3 validate_all.py
   ```

5. Rebuild the encrypted course artifact when source files changed:

   ```bash
   python3 tools/build_course_from_chapters.py data/raw_courses/<course-slug>
   ```

   Never hand-edit the resulting `data/courses/*.json` file.
6. If runtime or Sandbox code changed, run the focused frontend tests, TypeScript check, and production build. Report warnings separately from failures.
7. Report source files, generated artifact, validation evidence, and any pre-existing warning or unverified runtime boundary.

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

# Math Sandbox authoring contract

Use this reference for new Toán 10 lessons in `logic`, `set`, and `trigonometry`. The runtime source is `frontend/src/sandbox`; the raw lesson embeds a manifest under an interaction block:

```json
{
  "id": "sandbox-block",
  "type": "interaction",
  "content": {
    "interactionType": "sandbox",
    "lesson": { "kind": "math.sandbox" }
  }
}
```

## Required manifest envelope

Every manifest must include:

```json
{
  "schemaVersion": "1.0",
  "kind": "math.sandbox",
  "id": "stable-id",
  "version": "1.0.0",
  "domainId": "logic",
  "archetypeId": "logic.compound_truth_table",
  "level": "recognition|understanding|application|advanced_application",
  "recipe": "logic.truth_table",
  "outcomeIds": ["M10-..."],
  "prerequisites": [],
  "misconceptions": [],
  "scene": { "space": "truth_table" },
  "controls": [],
  "goals": [],
  "solutionGraph": { "steps": [], "terminalStepIds": [] },
  "assessment": [],
  "accessibility": { "keyboardControls": true, "textAlternative": "...", "highContrast": true },
  "analytics": [],
  "config": {}
}
```

`outcomeIds` and `goals` cannot be empty. Every control needs a stable ID, label, supported type, and bounded numeric range where applicable. Keep the text alternative meaningful enough to replace the SVG for a screen-reader user.

## Available recipes

Use the exact recipe ID registered in `frontend/src/sandbox/index.ts`:

- Logic: `logic.truth_table`, `logic.proposition`, `logic.quantifier`, `logic.implication`, `logic.necessary_sufficient`, `logic.parameter_truth`.
- Set: `set.operator`, `set.builder`, `set.venn`, `set.number_line`.
- Trigonometry: `trigonometry.unit_circle`, `trigonometry.triangle_solver`, `trigonometry.law_of_sines`, `trigonometry.law_of_cosines`, `trigonometry.measurement_model`.

The aliases share plugin implementations but preserve the lesson's semantic recipe. Match `domainId`, `scene.space`, and `config.mode` to the plugin.

## Logic patterns

- `truth_table`: set `config.variables`, `config.expression`, and `config.initialValues`; use safe boolean expressions such as `p && !q`.
- `proposition_classifier`: use `config.mode` and `config.activity.items`; each item declares `label`, `controlId`, and `expectedType` (`proposition`, `open_sentence`, or `not_proposition`).
- `quantifier_negation`: each activity item declares expected verdict, negation, evidence, and optional witness. Preserve the original variable domain when negating.
- `implication`: declare `pExpression`, `qExpression`, a finite `domainValues`, both directions, and a counterexample for each false direction. Add `expectedContrapositive` and a control when teaching phản đảo.
- `parameter_implication`: require a parameter control, strategy control, `expectedParameter`, and a solution graph showing the general factor/case argument. A few sampled values never prove a universal claim.

## Safe expression rules

Expressions are parsed by the allowlisted AST evaluator. Use only documented arithmetic, comparison, boolean, set, interval, and math functions. Current logic examples may use `divisible(x, n)`, `%`, `&&`, `||`, and `!`.

Never put `eval`, `new Function`, member access, globals, statements, arbitrary function names, unbounded input, `NaN`, infinity, or division outside its domain in a manifest. Do not write answer computation as a JavaScript string.

## Interaction and assessment quality

- State must contain only learner-controlled primitive values. Geometry, truth rows, roots, counterexamples, and derived metrics belong in recomputation.
- Make the visual isomorphic to the concept: truth tables show rows, Venn scenes show regions, number lines show endpoints, unit circles show angle/value, and triangle scenes show invariant checks.
- For recognition, use one focused decision. For understanding, require an explanation or representation change. For application, require a finite-domain check or calculation. For advanced application, require strategy selection, case coverage, a valid-domain counterexample or invariant, and ordered reasoning.
- Keep the manifest assessment declarative. Include a normal quiz block in the step when the current course completion flow needs it; do not expose a private server answer key in a public Sandbox payload.


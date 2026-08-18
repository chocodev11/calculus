# Legacy interaction contract

Use these only for existing lessons that already use the legacy interaction renderer. New Toán 10 content must use `math.sandbox`.

All legacy interactions own exactly one primitive. Recompute derived geometry and metrics from that primitive; do not store geometry in lesson state or let rendering mutate state. Expressions must match the existing validator and neighboring lessons.

## Type A — resolution

Use for secant-to-tangent or Riemann approximation convergence.

```json
{
  "interactionType": "A",
  "parameterSpec": { "resolutionLevels": [2, 4, 8, 16, 32, 64] },
  "systemSpec": {
    "function": "x*x",
    "derivative": "2*x",
    "domain": [-2, 2],
    "range": [-1, 5],
    "anchor": 1
  },
  "reflectionSpec": { "triggers": [{ "conditionSpec": { "field": "resolution", "op": ">=", "value": 32 }, "message": "..." }] }
}
```

For Riemann sums set `mode` to `riemann`, provide `systemSpec.integral`, `systemSpec.sumType` (`left`, `right`, or `midpoint`), and the integration domain. The derivative and anchor belong only to secant mode.

## Type B — semantic parameter

Use a bounded slider when the parameter changes the meaning or shape of a function. Provide `meta.parameterLabel`, `parameter` with `min`, `max`, and `initial`, and `system.view`. Use `system.model` for one curve or `system.curves` for a named multi-curve comparison. Keep at most two visible curves. Optional `system.shading` supports accumulation/area lessons; `to: "p"` ties the upper bound to the slider.

```json
{
  "interactionType": "B",
  "meta": { "parameterLabel": "Tham số p" },
  "parameter": { "min": -2, "max": 2, "initial": 0 },
  "system": {
    "resolution": 200,
    "view": { "xMin": -5, "xMax": 5, "yMin": -5, "yMax": 5 },
    "model": "x*x+p"
  },
  "reflections": []
}
```

## Type C — temporal playback

Use for a deterministic process over time. The only primitive is `t`; derive every position and metric from the initial state and evolution expression. Provide `parameterSpec.time`, `systemSpec.initialState`, `systemSpec.evolutionRule`, and `representationSpec.viewBox`.

```json
{
  "interactionType": "C",
  "parameterSpec": { "time": { "start": 0, "end": 5, "step": 0.02 } },
  "systemSpec": {
    "initialState": { "x": 0, "y": 0 },
    "evolutionRule": { "type": "expression", "expression": "[t, t*t]", "variables": ["t"] }
  },
  "representationSpec": { "encoding": "motion", "viewBox": { "xMin": -1, "xMax": 6, "yMin": -1, "yMax": 26 } }
}
```

## Type E — structural decomposition

Use for a structural slider that changes a partition or emphasis while preserving a conserved total. Provide `parameterSpec.structure`, `systemSpec.baseValues`, a declarative `conservedObject`, and a `representationSpec` with `geometryBase` and `splitSpec` (`domainSplit`, `signPartition`, or `rectangleContribution`).

Never use Type E to smuggle in a semantic parameter, time, or resolution control. Never hardcode the answer in the renderer.

## Legacy quality rules

- The interaction must make the concept visible, not merely animate an unrelated curve.
- Use 2D geometry, one primitive control, and fixed sampling resolution unless the primitive is resolution.
- Keep lesson text and quiz explanations in Vietnamese.
- Run `python3 validate_all.py`; the validator is authoritative for compatibility.


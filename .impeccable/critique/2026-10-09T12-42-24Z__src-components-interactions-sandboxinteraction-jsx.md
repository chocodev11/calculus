---
target: sandbox khoá Mệnh đề + kiểu ô trắc nghiệm
total_score: 21
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-10-09T12-42-24Z
slug: src-components-interactions-sandboxinteraction-jsx
---
Method: dual-agent (A: design review, B: detector + browser) + independent technical audit (C).

Verdict: not solid enough to ship. Lesson 1 (new manifest) near-ready; frontend + currently published DB content teaches wrong; event pipeline can redirect learners to /login and lose data; lessons 2-7 not on lesson 1's contract and pre-solve for the learner.

## Heuristics (21/40, Acceptable; lesson 1 alone ~30/40)
1 Visibility 2 - lesson 7 never marks wrong; completion banner below fold on mobile (L2, L4, L7)
2 Real world 3 - grading/Euler/quadrilaterals close to class; jargon "Nhân chứng", "Soi vùng"; "⋮" at 15px reads as ":"
3 Control 2 - undo in L1 removes the previous item's grade while viewing the next; trying more after completion drops completion
4 Consistency 1 - three answer-commit patterns; case dots top (L1) vs bottom (L3/L6); Đ/S ink (L1) vs green/red (L2-7); duplicate titles L3=L6, L4=L5
5 Error prevention 2 - input hint "vd. 2" while 2 not in D; "Giữ x" always enabled; footer "Tiếp tục" skips sandbox
6 Recognition 3 - legends and P/Q chips; unlabeled measure row in L3; icon-only eye button
7 Flexibility 2 - multiple input paths; L3/L6 grid cells not keyboard reachable
8 Minimalism 2 - L1 clean; L2-7 stack stage + caption + cards + chips
9 Error recovery 2 - L1 misconception nudges; L4-5 first mistake reveals answer; L7 no error state
10 Help 2 - 12px hint button at page end, below fold on mobile; L4 hint states "P ⊂ Q"

Cognitive load: 5/8 failed (high), from L2-7; decision points >4 options: L4 counterexample (7 tokens + chip), L6 (25 cells + 3 chips), L7 (7 chips + handle).

## Specificity
Only L1 authored for TiaMath (graded paper, ink loop, An/Khoa disagreement). L2-7 generic lab template; chapter reads as two products.
Detector: CLI 11 findings (+1 suppressed): legacy InteractionTypeA/B/C/E side-tab (not rendered anywhere), dropdown/segmented false positives, PropositionLab ai-color false positive; CSS: brand font, dead .math-grid-dense. Browser (headless): real = contrast only: white on sky-600 4.1:1 (Q badge), white on rose-500 3.7:1 (m chips, incorrect choice-key), white on emerald-600 3.8:1 (TF badge), 10px landing legend; self-measured white on emerald-500 2.5:1 (correct choice-key, completion banner, m chips). Occlusion/layout-transition/nested-cards/paper shadow/stripes = false positive or sanctioned.

## Strengths
1. L1 misconception nudges teach "gradable, even S, is a proposition" without reading the answer.
2. .choice-option unified across quiz, landing and sandbox chips.
3. Core engine verified: gesture undo, 14 manifests load, sample verdicts match, artifacts pass backend contract, 44/44 tests.

## Priority issues
[P0] New frontend + published DB content teaches wrong: L1 accepts "15 là số nguyên tố" = Đ (no truthValue); L3-7 `initial` pre-fills wrong answers, L4/5 open with red ✗ + solution, L3/6 "Kiểm tra" enabled before any choice; L5 tokens 0/1/2. Update paths broken: importer refuses, rollback 422 (published content fails current contract), lesson-validate scans 0 files on Windows (validate_lesson_json.ts:122 '/steps/'). Fix: publish 7 artifacts via draft->publish with the deploy; ignore `initial` on graded controls; missing truthValue = validation error; fix validator path + validate sandbox manifests. (/impeccable harden)
[P1] Event pipeline: SandboxInteraction.jsx:49 api.post without redirectOnUnauthorized:false -> guests/expired tokens redirected to /login ~1.5s after opening; occurredAt tz-aware into naive DateTime -> likely 500 on Postgres (inference), queue already spliced -> data lost. Fix: disable redirect, normalize UTC naive, requeue on failure, flush on pagehide. (/impeccable harden)
[P1] L2-7 not on L1 contract and pre-solve: 3 commit patterns, duplicate titles, no prompt, green/red double meaning; L3/6 pre-colored + "Mọi mẫu đều đúng…"; correct options long with reasons; L7 complete only at m=0 though figure says true for all m≥0. Fix: L1 contract chapter-wide, predict before reveal, parallel options without reasons, Đ/S ink for truth. (/impeccable shape, distill)
[P1] Mobile fold + fragile errors: L3 1119px, L6 1159px vs 686px; footer "Tiếp tục" in thumb zone skips sandbox; >64 chars in L2 input replaces whole lab with error; runtime pushes history/event before recompute (runtime.ts:94-97). Fix: sticky action bar or lab-driven footer; transactional dispatch; maxLength; latch completion. (/impeccable adapt, harden)
[P2] Contrast + keyboard: white on emerald-500 2.5:1 (index.css:233, banner); focus ring indigo-100 invisible; L3/6 cells unfocusable; role=button inside svg role=img; radiogroups without arrow keys. Fix: emerald-700/rose-600/sky-700, ring indigo-600, tabIndex + labels. (/impeccable audit, polish)

## Persona red flags
First-timer: L2 has no prompt; tokens 0, 1/3, 1 look decorative; "Nhân chứng" and icon-only eye unclear; duplicate titles.
One-handed mobile: "Tiếp tục" in thumb zone skips sandbox; L3/6 questions below fold; undo/reset adjacent, no confirm.
Keyboard/screen reader: invisible focus on chips; L3/6 samples unreachable; focus lost after grading; three role=status regions in L4.
Grade-10 student on mid-range Android: reads "a ⋮ 6" as division; "nghiệm x = 2 và x = 2" should be double root; L6 insight says "Hàng x = 1" while grid lights a column.

## Minor observations
Text on L1 paper not on ruled lines; identical completion banner for 7 lessons; "Pm" vs "Pₘ"; "-" vs "−"; L1 assessment prompt says 4 sentences (now 5); tsconfig covers src/sandbox only; no UI tests; dead code (set/trig labs+plugins, TruthTableLab, renderModel/getConstraints, TactileSelect, SandboxManifestContract, .math-grid-dense, InteractionType A/B/C/E); gray-on-color "*" ignore for LogicExperiments.jsx too broad; no completion event, manifest.version still "1".

## Questions
1. When the stage pre-colors the answer (L3, L6, L7), what does the learner still decide?
2. If "Tiếp tục" skips the sandbox at no cost, what makes finishing the lab worth it?
3. Extend the "teacher grading" metaphor across the chapter instead of six lab panels?

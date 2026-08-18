# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

High school and undergraduate STEM students, self-taught calculus enthusiasts, and exam preppers (AP Calculus, university entrance, Vietnamese high school national exam) who need deep geometric intuition and consistent daily study habits rather than rote formula memorization.

## Product Purpose

Transform abstract, intimidating calculus (Limits, Derivatives, Integrals, Optimization) into intuitive, hands-on, and deeply engaging learning experiences. The platform combines the interactive discovery and visual proofs of Brilliant.org with the habit-forming gamification, tactile micro-interactions, and bite-sized progression of Duolingo.

## Positioning

Unlike static video lectures (Khan Academy, YouTube) or dry textbook problem sets, Calculus makes mathematical intuition tactile: every derivative is a live secant line you physically drag to the limit, every chain rule is a time-stepped geometric gear, and every step rewards daily momentum with XP, streaks, quests, and visual mastery badges.

## Operating Context

Modern desktop and mobile web browsers. Students interact via touch and mouse drag on interactive coordinate canvases, scrub continuous parameter sliders, solve multiple-choice/input quizzes with instant mathematical feedback, and track long-term learning consistency across daily and weekly sessions.

## Capabilities and Constraints

- **Content Hierarchy**: Categories & Learning Paths → Courses (Stories) → Chapters → Steps (Lessons) → Slides → Blocks (Text, Math LaTeX via KaTeX, Quizzes with explanations, Images, Videos, and Interactive Engines).
- **Interactive Math Engines**: 4 core HTML5 Canvas visualizers (Type A: Secant/tangent convergence, Type B: Parameter-driven multi-curve exploration, Type C: Time-evolution dynamics, Type E: Conserved geometric area partition).
- **Gamification Engine**: XP leveling system, daily/weekly streak tracking, hearts/health management, quest shop with consumable inventory (XP boosts, streak freezes, hint tokens), 17 achievements, and dynamic leaderboards.
- **Bilingual / Localization**: Vietnamese and English UI string localization via `locale.js`.
- **Backend & Auth**: FastAPI async backend with SQLite and JWT authentication.

## Brand Commitments

- **Name**: Calculus (Calculus.app)
- **Aesthetic Direction**: "Calculus Kinetic" (Academic Tactile) — an authentic synthesis of academic mathematical precision and playful tactile gamification. Replaces generic gradient noise and disparate styling with a dedicated mathematical design system (Euler Indigo, Tangent Cyan, Kinetic Amber, Vector Emerald) and 2.5D tactile interaction physics.

## Evidence on Hand

- Complete course content in `data/courses/` (`dao-ham` 3 chapters & 9 lessons, `gioi-han.json`, `tich-phan.json`).
- 4 production-tested interactive engine prototypes in `data/interaction_data/` and `frontend/src/components/interactions/`.
- 17 structured achievements in `data/achievements.json`.
- Working FastAPI backend with database sync in `backend/`.

## Product Principles

1. **Intuition Before Formalism**: Lead every concept with interactive geometric manipulatives before showing rigorous mathematical formulas.
2. **Tactile Delight**: Every button, slider, and quiz card must provide instant, satisfying 2.5D physical feedback.
3. **Pristine Mathematical Typography**: LaTeX equations (KaTeX) and coordinate HUDs must have flawless contrast, legible sizing, and tabular alignment.
4. **Frictionless Scaffolding**: Keep cognitive load minimal through clear step-by-step slide progression, informative error explanations, and non-punitive retry loops.
5. **Universal Responsiveness**: Dynamic math canvases and interactive controls must scale gracefully across phone, tablet, and desktop viewports.

## Accessibility & Inclusion

- WCAG AA color contrast compliance for text, math symbols, and interactive canvas curves.
- Visible focus rings for keyboard navigation.
- High-contrast states for color-blind learners (clear geometric glyphs alongside color cues for correct/incorrect quiz answers).

# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Học sinh Việt Nam lớp 10–12, giáo viên và người tự học cần hiểu bản chất Toán học theo chương trình GDPT 2018 thay vì học thuộc công thức.

## Product Purpose

Biến các khái niệm Toán học trừu tượng thành trải nghiệm trực quan, có tương tác và có lộ trình. TiaMath kết hợp khám phá bằng mô phỏng, bài học ngắn, phản hồi tức thì và tiến bộ được ghi nhận.

## Positioning

TiaMath giúp người học chuyển qua lại giữa hình ảnh, ký hiệu và bài tập: kéo thả mô phỏng, kiểm tra giả thuyết, đọc lời giải và luyện tập theo chủ điểm. Mỗi bước học có thể đóng góp vào XP, streak, nhiệm vụ và tiến độ mastery.

## Operating Context

Modern desktop and mobile web browsers. Students interact via touch and mouse drag on interactive coordinate canvases, scrub continuous parameter sliders, solve multiple-choice/input quizzes with instant mathematical feedback, and track long-term learning consistency across daily and weekly sessions.

## Capabilities and Constraints

- **Content Hierarchy**: Categories & Learning Paths → Courses (Stories) → Chapters → Steps (Lessons) → Slides → Blocks (Text, Math LaTeX via KaTeX, Quizzes with explanations, Images, Videos, and Interactive Engines).
- **Interactive Math Engines**: 4 core HTML5 Canvas visualizers (Type A: Secant/tangent convergence, Type B: Parameter-driven multi-curve exploration, Type C: Time-evolution dynamics, Type E: Conserved geometric area partition).
- **Gamification Engine**: XP leveling system, daily/weekly streak tracking, hearts/health management, quest shop with consumable inventory (XP boosts, streak freezes, hint tokens), 17 achievements, and dynamic leaderboards.
- **Bilingual / Localization**: Vietnamese and English UI string localization via `locale.js`.
- **Backend & Auth**: FastAPI async backend with SQLite and JWT authentication.

## Brand Commitments

- **Name**: TiaMath
- **Positioning**: Nền tảng học Toán hiểu bản chất cho Lớp 10–12 theo GDPT 2018.
- **Aesthetic Direction**: "TiaMath Kinetic" (Academic Tactile) — mathematical precision combined with restrained tactile interaction. The system uses Euler Indigo, Tangent Cyan, Kinetic Amber, Vector Emerald and 2.5D interaction physics.

## Evidence on Hand

- A published Toán 10 course artifact in `data/courses/` covering Mệnh đề và Logic.
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

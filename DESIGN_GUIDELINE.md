# Calculus App — Design System Guideline

> **Goal**: One coherent visual language across all pages.
> Inspired by Duolingo (flat, colorful, game-like) + Brilliant (clean, intellectual, white space).
> **Chosen style**: **Clean Gamified** — white base, generous space, one bold accent per element, no glass, no glow.

---

## 1. The Problem (Audit)

| Issue | Where |
|---|---|
| `from-blue-500 via-purple-500 to-pink-500` gradient border + glow shadow | [Profile.jsx](file:///d:/calculus/frontend/src/pages/Profile.jsx) header |
| `bg-gradient-to-br from-emerald-50 via-white to-indigo-50` tinted cards | [Home.jsx](file:///d:/calculus/frontend/src/pages/Home.jsx) sidebar |
| `border-2 border-cyan-300/40 bg-gradient-to-r from-cyan-100 via-sky-100` | [Home.jsx](file:///d:/calculus/frontend/src/pages/Home.jsx) daily goal |
| `bg-stone-50`, `text-stone-500/700/900` neutral palette | [Step.jsx](file:///d:/calculus/frontend/src/pages/Step.jsx) (entirely different feel) |
| `bg-[#F8F8F8]`, inline hex colors, `style={{ fontFamily: ... }}` | [Explore.jsx](file:///d:/calculus/frontend/src/pages/Explore.jsx) |
| Hard-coded `shadow-xl`, `shadow-2xl`, `shadow-purple-500/25` mixed with `shadow-sm` | Everywhere |
| `backdrop-blur` glassmorphism in leaderboard modal | [Home.jsx](file:///d:/calculus/frontend/src/pages/Home.jsx) |
| `bg-amber-50` explanation modal vs `bg-white` other modals | [Step.jsx](file:///d:/calculus/frontend/src/pages/Step.jsx) |

**Root cause**: Each section was styled independently, picking from Tailwind's full palette without a defined vocabulary.

---

## 2. Design Tokens (Source of Truth)

Map these to your `tailwind.config.js` `theme.extend` or just treat as a use-only vocabulary.

### 2.1 Color Palette

**One primary. One semantic set. Everything else is neutral.**

| Token | Tailwind class | Hex | Usage |
|---|---|---|---|
| `primary` | `blue-500` | `#3B82F6` | CTAs, progress bars, active tabs |
| `primary-hover` | `blue-600` | `#2563EB` | Button hover |
| `primary-subtle` | `blue-50` | `#EFF6FF` | Icon backgrounds, pill badges |
| `success` | `emerald-500` | `#10B981` | Correct answer, streak, completion |
| `success-subtle` | `emerald-50` | — | Success feedback, XP gain |
| `danger` | `red-500` | `#EF4444` | Hearts, errors, destructive actions |
| `warning` | `amber-500` | `#F59E0B` | XP boost, fire streak (7+ days) |
| `neutral-0` | `white` | `#FFFFFF` | Card backgrounds, page background |
| `neutral-50` | `slate-50` | `#F8FAFC` | Tray backgrounds (Explore), input bg |
| `neutral-100` | `slate-100` | `#F1F5F9` | Dividers, skeleton, disabled bg |
| `neutral-300` | `slate-300` | `#CBD5E1` | Borders (inactive), progress track |
| `neutral-500` | `slate-500` | `#64748B` | Secondary text, icon default |
| `neutral-900` | `slate-900` | `#0F172A` | Primary text, headings |

> **Rule**: Never use a raw gradient like `from-blue-500 via-purple-500 to-pink-500` for anything functional. Gradients are only allowed on decorative illustration elements (e.g. avatar frame ring — 1 place).

### 2.2 Typography

Font: **Nunito** (already loaded). No Bebas Neue in the app UI (it's a display/landing font only).

| Role | Class | Weight |
|---|---|---|
| Page title (h1) | `text-2xl` | `font-bold` (700) |
| Section heading (h2) | `text-lg` | `font-bold` (700) |
| Card title | `text-base` | `font-semibold` (600) |
| Body text | `text-sm` | `font-normal` (400), `leading-relaxed` |
| Caption / label | `text-xs` | `font-medium` (500), `text-slate-500` |
| Stat number | `text-xl` or `text-2xl` | `font-extrabold` (800) |

> **Rule**: Never use raw pixel/hex font sizes like `text-[22px]` or `style={{ fontFamily: ... }}`. Tailwind's scale only.

---

## 3. Elevation System (Replace the Mix of Shadows)

Only 3 levels. Pick by importance, not aesthetics.

| Level | Class | Use case |
|---|---|---|
| **Flat** | `border border-slate-100` | Default cards, list items, inputs |
| **Raised** | `border border-slate-100 shadow-sm` | Interactive cards on hover, stat widgets |
| **Floating** | `border border-slate-200 shadow-lg` | Modals, dropdowns, toast notifications |

> **Rule**: Never use `shadow-xl`, `shadow-2xl`, or colored shadows like `shadow-purple-500/25` in production UI. Color shadows are decoration, not elevation.

---

## 4. Component Patterns

### 4.1 Cards

**All cards share the same shell:**
```jsx
// Default card
<div className="bg-white border border-slate-100 rounded-2xl p-4">

// Interactive card (course, explore)
<div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm
                hover:border-blue-300 hover:shadow-md transition-all duration-200 cursor-pointer">

// Gamification stat card (streak, XP, hearts)
<div className="bg-white border border-slate-100 rounded-2xl p-4">
  <div className="w-10 h-10 bg-{color}-50 rounded-xl flex items-center justify-center">
    <Icon className="w-5 h-5 text-{color}-500" />
  </div>
  ...
</div>
```

> **Forbidden**: `bg-gradient-to-br from-emerald-50 via-white to-indigo-50` as card background.
> **Allowed**: A single-color subtle tint (`bg-emerald-50`) only for the icon container inside the card, not the whole card.

### 4.2 Buttons

```jsx
// Primary CTA
<button className="h-12 px-8 bg-blue-500 hover:bg-blue-600 text-white
                   font-bold rounded-2xl transition-colors">

// Secondary
<button className="h-12 px-8 bg-white border-2 border-slate-200 hover:border-slate-300
                   text-slate-700 font-bold rounded-2xl transition-colors">

// Success (answer correct, complete lesson)
<button className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600 text-white
                   font-bold rounded-2xl transition-colors">

// Danger
<button className="h-12 px-8 bg-red-500 hover:bg-red-600 text-white
                   font-bold rounded-2xl transition-colors">

// Ghost (icon button)
<button className="p-2 rounded-xl text-slate-400 hover:text-slate-700
                   hover:bg-slate-100 transition-colors">
```

> **Rule**: Never use gradient backgrounds on buttons. One solid color only.

### 4.3 Badges / Pills

```jsx
// Status badge (level, in-progress)
<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-blue-500 text-white">

// Subtle badge (secondary info)
<span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">

// Success badge
<span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">
```

### 4.4 Modals / Overlays

All modals follow the same shell — no variations per page:

```jsx
{/* Backdrop */}
<div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">

  {/* Modal */}
  <div className="bg-white w-full max-w-md rounded-3xl shadow-lg overflow-hidden">
    
    {/* Header: always white, border-bottom */}
    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
      <h2 className="text-lg font-bold text-slate-900">Title</h2>
      <button className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
        <XIcon className="w-5 h-5" />
      </button>
    </div>

    {/* Body */}
    <div className="px-6 py-5">...</div>

    {/* Footer (optional) */}
    <div className="px-6 py-4 border-t border-slate-100 flex gap-3">...</div>
  </div>
</div>
```

> **Forbidden**: `backdrop-blur` on overlays. Use `bg-black/40` only.
> **Forbidden**: Amber/color-tinted modal headers (e.g., `bg-amber-50` in Step.jsx explanation modal). Keep it white.

### 4.5 Progress Bars

```jsx
{/* Track */}
<div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
  {/* Fill — always blue-500 unless semantic (emerald for success) */}
  <div className="h-full bg-blue-500 rounded-full transition-all duration-300"
       style={{ width: `${value}%` }} />
</div>
```

> **Rule**: Never use gradient fills on progress bars. One solid semantic color.

---

## 5. Motion Rules

Using Framer Motion — keep it subtle and consistent.

| Transition | Value | Use case |
|---|---|---|
| Page/slide change | `opacity 0→1, y 24→0, duration 0.25, easeInOut` | Slide content |
| Card hover | `scale 1→1.02, duration 0.15` | Interactive cards |
| Button press | `scale 1→0.97, duration 0.1` | Any button |
| Modal entrance | `scale 0.95→1, opacity 0→1, duration 0.2, easeOut` | Modal |
| Footer state change | `background-color, duration 0.3` | Step.jsx footer |

> **Rule**: No `animate-pulse` on icons (e.g. `Calendar animate-spin-slow`). Only use on skeleton loaders.
> **Rule**: No `animate-spin-slow` — it doesn't exist in base Tailwind and was added ad hoc.

---

## 6. Per-Page Context Rules

### Home.jsx (Dashboard)
- Background: `bg-white`
- All sidebar cards: flat shell (`border border-slate-100`), white bg
- Streak/Hearts use semantic colors in their icon containers only
- Leaderboard modal: follow modal pattern above, no blur backdrop

### Step.jsx (Lesson)
- Background: `bg-white` (not `bg-stone-50`)
- `text-stone-*` → replace with `text-slate-*`
- Footer correct: `bg-emerald-500`; incorrect: `bg-red-400` (not `bg-stone-400`)
- Explanation modal: white header (not `bg-amber-50`), follow modal pattern
- Math block: `bg-slate-50 border border-slate-100` (already correct)
- Code block: `bg-[#1e1e2e]` is acceptable for code, it's a semantic dark context

### Explore.jsx (Browse Courses)
- Already closest to Duolingo — keep structure
- Tray: `bg-slate-50` (map from `bg-[#F8F8F8]`)
- Course card: keep the bottom-border shadow `shadow-[0_4px_0_0_#E5E5E5]` — it's a deliberate Duolingo-style "3D press" effect, allowed here
- Remove `style={{ fontFamily: ... }}` — font is already set globally

### Profile.jsx (User Profile)
- Header card: remove `from-blue-500 via-purple-500 to-pink-500` gradient border
  → Replace with flat: `border border-slate-200 rounded-3xl`
- Avatar initial: `text-blue-500` (no gradient clip-text)
- Level badge: `bg-amber-500 text-white` (solid, no gradient)
- XP progress bar: `bg-blue-500` fill (no gradient)
- Stat cards: already close — just remove hover shadow escalation

---

## 7. Things Never To Do

| Forbidden pattern | Why |
|---|---|
| `from-X via-Y to-Z` gradient on cards/buttons/headers | Creates visual noise, inconsistent |
| `backdrop-blur` on overlays | Glassmorphism is not part of this system |
| `shadow-purple-*`, `shadow-colored-*` | Colored shadows leak brand identity |
| `bg-stone-*` pages (except code blocks) | Stone and Slate coexist and clash |
| `text-[11px]`, `px-[22px]` arbitrary values | Use Tailwind scale: `text-xs`, `px-6` etc. |
| `style={{ fontFamily: ... }}` inline | Font is set globally in [index.css](file:///d:/calculus/frontend/src/index.css) |
| `animate-spin-slow`, `animate-pulse` on icons | Reserve pulse for skeleton only |
| Multi-stop gradients as functional color | Only allowed on avatars/illustrations |

---

## 8. Quick Reference Card

```
Background .............. bg-white
Text (primary) .......... text-slate-900
Text (secondary) ........ text-slate-500
Borders ................. border-slate-100 (default), border-slate-200 (interactive)
Primary action .......... bg-blue-500 → hover:bg-blue-600
Success ................. bg-emerald-500
Danger / Hearts ......... bg-red-500
XP / Streak fire ........ bg-amber-500
Radius (cards) .......... rounded-2xl
Radius (buttons) ........ rounded-2xl
Radius (modals) ......... rounded-3xl
Radius (badges) ......... rounded-full
Elevation 0 ............. border border-slate-100 (no shadow)
Elevation 1 ............. border border-slate-100 shadow-sm
Elevation 2 ............. border border-slate-200 shadow-lg (modals only)
```
